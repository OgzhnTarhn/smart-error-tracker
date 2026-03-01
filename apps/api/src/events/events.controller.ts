import { Body, Controller, Get, Post, Query } from '@nestjs/common';

type ErrorEvent = {
  source: 'frontend' | 'backend';
  message: string;
  stack?: string;
  context?: any;
  timestamp?: string;
};

type ErrorGroup = {
  id: string;
  fingerprint: string;
  title: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  sample: ErrorEvent;
};

const events: ErrorEvent[] = [];
const groupsByFp = new Map<string, ErrorGroup>();

function normalizeMessage(msg: string) {
  return (msg ?? '')
    .replace(/\b[0-9]+\b/g, '<n>')                 // numbers
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')        // hex-ish ids
    .replace(/\b[0-9a-f-]{32,}\b/gi, '<id>')       // uuid-ish
    .trim()
    .slice(0, 200);
}

function topFrame(stack?: string) {
  if (!stack) return '';
  const line = stack.split('\n')[0] ?? '';
  return line.trim().slice(0, 200);
}

function makeFingerprint(ev: ErrorEvent) {
  const msg = normalizeMessage(ev.message);
  const frame = topFrame(ev.stack);
  const route = ev.context?.route ? String(ev.context.route) : '';
  return `${ev.source}|${route}|${msg}|${frame}`;
}

function nowIso() {
  return new Date().toISOString();
}

@Controller()
export class EventsController {
  @Post('events')
  ingest(@Body() body: ErrorEvent) {
    const ev: ErrorEvent = { ...body, timestamp: body.timestamp ?? nowIso() };

    // store events
    events.unshift(ev);
    if (events.length > 500) events.pop();

    // grouping
    const fp = makeFingerprint(ev);
    const existing = groupsByFp.get(fp);

    if (existing) {
      existing.count += 1;
      existing.lastSeen = ev.timestamp!;
    } else {
      const id = Math.random().toString(36).slice(2, 10);
      groupsByFp.set(fp, {
        id,
        fingerprint: fp,
        title: normalizeMessage(ev.message) || 'Unknown error',
        count: 1,
        firstSeen: ev.timestamp!,
        lastSeen: ev.timestamp!,
        sample: ev,
      });
    }

    return { ok: true };
  }

  @Get('events')
  listEvents() {
    return events.slice(0, 50);
  }

  // NEW: list groups
  @Get('groups')
  listGroups(@Query('limit') limit?: string) {
    const n = Math.min(Number(limit ?? 50) || 50, 200);
    return Array.from(groupsByFp.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }

  // NEW: group detail by id (simple)
  @Get('groups/detail')
  groupDetail(@Query('id') id: string) {
    for (const g of groupsByFp.values()) {
      if (g.id === id) return g;
    }
    return { error: 'group_not_found' };
  }
}