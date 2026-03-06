import { EventsController } from './events.controller';
import { IngestEventDto } from './dto/ingest-event.dto';

describe('EventsController', () => {
  const tx = {
    errorGroup: { upsert: jest.fn() },
    event: { create: jest.fn() },
  };

  const prisma = {
    apiKey: { findUnique: jest.fn() },
    errorGroup: { findMany: jest.fn(), findFirst: jest.fn() },
    event: { findMany: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const sourceMaps = {
    resolveTopFrame: jest.fn(),
  } as any;

  let controller: EventsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EventsController(prisma, sourceMaps);
  });

  it('uses a transaction and writes both group and event for ingest', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.upsert.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const body: IngestEventDto = {
      source: 'backend-service',
      message: 'Boom failure',
      context: { route: '/checkout' },
      level: 'error',
    };

    const result = await controller.ingest('set_valid_key', body);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.errorGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_fingerprint: {
            projectId: 'proj_1',
            fingerprint: expect.any(String),
          },
        },
        create: expect.objectContaining({
          projectId: 'proj_1',
          title: 'Boom failure',
          eventCount: 1,
        }),
      }),
    );
    expect(tx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj_1',
          groupId: 'group_1',
          source: 'backend-service',
          message: 'Boom failure',
          level: 'error',
        }),
      }),
    );
    expect(result).toEqual({ ok: true, groupId: 'group_1' });
  });

  it('returns invalid_or_missing_api_key when key is invalid', async () => {
    prisma.apiKey.findUnique.mockResolvedValue(null);

    const result = await controller.ingest('set_invalid_key', {
      source: 'frontend',
      message: 'Invalid key event',
    });

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ error: 'invalid_or_missing_api_key' });
  });

  it('merges sdk info into stored context during ingest', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.upsert.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await controller.ingest('set_valid_key', {
      source: 'browser',
      message: 'SDK check',
      context: { route: '/settings' },
      sdk: { name: '@smart-error-tracker/browser', version: '0.1.0' },
    });

    expect(tx.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          context: expect.objectContaining({
            route: '/settings',
            sdk: {
              name: '@smart-error-tracker/browser',
              version: '0.1.0',
            },
          }),
        }),
      }),
    );
  });

  it('applies listGroups filters and maps latest event metadata', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findMany.mockResolvedValue([
      {
        id: 'group_1',
        fingerprint: 'fp_1',
        title: 'TypeError: cannot read properties',
        status: 'open',
        eventCount: 3,
        firstSeenAt: new Date('2026-03-01T10:00:00.000Z'),
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        events: [
          {
            environment: 'dev',
            releaseVersion: '1.0.0',
            level: 'error',
          },
        ],
      },
    ]);

    const result = await controller.listGroups('set_valid_key', {
      status: 'open',
      search: 'typeerror',
      environment: 'dev',
      level: 'error',
      release: '1.0.0',
      limit: '20',
      offset: '0',
    });

    expect(prisma.errorGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'proj_1',
          status: 'open',
          events: {
            some: {
              environment: 'dev',
              level: 'error',
              releaseVersion: '1.0.0',
            },
          },
          OR: [
            { title: { contains: 'typeerror', mode: 'insensitive' } },
            {
              events: {
                some: {
                  message: { contains: 'typeerror', mode: 'insensitive' },
                },
              },
            },
          ],
        },
        take: 21,
        skip: 0,
      }),
    );
    expect(result).toEqual({
      ok: true,
      groups: [
        {
          id: 'group_1',
          fingerprint: 'fp_1',
          title: 'TypeError: cannot read properties',
          status: 'open',
          eventCount: 3,
          firstSeenAt: new Date('2026-03-01T10:00:00.000Z'),
          lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
          environment: 'dev',
          releaseVersion: '1.0.0',
          level: 'error',
        },
      ],
      page: { limit: 20, offset: 0, hasMore: false },
    });
  });

  it('returns distinct environment and release options for group filters', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.event.findMany
      .mockResolvedValueOnce([
        { environment: 'dev' },
        { environment: 'production' },
      ])
      .mockResolvedValueOnce([
        { releaseVersion: '0.0.0-demo' },
        { releaseVersion: '1.0.0' },
      ]);

    const result = await controller.listGroupFilters('set_valid_key');

    expect(prisma.event.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { projectId: 'proj_1', environment: { not: null } },
        distinct: ['environment'],
      }),
    );
    expect(prisma.event.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { projectId: 'proj_1', releaseVersion: { not: null } },
        distinct: ['releaseVersion'],
      }),
    );
    expect(result).toEqual({
      ok: true,
      environments: ['dev', 'production'],
      releases: ['0.0.0-demo', '1.0.0'],
    });
  });

  it('returns event-level fields in groupDetail response', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      fingerprint: 'fp_1',
      title: 'TypeError',
      status: 'open',
      eventCount: 2,
      firstSeenAt: new Date('2026-03-01T10:00:00.000Z'),
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      aiAnalysis: null,
    });
    prisma.event.findMany.mockResolvedValue([
      {
        id: 'event_1',
        source: 'browser',
        message: 'Cannot read x',
        stack: 'TypeError at app.ts:12',
        context: {
          route: '/checkout',
          sdk: { name: '@smart-error-tracker/browser', version: '0.1.0' },
          rawPayload: { custom: true },
        },
        environment: 'dev',
        releaseVersion: '1.0.0',
        level: 'error',
        timestamp: new Date('2026-03-02T10:00:00.000Z'),
      },
    ]);

    const result = await controller.groupDetail('set_valid_key', 'group_1');

    expect(result).toEqual({
      ok: true,
      group: expect.objectContaining({ id: 'group_1' }),
      events: [
        {
          id: 'event_1',
          source: 'browser',
          message: 'Cannot read x',
          stack: 'TypeError at app.ts:12',
          context: {
            route: '/checkout',
            sdk: { name: '@smart-error-tracker/browser', version: '0.1.0' },
            rawPayload: { custom: true },
          },
          environment: 'dev',
          releaseVersion: '1.0.0',
          level: 'error',
          sdk: {
            name: '@smart-error-tracker/browser',
            version: '0.1.0',
          },
          rawPayload: { custom: true },
          timestamp: new Date('2026-03-02T10:00:00.000Z'),
          createdAt: new Date('2026-03-02T10:00:00.000Z'),
        },
      ],
    });
  });
});
