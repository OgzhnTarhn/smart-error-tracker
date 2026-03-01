import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

type ErrorEventIn = {
  source: 'frontend' | 'backend';
  message: string;
  stack?: string;
  context?: any;
  timestamp?: string;
  environment?: string;
  releaseVersion?: string;
  level?: string;
};

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

function makeFingerprint(ev: ErrorEventIn) {
  const msg = normalizeMessage(ev.message);
  const frame = topFrame(ev.stack);
  const route = ev.context?.route ? String(ev.context.route) : '';
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
  async ingest(
    @Headers('x-api-key') apiKey: string | undefined,
    @Body() body: ErrorEventIn,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { error: 'invalid_or_missing_api_key' };

    const ts = body.timestamp ? new Date(body.timestamp) : new Date();
    const fp = makeFingerprint(body);

    // group upsert using compound unique (projectId + fingerprint)
    const group = await this.prisma.errorGroup.upsert({
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
        sample: body as any,
      },
      update: {
        eventCount: { increment: 1 },
        lastSeenAt: ts,
      },
    });

    // event insert
    await this.prisma.event.create({
      data: {
        projectId,
        groupId: group.id,
        source: body.source,
        message: body.message,
        stack: body.stack,
        context: body.context ?? undefined,
        environment: body.environment,
        releaseVersion: body.releaseVersion,
        level: body.level,
        timestamp: ts,
      },
    });

    return { ok: true, groupId: group.id };
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
      }
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
      }
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
      }
    });

    return {
      ok: true,
      group,
      events: events.map(e => ({
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

  private async updateGroupStatus(apiKey: string | undefined, id: string, status: string) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { ok: false, error: 'unauthorized' };

    const group = await this.prisma.errorGroup.findFirst({
      where: { id, projectId },
    });
    if (!group) return { ok: false, error: 'not_found' };

    if (group.status === status) {
      return {
        ok: true,
        group: { id: group.id, status: group.status, lastSeenAt: group.lastSeenAt, eventCount: group.eventCount }
      };
    }

    const updated = await this.prisma.errorGroup.update({
      where: { id },
      data: { status },
    });

    return {
      ok: true,
      group: { id: updated.id, status: updated.status, lastSeenAt: updated.lastSeenAt, eventCount: updated.eventCount }
    };
  }
}
