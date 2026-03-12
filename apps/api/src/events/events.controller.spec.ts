import { EventsController } from './events.controller';
import { IngestEventDto } from './dto/ingest-event.dto';

describe('EventsController', () => {
  function makeMissingEventAiAnalysisError() {
    return {
      code: 'P2022',
      message: 'column Event.aiAnalysis does not exist',
      meta: {
        modelName: 'Event',
        driverAdapterError: {
          cause: {
            originalMessage: 'column Event.aiAnalysis does not exist',
          },
        },
      },
    };
  }

  function makeMissingErrorGroupResolutionNoteError() {
    return {
      code: 'P2022',
      message: 'column ErrorGroup.resolutionNote does not exist',
      meta: {
        modelName: 'ErrorGroup',
        driverAdapterError: {
          cause: {
            originalMessage: 'column ErrorGroup.resolutionNote does not exist',
          },
        },
      },
    };
  }

  function makeResolvedSourceMapResult() {
    return {
      status: 'resolved',
      message: 'Resolved the top frame to its original source location.',
      hint: 'Source map resolved. Re-run analysis for more precise guidance.',
      sourceMap: {
        mapUrl: 'https://cdn.example.com/app.js.map',
        minified: {
          functionName: 'renderCheckout',
          file: 'app.min.js',
          line: 10,
          column: 5,
        },
        original: {
          source: 'src/pages/Checkout.tsx',
          line: 12,
          column: 4,
          name: 'CheckoutPage',
        },
      },
      diagnostics: {
        frame: {
          functionName: 'renderCheckout',
          file: 'app.min.js',
          line: 10,
          column: 5,
        },
        frameKind: 'remote_asset',
        mapUrl: 'https://cdn.example.com/app.js.map',
        httpStatus: 200,
      },
    };
  }

  function makeNoSourceMapNeededResult() {
    return {
      status: 'not_needed',
      message:
        'This stack already points to source-level code, so source map resolution is probably not needed.',
      hint:
        'Dev stacks from Vite or webpack often already include original source paths.',
      sourceMap: null,
      diagnostics: {
        frame: {
          functionName: 'renderSettings',
          file: 'http://localhost:5173/src/pages/Settings.tsx',
          line: 20,
          column: 2,
        },
        frameKind: 'source',
        mapUrl: null,
        httpStatus: null,
      },
    };
  }

  const tx = {
    errorGroup: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    event: { create: jest.fn() },
  };

  const prisma = {
    apiKey: { findUnique: jest.fn() },
    errorGroup: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
  const sourceMaps = {
    resolveTopFrameDetailed: jest.fn(),
  } as any;
  const dashboardStats = {
    getStats: jest.fn(),
  } as any;
  const similarIssues = {
    findSimilarIssues: jest.fn(),
  } as any;
  const preventionInsights = {
    getPreventionInsights: jest.fn(),
  } as any;

  let controller: EventsController;

  beforeEach(() => {
    jest.clearAllMocks();
    sourceMaps.resolveTopFrameDetailed.mockResolvedValue(
      makeNoSourceMapNeededResult(),
    );
    controller = new EventsController(
      prisma,
      sourceMaps,
      dashboardStats,
      similarIssues,
      preventionInsights,
    );
  });

  it('creates a new group and event in a transaction for ingest', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.findUnique.mockResolvedValue(null);
    tx.errorGroup.create.mockResolvedValue({ id: 'group_1' });
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
    expect(tx.errorGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj_1',
          title: 'Boom failure',
          status: 'open',
          isRegression: false,
          regressionCount: 0,
          lastRegressedAt: null,
          eventCount: 1,
        }),
      }),
    );
    expect(tx.errorGroup.update).not.toHaveBeenCalled();
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
    tx.errorGroup.findUnique.mockResolvedValue(null);
    tx.errorGroup.create.mockResolvedValue({ id: 'group_1' });
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

  it('reopens resolved groups as regression on matching ingest', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.findUnique.mockResolvedValue({
      id: 'group_1',
      status: 'resolved',
    });
    tx.errorGroup.update.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await controller.ingest('set_valid_key', {
      source: 'backend-service',
      message: 'Regression event',
      level: 'error',
    });

    expect(tx.errorGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group_1' },
        data: expect.objectContaining({
          status: 'open',
          isRegression: true,
          regressionCount: { increment: 1 },
          eventCount: { increment: 1 },
          lastRegressedAt: expect.any(Date),
        }),
      }),
    );
  });

  it('does not increment regression for open groups on ingest', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.findUnique.mockResolvedValue({
      id: 'group_1',
      status: 'open',
    });
    tx.errorGroup.update.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await controller.ingest('set_valid_key', {
      source: 'backend-service',
      message: 'Open group event',
      level: 'error',
    });

    const updateArg = tx.errorGroup.update.mock.calls[0][0];
    expect(updateArg.data.eventCount).toEqual({ increment: 1 });
    expect(updateArg.data.status).toBeUndefined();
    expect(updateArg.data.isRegression).toBeUndefined();
    expect(updateArg.data.regressionCount).toBeUndefined();
    expect(updateArg.data.lastRegressedAt).toBeUndefined();
  });

  it('keeps ignored groups ignored on ingest', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    tx.errorGroup.findUnique.mockResolvedValue({
      id: 'group_1',
      status: 'ignored',
    });
    tx.errorGroup.update.mockResolvedValue({ id: 'group_1' });
    tx.event.create.mockResolvedValue({ id: 'event_1' });
    prisma.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await controller.ingest('set_valid_key', {
      source: 'backend-service',
      message: 'Ignored group event',
      level: 'error',
    });

    const updateArg = tx.errorGroup.update.mock.calls[0][0];
    expect(updateArg.data.eventCount).toEqual({ increment: 1 });
    expect(updateArg.data.status).toBeUndefined();
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
        isRegression: true,
        regressionCount: 2,
        lastRegressedAt: new Date('2026-03-02T09:00:00.000Z'),
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
          isRegression: true,
          regressionCount: 2,
          lastRegressedAt: new Date('2026-03-02T09:00:00.000Z'),
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

  it('delegates stats retrieval to dashboard service', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    dashboardStats.getStats.mockResolvedValue({
      ok: true,
      totals: {
        totalEvents: 10,
        totalIssues: 4,
        openIssues: 2,
        resolvedIssues: 1,
        ignoredIssues: 1,
      },
      trend7d: [{ date: '2026-03-07', count: 10 }],
      errorsByLevel: [{ name: 'error', count: 10 }],
      errorsByEnvironment: [{ name: 'production', count: 8 }],
      errorsByRelease: [{ name: '1.0.0', count: 7 }],
      topRoutes: [{ name: '/checkout', count: 5 }],
      topIssues: [],
      counts: {
        totalGroups: 4,
        open: 2,
        resolved: 1,
        ignored: 1,
        totalEvents: 10,
      },
      dailyTrend: [{ date: '2026-03-07', count: 10 }],
    });

    const result = await controller.getStats('set_valid_key');

    expect(dashboardStats.getStats).toHaveBeenCalledWith('proj_1', undefined, 7);
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        counts: {
          totalGroups: 4,
          open: 2,
          resolved: 1,
          ignored: 1,
          totalEvents: 10,
        },
        dailyTrend: [{ date: '2026-03-07', count: 10 }],
        topIssues: [],
      }),
    );
  });

  it('passes 30 day stats range to dashboard service when requested', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    dashboardStats.getStats.mockResolvedValue({
      ok: true,
      totals: {
        totalEvents: 0,
        totalIssues: 0,
        openIssues: 0,
        resolvedIssues: 0,
        ignoredIssues: 0,
      },
      trend7d: [],
      errorsByLevel: [],
      errorsByEnvironment: [],
      errorsByRelease: [],
      topRoutes: [],
      topIssues: [],
      counts: {
        totalGroups: 0,
        open: 0,
        resolved: 0,
        ignored: 0,
        totalEvents: 0,
      },
      dailyTrend: [],
    });

    await controller.getStats('set_valid_key', '30d');

    expect(dashboardStats.getStats).toHaveBeenCalledWith(
      'proj_1',
      undefined,
      30,
    );
  });

  it('returns event-level and regression fields in groupDetail response', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      fingerprint: 'fp_1',
      title: 'TypeError',
      status: 'open',
      isRegression: true,
      regressionCount: 1,
      lastRegressedAt: new Date('2026-03-02T09:00:00.000Z'),
      eventCount: 2,
      firstSeenAt: new Date('2026-03-01T10:00:00.000Z'),
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      resolutionNote: 'Added a guard before rendering checkout totals.',
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
        aiAnalysis: {
          eventId: 'event_1',
          rootCause: 'The checkout payload is missing the cart id.',
          suggestedFix: 'Guard against empty cart state before reading totals.',
          likelyArea: 'apps/web/src/pages/Checkout.tsx',
          nextStep: 'Inspect the cart selector output on the failing render.',
          preventionTip: 'Add a checkout-state smoke test.',
          severity: 'high',
          confidence: 'medium',
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
      group: expect.objectContaining({
        id: 'group_1',
        isRegression: true,
        regressionCount: 1,
        resolutionNote: 'Added a guard before rendering checkout totals.',
      }),
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
          aiAnalysis: {
            rootCause: 'The checkout payload is missing the cart id.',
            suggestedFix:
              'Guard against empty cart state before reading totals.',
            likelyArea: 'apps/web/src/pages/Checkout.tsx',
            nextStep:
              'Inspect the cart selector output on the failing render.',
            preventionTip: 'Add a checkout-state smoke test.',
            severity: 'high',
            confidence: 'medium',
            summary: null,
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

  it('returns similar issues for a group', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    similarIssues.findSimilarIssues.mockResolvedValue([
      {
        id: 'group_2',
        title: "Cannot read properties of null (reading 'summary')",
        status: 'resolved',
        similarityReason: 'Similar null-access error on the same frontend route',
        resolutionNote: 'Added null guard before rendering checkout summary.',
        lastSeenAt: new Date('2026-03-07T10:00:00.000Z'),
        isRegression: false,
        score: 0.92,
      },
    ]);

    const result = await controller.listSimilarGroups(
      'set_valid_key',
      'group_1',
    );

    expect(similarIssues.findSimilarIssues).toHaveBeenCalledWith(
      'proj_1',
      'group_1',
    );
    expect(result).toEqual({
      ok: true,
      items: [
        {
          id: 'group_2',
          title: "Cannot read properties of null (reading 'summary')",
          status: 'resolved',
          similarityReason:
            'Similar null-access error on the same frontend route',
          resolutionNote:
            'Added null guard before rendering checkout summary.',
          lastSeenAt: new Date('2026-03-07T10:00:00.000Z'),
          isRegression: false,
          score: 0.92,
        },
      ],
    });
  });

  it('returns not_found for similar issues when the group does not exist', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    similarIssues.findSimilarIssues.mockResolvedValue(null);

    const result = await controller.listSimilarGroups(
      'set_valid_key',
      'group_missing',
    );

    expect(result).toEqual({ ok: false, error: 'not_found' });
  });

  it('returns prevention insights for a group', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    preventionInsights.getPreventionInsights.mockResolvedValue({
      preventionTip: 'Add null guards before rendering async checkout data.',
      repeatRisk: 'medium',
      repeatSignals: [
        'This issue has similarities with 2 past issues in the same frontend route.',
      ],
      recommendedActions: [
        'Check for nullable values before property access.',
      ],
      derivedFrom: {
        currentAnalysis: true,
        similarIssuesCount: 2,
        regressionHistory: false,
        resolutionNotesUsed: 1,
      },
    });

    const result = await controller.getPreventionInsights(
      'set_valid_key',
      'group_1',
    );

    expect(preventionInsights.getPreventionInsights).toHaveBeenCalledWith(
      'proj_1',
      'group_1',
    );
    expect(result).toEqual({
      ok: true,
      insights: {
        preventionTip:
          'Add null guards before rendering async checkout data.',
        repeatRisk: 'medium',
        repeatSignals: [
          'This issue has similarities with 2 past issues in the same frontend route.',
        ],
        recommendedActions: [
          'Check for nullable values before property access.',
        ],
        derivedFrom: {
          currentAnalysis: true,
          similarIssuesCount: 2,
          regressionHistory: false,
          resolutionNotesUsed: 1,
        },
      },
    });
  });

  it('returns not_found for prevention insights when the group does not exist', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    preventionInsights.getPreventionInsights.mockResolvedValue(null);

    const result = await controller.getPreventionInsights(
      'set_valid_key',
      'group_missing',
    );

    expect(result).toEqual({ ok: false, error: 'not_found' });
  });

  it('resolves a group with a resolution note', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      status: 'open',
      resolutionNote: null,
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });
    prisma.errorGroup.update.mockResolvedValue({
      id: 'group_1',
      status: 'resolved',
      resolutionNote: 'Added null guard before rendering checkout summary.',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });

    const result = await controller.resolveGroup('set_valid_key', 'group_1', {
      note: 'Added null guard before rendering checkout summary.',
    });

    expect(prisma.errorGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group_1' },
        data: {
          status: 'resolved',
          resolutionNote:
            'Added null guard before rendering checkout summary.',
        },
        select: expect.objectContaining({
          resolutionNote: true,
        }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      group: {
        id: 'group_1',
        status: 'resolved',
        resolutionNote:
          'Added null guard before rendering checkout summary.',
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        eventCount: 3,
      },
    });
  });

  it('resolves a group without changing the note when note is omitted', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      status: 'open',
      resolutionNote: 'Existing note',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });
    prisma.errorGroup.update.mockResolvedValue({
      id: 'group_1',
      status: 'resolved',
      resolutionNote: 'Existing note',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });

    const result = await controller.resolveGroup('set_valid_key', 'group_1');

    expect(prisma.errorGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group_1' },
        data: {
          status: 'resolved',
        },
        select: expect.objectContaining({
          resolutionNote: true,
        }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      group: {
        id: 'group_1',
        status: 'resolved',
        resolutionNote: 'Existing note',
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        eventCount: 3,
      },
    });
  });

  it('normalizes blank resolution notes to null', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      status: 'open',
      resolutionNote: 'Old note',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });
    prisma.errorGroup.update.mockResolvedValue({
      id: 'group_1',
      status: 'resolved',
      resolutionNote: null,
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });

    const result = await controller.resolveGroup('set_valid_key', 'group_1', {
      note: '   ',
    });

    expect(prisma.errorGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group_1' },
        data: {
          status: 'resolved',
          resolutionNote: null,
        },
        select: expect.objectContaining({
          resolutionNote: true,
        }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      group: {
        id: 'group_1',
        status: 'resolved',
        resolutionNote: null,
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        eventCount: 3,
      },
    });
  });

  it('reopens a resolved group without erasing the saved resolution note', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      status: 'resolved',
      resolutionNote: 'Added null guard before rendering checkout summary.',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });
    prisma.errorGroup.update.mockResolvedValue({
      id: 'group_1',
      status: 'open',
      resolutionNote: 'Added null guard before rendering checkout summary.',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });

    const result = await controller.openGroup('set_valid_key', 'group_1');

    expect(prisma.errorGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group_1' },
        data: {
          status: 'open',
        },
        select: expect.objectContaining({
          resolutionNote: true,
        }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      group: {
        id: 'group_1',
        status: 'open',
        resolutionNote: 'Added null guard before rendering checkout summary.',
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        eventCount: 3,
      },
    });
  });

  it('ignores a group without affecting an existing resolution note', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      status: 'open',
      resolutionNote: 'Added null guard before rendering checkout summary.',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });
    prisma.errorGroup.update.mockResolvedValue({
      id: 'group_1',
      status: 'ignored',
      resolutionNote: 'Added null guard before rendering checkout summary.',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });

    const result = await controller.ignoreGroup('set_valid_key', 'group_1');

    expect(prisma.errorGroup.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'group_1' },
        data: {
          status: 'ignored',
        },
        select: expect.objectContaining({
          resolutionNote: true,
        }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      group: {
        id: 'group_1',
        status: 'ignored',
        resolutionNote: 'Added null guard before rendering checkout summary.',
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        eventCount: 3,
      },
    });
  });

  it('falls back to resolutionNote=null in groupDetail when the column is not migrated yet', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst
      .mockRejectedValueOnce(makeMissingErrorGroupResolutionNoteError())
      .mockResolvedValueOnce({
        id: 'group_1',
        fingerprint: 'fp_1',
        title: 'TypeError',
        status: 'resolved',
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        eventCount: 1,
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
        context: { route: '/checkout' },
        aiAnalysis: null,
        environment: 'dev',
        releaseVersion: '1.0.0',
        level: 'error',
        timestamp: new Date('2026-03-02T10:00:00.000Z'),
      },
    ]);

    const result = await controller.groupDetail('set_valid_key', 'group_1');

    expect(prisma.errorGroup.findFirst).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      group: expect.objectContaining({
        id: 'group_1',
        status: 'resolved',
        resolutionNote: null,
      }),
      events: [expect.objectContaining({ id: 'event_1' })],
    });
  });

  it('resolves a group without failing when resolutionNote is not migrated yet', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst
      .mockRejectedValueOnce(makeMissingErrorGroupResolutionNoteError())
      .mockResolvedValueOnce({
        id: 'group_1',
        status: 'open',
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        eventCount: 3,
      });
    prisma.errorGroup.update.mockResolvedValue({
      id: 'group_1',
      status: 'resolved',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      eventCount: 3,
    });

    const result = await controller.resolveGroup('set_valid_key', 'group_1', {
      note: 'Added null guard before rendering checkout summary.',
    });

    expect(prisma.errorGroup.findFirst).toHaveBeenCalledTimes(2);
    expect(prisma.errorGroup.update).toHaveBeenCalledWith({
      where: { id: 'group_1' },
      data: {
        status: 'resolved',
      },
      select: {
        id: true,
        status: true,
        isRegression: true,
        regressionCount: true,
        lastRegressedAt: true,
        lastSeenAt: true,
        eventCount: true,
      },
    });
    expect(result).toEqual({
      ok: true,
      group: {
        id: 'group_1',
        status: 'resolved',
        resolutionNote: null,
        isRegression: false,
        regressionCount: 0,
        lastRegressedAt: null,
        lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
        eventCount: 3,
      },
    });
  });

  it('returns explicit source map resolution results without triggering analysis', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.event.findFirst.mockResolvedValue({
      id: 'event_1',
      stack: 'TypeError: Cannot read properties of undefined\n at checkout.tsx:12:4',
    });
    sourceMaps.resolveTopFrameDetailed.mockResolvedValue(
      makeResolvedSourceMapResult(),
    );

    const result = await controller.resolveEventSourceMap(
      'set_valid_key',
      'event_1',
    );

    expect(result).toEqual({
      ok: true,
      sourceMap: makeResolvedSourceMapResult().sourceMap,
      sourceMapResult: makeResolvedSourceMapResult(),
    });
  });

  it('returns cached event-level structured analysis for analyzeEvent', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.event.findFirst.mockResolvedValue({
      id: 'event_1',
      projectId: 'proj_1',
      groupId: 'group_1',
      message: 'TypeError: Cannot read properties of undefined',
      stack: 'TypeError: Cannot read properties of undefined\n at checkout.tsx:12:4',
      context: { route: '/checkout' },
      environment: 'production',
      releaseVersion: '1.2.0',
      aiAnalysis: {
        eventId: 'event_1',
        rootCause: 'The checkout flow reads a cart object before it exists.',
        suggestedFix: 'Guard the cart access until cart state is loaded.',
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
        nextStep: 'Inspect the first render path for an empty cart state.',
        preventionTip: 'Add a loading-state regression test for checkout.',
        severity: 'high',
        confidence: 'high',
      },
      group: {
        aiAnalysis: null,
      },
    });
    sourceMaps.resolveTopFrameDetailed.mockResolvedValue(
      makeResolvedSourceMapResult(),
    );

    const result = await controller.analyzeEvent('set_valid_key', 'event_1');

    expect(result).toEqual({
      ok: true,
      analysis: {
        rootCause: 'The checkout flow reads a cart object before it exists.',
        suggestedFix: 'Guard the cart access until cart state is loaded.',
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
        nextStep: 'Inspect the first render path for an empty cart state.',
        preventionTip: 'Add a loading-state regression test for checkout.',
        severity: 'high',
        confidence: 'high',
        summary: null,
      },
      aiAnalysis: {
        rootCause: 'The checkout flow reads a cart object before it exists.',
        suggestedFix: 'Guard the cart access until cart state is loaded.',
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
        nextStep: 'Inspect the first render path for an empty cart state.',
        preventionTip: 'Add a loading-state regression test for checkout.',
        severity: 'high',
        confidence: 'high',
        summary: null,
      },
      sourceMapResult: makeResolvedSourceMapResult(),
      sourceMap: {
        mapUrl: 'https://cdn.example.com/app.js.map',
        minified: {
          functionName: 'renderCheckout',
          file: 'app.min.js',
          line: 10,
          column: 5,
        },
        original: {
          source: 'src/pages/Checkout.tsx',
          line: 12,
          column: 4,
          name: 'CheckoutPage',
        },
      },
    });
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('hydrates event-level cache from matching group analysis metadata', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.event.findFirst.mockResolvedValue({
      id: 'event_1',
      projectId: 'proj_1',
      groupId: 'group_1',
      message: 'ReferenceError: router is not defined',
      stack: 'ReferenceError: router is not defined\n at app.ts:20:2',
      context: { route: '/settings' },
      environment: 'production',
      releaseVersion: '1.3.0',
      aiAnalysis: null,
      group: {
        aiAnalysis: {
          eventId: 'event_1',
          rootCause:
            'The settings page uses router before the hook result is available.',
          suggestedFix:
            'Read the router inside the component body after hook initialization.',
          likelyArea: 'apps/web/src/pages/Settings.tsx',
          nextStep:
            'Inspect the component branch that references router on first render.',
          preventionTip: 'Add a test for first-render navigation state.',
          severity: 'medium',
          confidence: 'medium',
        },
      },
    });
    prisma.event.update.mockResolvedValue({ id: 'event_1' });
    sourceMaps.resolveTopFrameDetailed.mockResolvedValue(
      makeNoSourceMapNeededResult(),
    );

    const result = await controller.analyzeEvent('set_valid_key', 'event_1');

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'event_1' },
      data: {
        aiAnalysis: {
          eventId: 'event_1',
          rootCause:
            'The settings page uses router before the hook result is available.',
          suggestedFix:
            'Read the router inside the component body after hook initialization.',
          likelyArea: 'apps/web/src/pages/Settings.tsx',
          nextStep:
            'Inspect the component branch that references router on first render.',
          preventionTip: 'Add a test for first-render navigation state.',
          severity: 'medium',
          confidence: 'medium',
          summary: null,
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      analysis: {
        rootCause:
          'The settings page uses router before the hook result is available.',
        suggestedFix:
          'Read the router inside the component body after hook initialization.',
        likelyArea: 'apps/web/src/pages/Settings.tsx',
        nextStep:
          'Inspect the component branch that references router on first render.',
        preventionTip: 'Add a test for first-render navigation state.',
        severity: 'medium',
        confidence: 'medium',
        summary: null,
      },
      aiAnalysis: {
        rootCause:
          'The settings page uses router before the hook result is available.',
        suggestedFix:
          'Read the router inside the component body after hook initialization.',
        likelyArea: 'apps/web/src/pages/Settings.tsx',
        nextStep:
          'Inspect the component branch that references router on first render.',
        preventionTip: 'Add a test for first-render navigation state.',
        severity: 'medium',
        confidence: 'medium',
        summary: null,
      },
      sourceMapResult: makeNoSourceMapNeededResult(),
      sourceMap: null,
    });
  });

  it('falls back to group-only event detail data when Event.aiAnalysis is not migrated yet', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.errorGroup.findFirst.mockResolvedValue({
      id: 'group_1',
      fingerprint: 'fp_1',
      title: 'TypeError',
      status: 'open',
      isRegression: false,
      regressionCount: 0,
      lastRegressedAt: null,
      eventCount: 1,
      firstSeenAt: new Date('2026-03-01T10:00:00.000Z'),
      lastSeenAt: new Date('2026-03-02T10:00:00.000Z'),
      aiAnalysis: {
        eventId: 'event_1',
        rootCause: 'Legacy group cache still exists.',
        suggestedFix: 'Apply the pending migration for event-level storage.',
        severity: 'medium',
      },
    });
    prisma.event.findMany
      .mockRejectedValueOnce(makeMissingEventAiAnalysisError())
      .mockResolvedValueOnce([
        {
          id: 'event_1',
          source: 'browser',
          message: 'Cannot read x',
          stack: 'TypeError at app.ts:12',
          context: { route: '/checkout' },
          environment: 'dev',
          releaseVersion: '1.0.0',
          level: 'error',
          timestamp: new Date('2026-03-02T10:00:00.000Z'),
        },
      ]);

    const result = await controller.groupDetail('set_valid_key', 'group_1');

    expect(prisma.event.findMany).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      group: expect.objectContaining({
        id: 'group_1',
        aiAnalysis: {
          rootCause: 'Legacy group cache still exists.',
          suggestedFix: 'Apply the pending migration for event-level storage.',
          likelyArea: null,
          nextStep: null,
          preventionTip: null,
          severity: 'medium',
          confidence: null,
          summary: null,
        },
      }),
      events: [
        expect.objectContaining({
          id: 'event_1',
          aiAnalysis: null,
        }),
      ],
    });
  });

  it('does not fail analyzeEvent when Event.aiAnalysis column is missing', async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      projectId: 'proj_1',
      revokedAt: null,
    });
    prisma.event.findFirst
      .mockRejectedValueOnce(makeMissingEventAiAnalysisError())
      .mockResolvedValueOnce({
        id: 'event_1',
        groupId: 'group_1',
        message: 'ReferenceError: router is not defined',
        stack: 'ReferenceError: router is not defined\n at app.ts:20:2',
        context: { route: '/settings' },
        environment: 'production',
        releaseVersion: '1.3.0',
        group: {
          aiAnalysis: {
            eventId: 'event_1',
            rootCause:
              'The settings page uses router before the hook result is available.',
            suggestedFix:
              'Read the router inside the component body after hook initialization.',
            likelyArea: 'apps/web/src/pages/Settings.tsx',
            nextStep:
              'Inspect the component branch that references router on first render.',
            preventionTip: 'Add a test for first-render navigation state.',
            severity: 'medium',
            confidence: 'medium',
          },
        },
      });
    sourceMaps.resolveTopFrameDetailed.mockResolvedValue(
      makeNoSourceMapNeededResult(),
    );

    const result = await controller.analyzeEvent('set_valid_key', 'event_1');

    expect(prisma.event.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      analysis: {
        rootCause:
          'The settings page uses router before the hook result is available.',
        suggestedFix:
          'Read the router inside the component body after hook initialization.',
        likelyArea: 'apps/web/src/pages/Settings.tsx',
        nextStep:
          'Inspect the component branch that references router on first render.',
        preventionTip: 'Add a test for first-render navigation state.',
        severity: 'medium',
        confidence: 'medium',
        summary: null,
      },
      aiAnalysis: {
        rootCause:
          'The settings page uses router before the hook result is available.',
        suggestedFix:
          'Read the router inside the component body after hook initialization.',
        likelyArea: 'apps/web/src/pages/Settings.tsx',
        nextStep:
          'Inspect the component branch that references router on first render.',
        preventionTip: 'Add a test for first-render navigation state.',
        severity: 'medium',
        confidence: 'medium',
        summary: null,
      },
      sourceMapResult: makeNoSourceMapNeededResult(),
      sourceMap: null,
    });
  });
});
