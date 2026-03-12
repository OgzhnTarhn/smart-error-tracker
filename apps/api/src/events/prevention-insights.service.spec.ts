import { PreventionInsightsService } from './prevention-insights.service';

describe('PreventionInsightsService', () => {
  const prisma = {
    errorGroup: {
      findFirst: jest.fn(),
    },
  } as any;

  const similarIssues = {
    findSimilarIssues: jest.fn(),
  } as any;

  let service: PreventionInsightsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PreventionInsightsService(prisma, similarIssues);
  });

  function makeGroupRow({
    id = 'group_current',
    title = "Cannot read properties of null (reading 'total')",
    fingerprint = "browser|/checkout|Cannot read properties of null (reading 'total')|apps/web/src/pages/Checkout.tsx:12:4",
    resolutionNote = null,
    isRegression = false,
    regressionCount = 0,
    lastRegressedAt = null,
    aiAnalysis = null,
    sample = null,
    latestEvent = {},
  }: {
    id?: string;
    title?: string;
    fingerprint?: string;
    resolutionNote?: string | null;
    isRegression?: boolean;
    regressionCount?: number;
    lastRegressedAt?: string | null;
    aiAnalysis?: unknown;
    sample?: unknown;
    latestEvent?: Partial<{
      source: string;
      message: string;
      context: unknown;
      timestamp: string;
    }>;
  }) {
    return {
      id,
      title,
      fingerprint,
      resolutionNote,
      isRegression,
      regressionCount,
      lastRegressedAt: lastRegressedAt ? new Date(lastRegressedAt) : null,
      aiAnalysis,
      sample,
      events: [
        {
          source: latestEvent.source ?? 'browser',
          message: latestEvent.message ?? title,
          context: latestEvent.context ?? { route: '/checkout' },
          timestamp: new Date(
            latestEvent.timestamp ?? '2026-03-12T10:00:00.000Z',
          ),
        },
      ],
    };
  }

  function makeSimilarIssue({
    id,
    similarityReason = 'Similar null-access on the same frontend route',
    resolutionNote = null,
    isRegression = false,
  }: {
    id: string;
    similarityReason?: string;
    resolutionNote?: string | null;
    isRegression?: boolean;
  }) {
    return {
      id,
      title: `Similar issue ${id}`,
      status: resolutionNote ? 'resolved' : 'open',
      similarityReason,
      resolutionNote,
      lastSeenAt: new Date('2026-03-11T10:00:00.000Z'),
      isRegression,
      score: 0.88,
    };
  }

  it('returns low repeat risk and fallback prevention guidance for minimal data', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        aiAnalysis: null,
      }),
    );
    similarIssues.findSimilarIssues.mockResolvedValue([]);

    const result = await service.getPreventionInsights('proj_1', 'group_current');

    expect(result).toEqual({
      preventionTip:
        'Add null checks or optional chaining before property access.',
      repeatRisk: 'low',
      repeatSignals: [],
      recommendedActions: [
        'Check for nullable values before property access.',
        'Add route-level defensive rendering guards.',
      ],
      derivedFrom: {
        currentAnalysis: false,
        similarIssuesCount: 0,
        regressionHistory: false,
        resolutionNotesUsed: 0,
      },
    });
  });

  it('raises repeat risk when similar past issues exist on the same route', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(makeGroupRow({}));
    similarIssues.findSimilarIssues.mockResolvedValue([
      makeSimilarIssue({ id: 'group_2' }),
      makeSimilarIssue({ id: 'group_3' }),
    ]);

    const result = await service.getPreventionInsights('proj_1', 'group_current');

    expect(result?.repeatRisk).toBe('medium');
    expect(result?.repeatSignals).toContain(
      'This issue has similarities with 2 past issues in the same frontend route.',
    );
    expect(result?.derivedFrom.similarIssuesCount).toBe(2);
  });

  it('uses similar issue resolution notes and regression history to produce high repeat risk', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        isRegression: true,
        regressionCount: 2,
        lastRegressedAt: '2026-03-10T10:00:00.000Z',
        aiAnalysis: {
          rootCause: 'Checkout data can be null during async refetch.',
          suggestedFix: 'Check for nullable values before property access.',
          preventionTip: 'Add guards before reading checkout totals.',
          likelyArea: 'apps/web/src/pages/Checkout.tsx',
        },
      }),
    );
    similarIssues.findSimilarIssues.mockResolvedValue([
      makeSimilarIssue({
        id: 'group_2',
        resolutionNote: 'Added null guard before rendering checkout summary.',
      }),
      makeSimilarIssue({
        id: 'group_3',
        resolutionNote: 'Added route-level loading guard before totals render.',
        isRegression: true,
      }),
    ]);

    const result = await service.getPreventionInsights('proj_1', 'group_current');

    expect(result?.repeatRisk).toBe('high');
    expect(result?.preventionTip).toBe(
      'Add guards before reading checkout totals.',
    );
    expect(result?.repeatSignals).toEqual(
      expect.arrayContaining([
        '1 resolved similar issue includes a saved resolution note.',
        'This issue belongs to a pattern that has regressed before.',
      ]),
    );
    expect(result?.recommendedActions).toEqual(
      expect.arrayContaining([
        'Check for nullable values before property access.',
        'Add null guard before rendering checkout summary.',
        'Review similar resolved issue notes before shipping the fix.',
        'Add route-level defensive rendering guards.',
      ]),
    );
    expect(result?.derivedFrom).toEqual({
      currentAnalysis: true,
      similarIssuesCount: 2,
      regressionHistory: true,
      resolutionNotesUsed: 1,
    });
  });

  it('deduplicates repeated actions from AI guidance and resolution notes', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        aiAnalysis: {
          suggestedFix: 'Add null guard before rendering checkout summary.',
          nextStep: 'Add null guard before rendering checkout summary.',
        },
      }),
    );
    similarIssues.findSimilarIssues.mockResolvedValue([
      makeSimilarIssue({
        id: 'group_2',
        resolutionNote: 'Added null guard before rendering checkout summary.',
      }),
    ]);

    const result = await service.getPreventionInsights('proj_1', 'group_current');

    expect(result?.recommendedActions).toEqual([
      'Add null guard before rendering checkout summary.',
      'Check for nullable values before property access.',
      'Review similar resolved issue notes before shipping the fix.',
      'Add route-level defensive rendering guards.',
    ]);
    expect(result?.derivedFrom.resolutionNotesUsed).toBe(0);
  });

  it('stays stable when aiAnalysis, sample, and context payloads are partial or malformed', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        aiAnalysis: 'not-a-structured-object',
        sample: ['unexpected-array-shape'],
        latestEvent: {
          context: 'missing-object-shape',
        },
      }),
    );
    similarIssues.findSimilarIssues.mockResolvedValue([
      makeSimilarIssue({
        id: 'group_2',
        similarityReason: 'Related issue with overlapping error signals',
      }),
    ]);

    const result = await service.getPreventionInsights('proj_1', 'group_current');

    expect(result).toEqual({
      preventionTip:
        'Add null checks or optional chaining before property access.',
      repeatRisk: 'medium',
      repeatSignals: [
        'This issue has similarities with 1 past issue in recent project history.',
        'This matches a recurring null-access pattern.',
      ],
      recommendedActions: [
        'Check for nullable values before property access.',
        'Add route-level defensive rendering guards.',
      ],
      derivedFrom: {
        currentAnalysis: false,
        similarIssuesCount: 1,
        regressionHistory: false,
        resolutionNotesUsed: 0,
      },
    });
  });

  it('returns null when the group cannot be found', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(null);

    const result = await service.getPreventionInsights('proj_1', 'group_missing');

    expect(result).toBeNull();
    expect(similarIssues.findSimilarIssues).not.toHaveBeenCalled();
  });
});
