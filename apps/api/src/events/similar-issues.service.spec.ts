import { SimilarIssuesService } from './similar-issues.service';

describe('SimilarIssuesService', () => {
  const prisma = {
    errorGroup: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  let service: SimilarIssuesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SimilarIssuesService(prisma);
  });

  function makeGroupRow({
    id,
    title,
    status = 'open',
    resolutionNote = null,
    isRegression = false,
    lastSeenAt = '2026-03-07T10:00:00.000Z',
    source = 'browser',
    route = '/checkout',
    message = title,
    likelyArea = null,
    fingerprint,
  }: {
    id: string;
    title: string;
    status?: string;
    resolutionNote?: string | null;
    isRegression?: boolean;
    lastSeenAt?: string;
    source?: string;
    route?: string;
    message?: string;
    likelyArea?: string | null;
    fingerprint?: string;
  }) {
    return {
      id,
      fingerprint:
        fingerprint ??
        `${source}|${route}|${title}|apps/web/src/pages/Checkout.tsx:12:4`,
      title,
      status,
      resolutionNote,
      isRegression,
      lastSeenAt: new Date(lastSeenAt),
      aiAnalysis: likelyArea ? { likelyArea } : null,
      sample: {
        source,
        message,
        context: {
          route,
        },
      },
      events: [
        {
          source,
          message,
          context: {
            route,
          },
          timestamp: new Date(lastSeenAt),
        },
      ],
    };
  }

  it('ranks similar issues by heuristic score and prefers resolved issues with notes', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        id: 'group_current',
        title: "Cannot read properties of null (reading 'total')",
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
      }),
    );
    prisma.errorGroup.findMany.mockResolvedValue([
      makeGroupRow({
        id: 'group_current',
        title: "Cannot read properties of null (reading 'total')",
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
      }),
      makeGroupRow({
        id: 'group_resolved',
        title: "Cannot read properties of null (reading 'summary')",
        status: 'resolved',
        resolutionNote:
          'Added null guard before rendering checkout summary.',
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
        lastSeenAt: '2026-03-06T10:00:00.000Z',
      }),
      makeGroupRow({
        id: 'group_open',
        title: "Cannot read properties of null (reading 'items')",
        status: 'open',
        route: '/checkout/cart',
        likelyArea: 'apps/web/src/components/CheckoutSummary.tsx',
        lastSeenAt: '2026-03-08T09:00:00.000Z',
      }),
      makeGroupRow({
        id: 'group_ignored',
        title: "Cannot read properties of undefined (reading 'map')",
        status: 'ignored',
        route: '/checkout',
        likelyArea: 'apps/web/src/components/CheckoutSummary.tsx',
        lastSeenAt: '2026-03-05T11:00:00.000Z',
      }),
    ]);

    const result = await service.findSimilarIssues('proj_1', 'group_current');

    expect(result).not.toBeNull();
    expect(result?.map((item) => item.id)).toEqual([
      'group_resolved',
      'group_open',
      'group_ignored',
    ]);
    expect(result?.map((item) => item.status)).toEqual([
      'resolved',
      'open',
      'ignored',
    ]);
    expect(result?.[0]).toEqual(
      expect.objectContaining({
        resolutionNote:
          'Added null guard before rendering checkout summary.',
        similarityReason: expect.stringContaining('null-access'),
        score: expect.any(Number),
      }),
    );
    expect(result?.some((item) => item.id === 'group_current')).toBe(false);
  });

  it('returns an empty list when no candidates clear the similarity threshold', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        id: 'group_current',
        title: "Cannot read properties of null (reading 'total')",
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
      }),
    );
    prisma.errorGroup.findMany.mockResolvedValue([
      makeGroupRow({
        id: 'group_network',
        title: 'Request failed with status 503',
        source: 'api',
        route: '/api/payments',
        message: 'Request failed with status 503',
        likelyArea: 'apps/api/src/payments/service.ts',
        fingerprint:
          'api|/api/payments|Request failed with status 503|apps/api/src/payments/service.ts:44:9',
      }),
    ]);

    const result = await service.findSimilarIssues('proj_1', 'group_current');

    expect(result).toEqual([]);
  });

  it('orders equal-scored results by recency', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        id: 'group_current',
        title: "Cannot read properties of null (reading 'total')",
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
      }),
    );
    prisma.errorGroup.findMany.mockResolvedValue([
      makeGroupRow({
        id: 'group_older',
        title: "Cannot read properties of null (reading 'summary')",
        route: '/checkout',
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
        lastSeenAt: '2026-03-05T09:00:00.000Z',
      }),
      makeGroupRow({
        id: 'group_newer',
        title: "Cannot read properties of null (reading 'summary')",
        route: '/checkout',
        likelyArea: 'apps/web/src/pages/Checkout.tsx',
        lastSeenAt: '2026-03-07T09:00:00.000Z',
      }),
    ]);

    const result = await service.findSimilarIssues('proj_1', 'group_current');

    expect(result?.map((item) => item.id)).toEqual([
      'group_newer',
      'group_older',
    ]);
    expect(result?.[0]?.score).toBe(result?.[1]?.score);
  });

  it('returns null when the current group cannot be found', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(null);

    const result = await service.findSimilarIssues('proj_1', 'group_missing');

    expect(result).toBeNull();
    expect(prisma.errorGroup.findMany).not.toHaveBeenCalled();
  });
});
