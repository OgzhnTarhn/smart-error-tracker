import { DashboardStatsService } from './dashboard-stats.service';

describe('DashboardStatsService', () => {
  const prisma = {
    errorGroup: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    event: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  } as any;

  let service: DashboardStatsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardStatsService(prisma);
  });

  function mockCountQueries() {
    prisma.errorGroup.count.mockImplementation(
      ({ where }: { where?: { status?: string } & Record<string, unknown> }) => {
        switch (where?.status) {
          case 'open':
            return Promise.resolve(3);
          case 'resolved':
            return Promise.resolve(2);
          case 'ignored':
            return Promise.resolve(1);
          default:
            return Promise.resolve(6);
        }
      },
    );
    prisma.event.count.mockResolvedValue(14);
  }

  it('returns an exact zero-filled 7 day trend and compatibility aliases', async () => {
    mockCountQueries();
    prisma.event.findMany.mockImplementation(
      ({ select }: { select?: { timestamp?: boolean; source?: boolean } }) => {
        if (select?.timestamp) {
          return Promise.resolve([
            { timestamp: new Date('2026-03-01T08:00:00.000Z') },
            { timestamp: new Date('2026-03-03T12:00:00.000Z') },
            { timestamp: new Date('2026-03-03T15:00:00.000Z') },
            { timestamp: new Date('2026-03-07T01:00:00.000Z') },
          ]);
        }

        return Promise.resolve([]);
      },
    );
    prisma.event.groupBy.mockResolvedValue([]);
    prisma.errorGroup.findMany.mockResolvedValue([
      {
        id: 'group_1',
        title: 'TypeError: boom',
        status: 'open',
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        eventCount: 9,
        lastSeenAt: new Date('2026-03-07T11:00:00.000Z'),
      },
    ]);

    const result = await service.getStats(
      'proj_1',
      new Date('2026-03-07T12:00:00.000Z'),
    );

    expect(result.totals).toEqual({
      totalEvents: 14,
      totalIssues: 6,
      openIssues: 3,
      resolvedIssues: 2,
      ignoredIssues: 1,
    });
    expect(result.trend7d).toEqual([
      { date: '2026-03-01', count: 1 },
      { date: '2026-03-02', count: 0 },
      { date: '2026-03-03', count: 2 },
      { date: '2026-03-04', count: 0 },
      { date: '2026-03-05', count: 0 },
      { date: '2026-03-06', count: 0 },
      { date: '2026-03-07', count: 1 },
    ]);
    expect(result.counts).toEqual({
      totalGroups: 6,
      open: 3,
      resolved: 2,
      ignored: 1,
      totalEvents: 14,
    });
    expect(result.dailyTrend).toEqual(result.trend7d);
    expect(result.topIssues).toEqual([
      expect.objectContaining({
        id: 'group_1',
        title: 'TypeError: boom',
      }),
    ]);
  });

  it('supports a 30 day dashboard range', async () => {
    mockCountQueries();
    prisma.event.findMany.mockImplementation(
      ({ select }: { select?: { timestamp?: boolean; source?: boolean } }) => {
        if (select?.timestamp) {
          return Promise.resolve([
            { timestamp: new Date('2026-03-01T08:00:00.000Z') },
            { timestamp: new Date('2026-03-30T08:00:00.000Z') },
          ]);
        }
        return Promise.resolve([]);
      },
    );
    prisma.event.groupBy.mockResolvedValue([]);
    prisma.errorGroup.findMany.mockResolvedValue([]);

    const result = await service.getStats(
      'proj_1',
      new Date('2026-03-30T12:00:00.000Z'),
      30,
    );

    expect(result.trend7d).toHaveLength(30);
    expect(result.trend7d[0]).toEqual({ date: '2026-03-01', count: 1 });
    expect(result.trend7d[29]).toEqual({ date: '2026-03-30', count: 1 });
  });

  it('normalizes null and blank breakdown values to unknown', async () => {
    mockCountQueries();
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.groupBy.mockImplementation(
      ({ by }: { by: Array<'level' | 'environment' | 'releaseVersion'> }) => {
        const field = by[0];
        switch (field) {
          case 'level':
            return Promise.resolve([
              { level: null, _count: { _all: 2 } },
              { level: '', _count: { _all: 1 } },
              { level: 'error', _count: { _all: 5 } },
            ]);
          case 'environment':
            return Promise.resolve([
              { environment: 'production', _count: { _all: 4 } },
              { environment: ' ', _count: { _all: 2 } },
            ]);
          case 'releaseVersion':
            return Promise.resolve([
              { releaseVersion: null, _count: { _all: 3 } },
              { releaseVersion: '1.2.0', _count: { _all: 1 } },
              { releaseVersion: '', _count: { _all: 2 } },
            ]);
          default:
            return Promise.resolve([]);
        }
      },
    );
    prisma.errorGroup.findMany.mockResolvedValue([]);

    const result = await service.getStats('proj_1');

    expect(result.errorsByLevel).toEqual([
      { name: 'error', count: 5 },
      { name: 'unknown', count: 3 },
    ]);
    expect(result.errorsByEnvironment).toEqual([
      { name: 'production', count: 4 },
      { name: 'unknown', count: 2 },
    ]);
    expect(result.errorsByRelease).toEqual([
      { name: 'unknown', count: 5 },
      { name: '1.2.0', count: 1 },
    ]);
  });

  it('derives top routes with source-aware precedence, excludes info events, and limits results', async () => {
    mockCountQueries();
    prisma.event.findMany.mockImplementation(
      ({ select }: { select?: { timestamp?: boolean; source?: boolean } }) => {
        if (select?.timestamp) {
          return Promise.resolve([]);
        }

        return Promise.resolve([
          {
            source: 'frontend',
            level: 'error',
            context: {
              route: '/checkout',
              path: '/cart',
              url: 'https://example.com/checkout?step=1',
            },
          },
          {
            source: 'frontend',
            level: 'warn',
            context: {
              path: '/cart',
              url: 'https://example.com/cart?coupon=1',
            },
          },
          {
            source: 'backend',
            level: 'error',
            context: {
              endpoint: '/api/orders/:id',
              path: '/api/orders/42',
            },
          },
          {
            source: 'worker',
            level: null,
            context: {
              path: '/jobs/reconcile',
            },
          },
          {
            source: 'frontend',
            level: 'error',
            context: {
              url: 'https://example.com/settings/profile?tab=security#password',
            },
          },
          {
            source: 'backend',
            level: 'warn',
            context: {
              path: '/api/orders/42',
            },
          },
          {
            source: 'backend',
            level: 'error',
            context: {},
          },
          {
            source: 'backend',
            level: 'error',
            context: {
              endpoint: '/api/orders/:id',
            },
          },
          {
            source: 'frontend',
            level: 'error',
            context: {
              route: '/checkout',
            },
          },
          {
            source: 'backend',
            level: 'warn',
            context: {
              endpoint: '/api/payments',
            },
          },
          {
            source: 'backend',
            level: 'error',
            context: {
              endpoint: '/api/payments',
            },
          },
        ]);
      },
    );
    prisma.event.groupBy.mockResolvedValue([]);
    prisma.errorGroup.findMany.mockResolvedValue([]);

    const result = await service.getStats('proj_1');

    expect(prisma.event.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          projectId: 'proj_1',
          timestamp: expect.objectContaining({
            gte: expect.any(Date),
          }),
          NOT: { level: 'info' },
        },
      }),
    );
    expect(result.topRoutes).toEqual([
      { name: '/api/orders/:id', count: 2 },
      { name: '/api/payments', count: 2 },
      { name: '/checkout', count: 2 },
      { name: '/api/orders/42', count: 1 },
      { name: '/cart', count: 1 },
    ]);
    expect(result.topRoutes).toHaveLength(5);
  });
});
