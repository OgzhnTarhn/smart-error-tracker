import { HttpStatus } from '@nestjs/common';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status } as any;
  const request = { method: 'GET', url: '/stats' } as any;

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as any;

  return { host, status, json };
}

describe('PrismaExceptionFilter', () => {
  it('returns 503 for ECONNREFUSED errors', () => {
    const filter = new PrismaExceptionFilter({ httpAdapter: {} } as any);
    const { host, status, json } = createHost();

    filter.catch(
      { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:5432' },
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith({
      error: 'db_unavailable',
      message: 'Database is temporarily unavailable. Try again shortly.',
    });
  });

  it('returns 503 for P1001 database unreachable errors', () => {
    const filter = new PrismaExceptionFilter({ httpAdapter: {} } as any);
    const { host, status, json } = createHost();

    filter.catch(
      { code: 'P1001', message: "Can't reach database server" },
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith({
      error: 'db_unavailable',
      message: 'Database is temporarily unavailable. Try again shortly.',
    });
  });
});
