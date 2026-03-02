import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { IngestEventDto } from './dto/ingest-event.dto';

function sha256(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function normalizeMessage(msg: string) {
  return (msg ?? '')
    .replace(/\b[0-9]+\b/g, '<n>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')
    .replace(/\b[0-9a-f-]{32,}\b/gi, '<id>')
    .trim()
    .slice(0, 120);
}

function topFrame(stack?: string) {
  if (!stack) return '';
  return (stack.split('\n')[0] ?? '').trim().slice(0, 200);
}

function makeFingerprint(ev: IngestEventDto) {
  const msg = normalizeMessage(ev.message);
  const frame = topFrame(ev.stack);
  const routeValue = ev.context?.route;
  const route =
    typeof routeValue === 'string' || typeof routeValue === 'number'
      ? String(routeValue)
      : '';
  return `${ev.source}|${route}|${msg}|${frame}`;
}

@Controller()
export class EventsController {
  constructor(private readonly prisma: PrismaService) { }

  private async resolveProjectIdFromApiKey(apiKey: string | undefined) {
    if (!apiKey) return null;

    const keyHash = sha256(apiKey);
    const row = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: { projectId: true, revokedAt: true },
    });

    if (!row || row.revokedAt) return null;
    return row.projectId;
  }

  @Post('events')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )
  async ingest(
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() body: IngestEventDto,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { error: 'invalid_or_missing_api_key' };

    const ts = body.timestamp ? new Date(body.timestamp) : new Date();
    const fp = makeFingerprint(body);

    const groupId = await this.prisma.$transaction(async (tx) => {
      const group = await tx.errorGroup.upsert({
        where: {
          projectId_fingerprint: { projectId, fingerprint: fp },
        },
        create: {
          projectId,
          fingerprint: fp,
          title: normalizeMessage(body.message) || 'Unknown error',
          eventCount: 1,
          firstSeenAt: ts,
          lastSeenAt: ts,
          sample: { ...body } as any,
        },
        update: {
          eventCount: { increment: 1 },
          lastSeenAt: ts,
        },
      });

      await tx.event.create({
        data: {
          projectId,
          groupId: group.id,
          source: body.source,
          message: body.message,
          stack: body.stack,
          context: (body.context as any) ?? undefined,
          environment: body.environment,
          releaseVersion: body.releaseVersion,
          level: body.level,
          timestamp: ts,
        },
      });

      return group.id;
    });

    return { ok: true, groupId };
  }

  @Get('events')
  async listEvents(
    @Headers('x-api-key') apiKey: string | undefined,
    @Query('limit') limit?: string,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { error: 'invalid_or_missing_api_key' };

    const n = Math.min(Number(limit ?? 50) || 50, 200);
    return this.prisma.event.findMany({
      where: { projectId },
      take: n,
      orderBy: { timestamp: 'desc' },
    });
  }

  @Get('stats')
  async getStats(@Headers('x-api-key') apiKey: string | undefined) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { ok: false, error: 'unauthorized' };

    // 1) Group counts by status
    const [totalGroups, openCount, resolvedCount, ignoredCount, eventAgg] =
      await Promise.all([
        this.prisma.errorGroup.count({ where: { projectId } }),
        this.prisma.errorGroup.count({ where: { projectId, status: 'open' } }),
        this.prisma.errorGroup.count({
          where: { projectId, status: 'resolved' },
        }),
        this.prisma.errorGroup.count({
          where: { projectId, status: 'ignored' },
        }),
        this.prisma.errorGroup.aggregate({
          where: { projectId },
          _sum: { eventCount: true }
        }),
      ]);

    const totalEvents = eventAgg._sum.eventCount || 0;

    // 2) Daily event trend (last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const events7d = await this.prisma.event.findMany({
      where: { projectId, timestamp: { gte: sevenDaysAgo } },
      select: { timestamp: true },
      orderBy: { timestamp: 'asc' },
    });

    // Bucket by date string
    const dailyMap: Record<string, number> = {};
    for (let d = 0; d < 7; d++) {
      const dt = new Date(sevenDaysAgo);
      dt.setDate(dt.getDate() + d);
      dailyMap[dt.toISOString().slice(0, 10)] = 0;
    }
    // also include today
    dailyMap[now.toISOString().slice(0, 10)] = 0;

    for (const ev of events7d) {
      const key = new Date(ev.timestamp).toISOString().slice(0, 10);
      if (key in dailyMap) dailyMap[key]++;
    }

    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // 3) Top 5 issues by event count
    const topIssues = await this.prisma.errorGroup.findMany({
      where: { projectId },
      take: 5,
      orderBy: { eventCount: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        eventCount: true,
        lastSeenAt: true,
      },
    });

    return {
      ok: true,
      counts: {
        totalGroups,
        open: openCount,
        resolved: resolvedCount,
        ignored: ignoredCount,
        totalEvents,
      },
      dailyTrend,
      topIssues,
    };
  }

  @Get('groups')
  async listGroups(
    @Headers('x-api-key') apiKey: string | undefined,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { ok: false, error: 'unauthorized' };

    const whereClause: any = { projectId };
    if (status) {
      whereClause.status = status;
    }
    if (q) {
      whereClause.title = { contains: q, mode: 'insensitive' };
    }

    const take = Math.min(Number(limit ?? 50) || 50, 100);
    const skip = Math.max(Number(offset ?? 0) || 0, 0);

    const groups = await this.prisma.errorGroup.findMany({
      where: whereClause,
      take: take + 1, // fetch one extra to detect hasMore
      skip,
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        fingerprint: true,
        title: true,
        status: true,
        eventCount: true,
        firstSeenAt: true,
        lastSeenAt: true,
      },
    });

    const hasMore = groups.length > take;
    const items = hasMore ? groups.slice(0, take) : groups;

    return {
      ok: true,
      groups: items,
      page: { limit: take, offset: skip, hasMore },
    };
  }

  @Get('groups/:id')
  async groupDetail(
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('id') id: string,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { ok: false, error: 'unauthorized' };
    if (!id) return { ok: false, error: 'invalid' };

    const group = await this.prisma.errorGroup.findFirst({
      where: { id, projectId },
      select: {
        id: true,
        fingerprint: true,
        title: true,
        status: true,
        eventCount: true,
        firstSeenAt: true,
        lastSeenAt: true,
        aiAnalysis: true,
      },
    });
    if (!group) return { ok: false, error: 'not_found' };

    const events = await this.prisma.event.findMany({
      where: { groupId: id, projectId },
      take: 20,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        message: true,
        stack: true,
        context: true,
        environment: true,
        releaseVersion: true,
        level: true,
        timestamp: true,
      },
    });

    return {
      ok: true,
      group,
      events: events.map((e) => ({
        id: e.id,
        message: e.message,
        stack: e.stack,
        context: e.context,
        environment: e.environment,
        releaseVersion: e.releaseVersion,
        level: e.level,
        createdAt: e.timestamp,
      })),
    };
  }

  @Post('events/:id/analyze')
  async analyzeEvent(
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('id') eventId: string,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { ok: false, error: 'unauthorized' };

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, projectId },
      include: { group: true },
    });
    if (!event) return { ok: false, error: 'not_found' };

    // If already analyzed, return cached result
    if (event.group.aiAnalysis) {
      return { ok: true, aiAnalysis: event.group.aiAnalysis };
    }

    const aiKey = process.env.GEMINI_API_KEY;
    if (!aiKey) {
      return { ok: false, error: 'ai_not_configured' };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: aiKey });

      const prompt = `You are an expert software engineer and debugger.
Analyze this error event and provide a strictly formatted JSON response.

Context:
- Message: ${event.message}
- Environment: ${event.environment || 'unknown'}
- Release: ${event.releaseVersion || 'unknown'}
- Route/Context: ${JSON.stringify(event.context || {})}

Stack Trace:
${event.stack || 'No stack trace provided.'}

Provide your response in this EXACT JSON format (no markdown code blocks, just raw JSON):
{
  "rootCause": "A concise explanation of why this error occurred (max 2 sentences)",
  "suggestedFix": "A short, actionable fix or code snippet to resolve the issue",
  "severity": "high" | "medium" | "low"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '{}';
      // Clean up markdown ticks if AI mistakenly added them
      const cleanJson = text
        .replace(/^```json/i, '')
        .replace(/```$/i, '')
        .trim();
      const aiAnalysis = JSON.parse(cleanJson);

      await this.prisma.errorGroup.update({
        where: { id: event.groupId },
        data: { aiAnalysis },
      });

      return { ok: true, aiAnalysis };
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      return { ok: false, error: 'ai_analysis_failed' };
    }
  }

  @Post('groups/:id/resolve')
  async resolveGroup(
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('id') id: string,
  ) {
    return this.updateGroupStatus(apiKey, id, 'resolved');
  }

  @Post('groups/:id/open')
  async openGroup(
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('id') id: string,
  ) {
    return this.updateGroupStatus(apiKey, id, 'open');
  }

  @Post('groups/:id/ignore')
  async ignoreGroup(
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('id') id: string,
  ) {
    return this.updateGroupStatus(apiKey, id, 'ignored');
  }

  private async updateGroupStatus(
    apiKey: string | undefined,
    id: string,
    status: string,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { ok: false, error: 'unauthorized' };

    const group = await this.prisma.errorGroup.findFirst({
      where: { id, projectId },
    });
    if (!group) return { ok: false, error: 'not_found' };

    if (group.status === status) {
      return {
        ok: true,
        group: {
          id: group.id,
          status: group.status,
          lastSeenAt: group.lastSeenAt,
          eventCount: group.eventCount,
        },
      };
    }

    const updated = await this.prisma.errorGroup.update({
      where: { id },
      data: { status },
    });

    return {
      ok: true,
      group: {
        id: updated.id,
        status: updated.status,
        lastSeenAt: updated.lastSeenAt,
        eventCount: updated.eventCount,
      },
    };
  }
}
