import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const DEFAULT_MAX_REQUESTS = 60;
const DEFAULT_WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 10_000;

function parsePositiveInt(input: string | undefined, fallback: number) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

@Injectable()
export class IngestRateLimitGuard implements CanActivate {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly maxRequests = parsePositiveInt(
    process.env.INGEST_RATE_LIMIT_MAX,
    DEFAULT_MAX_REQUESTS,
  );
  private readonly windowMs = parsePositiveInt(
    process.env.INGEST_RATE_LIMIT_WINDOW_MS,
    DEFAULT_WINDOW_MS,
  );

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = this.buildKey(req);
    const now = Date.now();

    this.pruneExpired(now);

    const current = this.entries.get(key);
    if (!current || now >= current.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      this.ensureCapacity();
      return true;
    }

    if (current.count >= this.maxRequests) {
      throw new HttpException({
        error: 'rate_limited',
        message: 'Too many ingest requests. Try again later.',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
    this.entries.set(key, current);
    this.ensureCapacity();
    return true;
  }

  private buildKey(req: Request): string {
    const rawApiKey = req.headers['x-api-key'];
    const apiKey =
      typeof rawApiKey === 'string'
        ? rawApiKey.trim()
        : Array.isArray(rawApiKey)
          ? (rawApiKey[0] ?? '').trim()
          : '';

    if (apiKey) return `apiKey:${apiKey}`;

    const forwardedFor = req.headers['x-forwarded-for'];
    const ipFromForwarded =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : Array.isArray(forwardedFor)
          ? forwardedFor[0]?.split(',')[0]?.trim()
          : undefined;

    const ip =
      ipFromForwarded || req.ip || req.socket?.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  private pruneExpired(now: number) {
    for (const [key, value] of this.entries.entries()) {
      if (now >= value.resetAt) {
        this.entries.delete(key);
      }
    }
  }

  private ensureCapacity() {
    while (this.entries.size > MAX_TRACKED_KEYS) {
      const firstKey = this.entries.keys().next().value;
      if (!firstKey) break;
      this.entries.delete(firstKey);
    }
  }
}
