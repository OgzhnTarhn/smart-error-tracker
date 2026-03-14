import { FixMemoryService } from './fix-memory.service';

describe('FixMemoryService', () => {
  const prisma = {
    errorGroup: {
      findFirst: jest.fn(),
    },
  } as any;

  const similarIssues = {
    findSimilarIssues: jest.fn(),
  } as any;

  const preventionInsights = {
    getPreventionInsights: jest.fn(),
  } as any;

  let service: FixMemoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FixMemoryService(prisma, similarIssues, preventionInsights);
  });

  function makeGroupRow({
    id = 'group_current',
    title = "Cannot read properties of null (reading 'total')",
    fingerprint = "browser|/checkout|Cannot read properties of null (reading 'total')|apps/web/src/pages/Checkout.tsx:12:4",
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
    status = 'resolved',
    similarityReason = 'Similar null-access error on the same frontend route',
    resolutionNote = null,
    isRegression = false,
    lastSeenAt = '2026-03-11T10:00:00.000Z',
    score = 0.88,
  }: {
    id: string;
    status?: string;
    similarityReason?: string;
    resolutionNote?: string | null;
    isRegression?: boolean;
    lastSeenAt?: string;
    score?: number;
  }) {
    return {
      id,
      title: `Similar issue ${id}`,
      status,
      similarityReason,
      resolutionNote,
      lastSeenAt: new Date(lastSeenAt),
      isRegression,
      score,
    };
  }

  it('prioritizes resolved similar issues with notes and synthesizes grounded fix memory', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        aiAnalysis: {
          suggestedFix: 'Add null/undefined guards before property access.',
          nextStep: 'Inspect checkout rendering before totals are read.',
          preventionTip: 'Add route-level defensive rendering guards.',
        },
      }),
    );
    similarIssues.findSimilarIssues.mockResolvedValue([
      makeSimilarIssue({
        id: 'group_current',
        resolutionNote: 'Added null guard before rendering checkout summary.',
        score: 0.99,
      }),
      makeSimilarIssue({
        id: 'group_2',
        resolutionNote: 'Added null guard before rendering checkout summary.',
        score: 0.93,
      }),
      makeSimilarIssue({
        id: 'group_3',
        resolutionNote:
          'Used optional chaining before reading checkout totals and added a regression test.',
        isRegression: true,
        lastSeenAt: '2026-03-10T10:00:00.000Z',
        score: 0.91,
      }),
    ]);
    preventionInsights.getPreventionInsights.mockResolvedValue({
      preventionTip: 'Add route-level defensive rendering guards.',
      repeatRisk: 'high',
      repeatSignals: [],
      recommendedActions: [
        'Add null/undefined guards before property access.',
        'Add a regression test for the affected route or handler.',
      ],
      derivedFrom: {
        currentAnalysis: true,
        similarIssuesCount: 2,
        regressionHistory: true,
        resolutionNotesUsed: 2,
      },
    });

    const result = await service.getFixMemory('proj_1', 'group_current');

    expect(result).not.toBeNull();
    expect(result?.summary).toContain('null guards and optional chaining');
    expect(result?.confidence).toBe('high');
    expect(result?.signals).toEqual(
      expect.arrayContaining([
        '2 resolved similar issues with resolution notes were found.',
        'Past fixes repeatedly mention null checks before property access.',
      ]),
    );
    expect(result?.recommendedActions).toEqual(
      expect.arrayContaining([
        'Add null/undefined guards before property access.',
        'Review the saved resolution notes from similar resolved issues before closing this issue.',
        'Add a regression test for the affected route or handler.',
      ]),
    );
    expect(result?.relatedFixes.map((item) => item.id)).toEqual([
      'group_2',
      'group_3',
    ]);
    expect(result?.relatedFixes.some((item) => item.id === 'group_current')).toBe(
      false,
    );
    expect(result?.derivedFrom).toEqual({
      resolvedSimilarIssues: 3,
      resolutionNotesUsed: 2,
      preventionInsightUsed: true,
      currentAnalysisUsed: true,
    });
  });

  it('deduplicates overlapping reusable actions from notes and guidance', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        aiAnalysis: {
          suggestedFix: 'Add null/undefined guards before property access.',
        },
      }),
    );
    similarIssues.findSimilarIssues.mockResolvedValue([
      makeSimilarIssue({
        id: 'group_2',
        resolutionNote: 'Added null guard before rendering checkout summary.',
      }),
    ]);
    preventionInsights.getPreventionInsights.mockResolvedValue({
      preventionTip: null,
      repeatRisk: 'medium',
      repeatSignals: [],
      recommendedActions: [
        'Add null/undefined guards before property access.',
      ],
      derivedFrom: {
        currentAnalysis: true,
        similarIssuesCount: 1,
        regressionHistory: false,
        resolutionNotesUsed: 1,
      },
    });

    const result = await service.getFixMemory('proj_1', 'group_current');

    expect(result).not.toBeNull();
    expect(result?.recommendedActions).toEqual(
      expect.arrayContaining([
        'Add null/undefined guards before property access.',
        'Review the saved resolution notes from similar resolved issues before closing this issue.',
      ]),
    );
    expect(new Set(result?.recommendedActions ?? []).size).toBe(
      result?.recommendedActions.length,
    );
  });

  it('handles sparse or noisy fix history with a stable low-confidence result', async () => {
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
        resolutionNote: '   ',
      }),
      makeSimilarIssue({
        id: 'group_3',
        status: 'open',
        resolutionNote: 'Added null guard before rendering checkout summary.',
      }),
    ]);
    preventionInsights.getPreventionInsights.mockResolvedValue({
      preventionTip: 'Add null checks or optional chaining before property access.',
      repeatRisk: 'low',
      repeatSignals: [],
      recommendedActions: [],
      derivedFrom: {
        currentAnalysis: false,
        similarIssuesCount: 1,
        regressionHistory: false,
        resolutionNotesUsed: 0,
      },
    });

    const result = await service.getFixMemory('proj_1', 'group_current');

    expect(result).toEqual({
      summary:
        'Resolved similar issues exist, but reusable fix memory is limited because saved resolution notes are sparse.',
      confidence: 'low',
      signals: ['1 resolved similar issue was found, but saved fix notes are limited.'],
      recommendedActions: [
        'Add null/undefined guards before property access.',
      ],
      relatedFixes: [
        {
          id: 'group_2',
          title: 'Similar issue group_2',
          status: 'resolved',
          resolutionNote: '   ',
          lastSeenAt: new Date('2026-03-11T10:00:00.000Z'),
          reason:
            'Resolved similar issue with matching route or error pattern, but without a saved fix note in the same frontend route.',
        },
      ],
      derivedFrom: {
        resolvedSimilarIssues: 1,
        resolutionNotesUsed: 0,
        preventionInsightUsed: true,
        currentAnalysisUsed: false,
      },
    });
  });

  it('adds regression coverage guidance when regression history is relevant', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(
      makeGroupRow({
        isRegression: true,
        regressionCount: 1,
        lastRegressedAt: '2026-03-10T10:00:00.000Z',
      }),
    );
    similarIssues.findSimilarIssues.mockResolvedValue([
      makeSimilarIssue({
        id: 'group_2',
        resolutionNote: 'Added route-level loading guard before totals render.',
      }),
    ]);
    preventionInsights.getPreventionInsights.mockResolvedValue({
      preventionTip: 'Add a checkout-state smoke test.',
      repeatRisk: 'high',
      repeatSignals: [],
      recommendedActions: [],
      derivedFrom: {
        currentAnalysis: false,
        similarIssuesCount: 1,
        regressionHistory: true,
        resolutionNotesUsed: 1,
      },
    });

    const result = await service.getFixMemory('proj_1', 'group_current');

    expect(result?.recommendedActions).toContain(
      'Add a regression test for the affected route or handler.',
    );
    expect(result?.signals).toContain(
      'Regression history suggests tests or guardrails should be reused with the fix.',
    );
  });

  it('returns null when the group cannot be found', async () => {
    prisma.errorGroup.findFirst.mockResolvedValue(null);

    const result = await service.getFixMemory('proj_1', 'group_missing');

    expect(result).toBeNull();
    expect(similarIssues.findSimilarIssues).not.toHaveBeenCalled();
    expect(preventionInsights.getPreventionInsights).not.toHaveBeenCalled();
  });
});
