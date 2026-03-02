import { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Database unavailable (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    apiKey: { findUnique: jest.fn() },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.apiKey.findUnique.mockRejectedValue({
      code: 'ECONNREFUSED',
      message: 'connect ECONNREFUSED 127.0.0.1:5432',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new PrismaExceptionFilter(httpAdapterHost));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 503 with db_unavailable when prisma cannot reach db', async () => {
    const response = await request(app.getHttpServer())
      .get('/groups')
      .set('x-api-key', 'set_valid_key')
      .expect(503);

    expect(response.body).toEqual({
      error: 'db_unavailable',
      message: 'Database is temporarily unavailable. Try again shortly.',
    });
  });
});
