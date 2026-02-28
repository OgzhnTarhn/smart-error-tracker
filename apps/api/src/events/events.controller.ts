import { Body, Controller, Get, Post } from '@nestjs/common';

type ErrorEvent = {
  source: 'frontend' | 'backend';
  message: string;
  stack?: string;
  context?: any;
  timestamp?: string;
};

const store: ErrorEvent[] = [];

@Controller('events')
export class EventsController {
  @Post()
  ingest(@Body() body: ErrorEvent) {
    const event: ErrorEvent = {
      ...body,
      timestamp: body.timestamp ?? new Date().toISOString(),
    };
    store.unshift(event);
    if (store.length > 200) store.pop();

    return { ok: true, stored: store.length };
  }

  @Get()
  list() {
    return store.slice(0, 50);
  }
}