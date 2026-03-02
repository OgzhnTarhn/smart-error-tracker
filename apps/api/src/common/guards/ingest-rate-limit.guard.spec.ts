import { HttpException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { IngestRateLimitGuard } from './ingest-rate-limit.guard';

function makeContext(headers: Record<string, string> = {}, ip = '127.0.0.1') {
  const req: any = {
    headers,
    ip,
    socket: { remoteAddress: ip },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as ExecutionContext;
}

describe('IngestRateLimitGuard', () => {
  const oldMax = process.env.INGEST_RATE_LIMIT_MAX;
  const oldWindow = process.env.INGEST_RATE_LIMIT_WINDOW_MS;

  beforeEach(() => {
    process.env.INGEST_RATE_LIMIT_MAX = '2';
    process.env.INGEST_RATE_LIMIT_WINDOW_MS = '60000';
  });

  afterEach(() => {
    process.env.INGEST_RATE_LIMIT_MAX = oldMax;
    process.env.INGEST_RATE_LIMIT_WINDOW_MS = oldWindow;
  });

  it('limits requests per api key', () => {
    const guard = new IngestRateLimitGuard();
    const ctx = makeContext({ 'x-api-key': 'set_key_a' });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });

  it('uses ip fallback when x-api-key is missing', () => {
    const guard = new IngestRateLimitGuard();
    const ctx = makeContext({}, '10.0.0.10');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });

  it('tracks separate counters for different keys', () => {
    const guard = new IngestRateLimitGuard();
    const keyA = makeContext({ 'x-api-key': 'set_key_a' });
    const keyB = makeContext({ 'x-api-key': 'set_key_b' });

    expect(guard.canActivate(keyA)).toBe(true);
    expect(guard.canActivate(keyB)).toBe(true);
    expect(guard.canActivate(keyA)).toBe(true);
    expect(guard.canActivate(keyB)).toBe(true);
    expect(() => guard.canActivate(keyA)).toThrow(HttpException);
    expect(() => guard.canActivate(keyB)).toThrow(HttpException);
  });
});
