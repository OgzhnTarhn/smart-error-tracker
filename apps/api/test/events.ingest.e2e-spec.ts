import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Events ingest (e2e)', () => {
  let app: INestApplication;

  const tx = {
    errorGroup: { upsert: jest.fn() },
    event: { create: jest.fn() },
  };

  const prismaMock = {
    apiKey: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

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
    tx.errorGroup.upsert.mockResolvedValue({ id: 'group_1' });
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
});
