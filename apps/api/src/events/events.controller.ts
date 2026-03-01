import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

type ErrorEventIn = {
  source: 'frontend' | 'backend';
  message: string;
  stack?: string;
  context?: any;
  timestamp?: string;
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
    .slice(0, 200);
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
  constructor(private readonly prisma: PrismaService) {}

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
        count: 1,
        firstSeen: ts,
        lastSeen: ts,
        sample: body as any,
      },
      update: {
        count: { increment: 1 },
        lastSeen: ts,
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
    @Query('limit') limit?: string,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { error: 'invalid_or_missing_api_key' };

    const n = Math.min(Number(limit ?? 50) || 50, 200);
    return this.prisma.errorGroup.findMany({
      where: { projectId },
      take: n,
      orderBy: [{ count: 'desc' }, { lastSeen: 'desc' }],
    });
  }

  @Get('groups/detail')
  async groupDetail(
    @Headers('x-api-key') apiKey: string | undefined,
    @Query('id') id: string,
  ) {
    const projectId = await this.resolveProjectIdFromApiKey(apiKey);
    if (!projectId) return { error: 'invalid_or_missing_api_key' };
    if (!id) return { error: 'missing_id' };

    const group = await this.prisma.errorGroup.findFirst({
      where: { id, projectId },
    });
    if (!group) return { error: 'group_not_found' };

    const events = await this.prisma.event.findMany({
      where: { groupId: id, projectId },
      take: 50,
      orderBy: { timestamp: 'desc' },
    });

    return { group, events };
  }
}
