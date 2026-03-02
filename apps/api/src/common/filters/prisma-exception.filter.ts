import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';

const DB_UNAVAILABLE_CODES = new Set(['ECONNREFUSED', 'P1001', 'P1002']);

function isDbUnavailableError(exception: unknown): boolean {
  if (!exception || typeof exception !== 'object') return false;

  const errorLike = exception as { code?: unknown; message?: unknown };
  const code = typeof errorLike.code === 'string' ? errorLike.code : '';
  const message =
    typeof errorLike.message === 'string' ? errorLike.message : '';

  if (DB_UNAVAILABLE_CODES.has(code)) return true;

  const normalized = message.toLowerCase();
  return (
    normalized.includes('econnrefused') ||
    normalized.includes("can't reach database server") ||
    normalized.includes('database is unavailable')
  );
}

@Catch()
export class PrismaExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  constructor(adapterHost: HttpAdapterHost) {
    super(adapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    if (!isDbUnavailableError(exception)) {
      return super.catch(exception, host);
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    this.logger.error(
      `Database unavailable: ${request?.method ?? 'UNKNOWN'} ${request?.url ?? ''}`,
    );

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      error: 'db_unavailable',
      message: 'Database is temporarily unavailable. Try again shortly.',
    });
  }
}
