import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Events ingest (e2e)', () => {
  let app: INestApplication;
  const oldRateLimitMax = process.env.INGEST_RATE_LIMIT_MAX;
  const oldRateLimitWindow = process.env.INGEST_RATE_LIMIT_WINDOW_MS;

  const tx = {
    errorGroup: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    event: { create: jest.fn() },
  };

  const prismaMock = {
    apiKey: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.INGEST_RATE_LIMIT_MAX = '2';
    process.env.INGEST_RATE_LIMIT_WINDOW_MS = '60000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    process.env.INGEST_RATE_LIMIT_MAX = oldRateLimitMax;
    process.env.INGEST_RATE_LIMIT_WINDOW_MS = oldRateLimitWindow;
  });

  it('returns 400 when message is missing', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .set('x-api-key', 'set_valid_key')
      .send({ source: 'frontend' })
      .expect(400);
  });

  it('returns 400 when timestamp is invalid', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .set('x-api-key', 'set_valid_key')
      .send({
        source: 'frontend',
        message: 'Invalid timestamp test',
        timestamp: 'not-an-iso-date',
      })
      .expect(400);
  });

  it('returns 400 when level is invalid', async () => {
    await request(app.getHttpServer())
      .post('/events')
      .set('x-api-key', 'set_valid_key')
      .send({
        source: 'frontend',
        message: 'Invalid level test',
        level: 'fatal',
      })
      .expect(400);
  });

  it('returns 201 and groupId for a valid payload', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.findUnique.mockResolvedValue(null);
    tx.errorGroup.create.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const response = await request(app.getHttpServer())
      .post('/events')
      .set('x-api-key', 'set_valid_key')
      .send({
        source: 'backend-service',
        message: 'Valid ingest event',
        level: 'error',
        timestamp: '2026-03-02T00:00:00.000Z',
        context: { route: '/checkout' },
        environment: 'dev',
      })
      .expect(201);

    expect(response.body).toEqual({ ok: true, groupId: 'group_1' });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when ingest rate limit is exceeded', async () => {
    prismaMock.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.findUnique.mockResolvedValue(null);
    tx.errorGroup.create.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const payload = {
      source: 'backend-service',
      message: 'Rate limit test event',
      level: 'error',
    };

    await request(app.getHttpServer())
      .post('/events')
      .set('x-api-key', 'set_valid_key')
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/events')
      .set('x-api-key', 'set_valid_key')
      .send(payload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/events')
      .set('x-api-key', 'set_valid_key')
      .send(payload)
      .expect(429);

    expect(response.body).toEqual({
      error: 'rate_limited',
      message: 'Too many ingest requests. Try again later.',
    });
  });
});
