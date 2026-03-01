import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ErrorEventIn = {
  source: 'frontend' | 'backend';
  message: string;
  stack?: string;
  context?: any;
  timestamp?: string;
};

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

  @Post('events')
  async ingest(@Body() body: ErrorEventIn) {
    const ts = body.timestamp ? new Date(body.timestamp) : new Date();
    const fp = makeFingerprint(body);

    const group = await this.prisma.errorGroup.upsert({
      where: { fingerprint: fp },
      create: {
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

    await this.prisma.event.create({
      data: {
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
  async listEvents(@Query('limit') limit?: string) {
    const n = Math.min(Number(limit ?? 50) || 50, 200);
    return this.prisma.event.findMany({
      take: n,
      orderBy: { timestamp: 'desc' },
    });
  }

  @Get('groups')
  async listGroups(@Query('limit') limit?: string) {
    const n = Math.min(Number(limit ?? 50) || 50, 200);
    return this.prisma.errorGroup.findMany({
      take: n,
      orderBy: [{ count: 'desc' }, { lastSeen: 'desc' }],
    });
  }

  // eski /groups/detail yerine daha düzgün endpoint:
  @Get('groups/detail')
  async groupDetail(@Query('id') id: string) {
    if (!id) return { error: 'missing_id' };

    const group = await this.prisma.errorGroup.findUnique({
      where: { id },
    });
    if (!group) return { error: 'group_not_found' };

    const events = await this.prisma.event.findMany({
      where: { groupId: id },
      take: 50,
      orderBy: { timestamp: 'desc' },
    });

    return { group, events };
  }
}