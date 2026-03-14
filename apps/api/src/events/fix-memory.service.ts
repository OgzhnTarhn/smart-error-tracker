import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeStoredAiAnalysis } from './ai-analysis';
import {
  PreventionInsights,
  PreventionInsightsService,
} from './prevention-insights.service';
import {
  SimilarIssueItem,
  SimilarIssuesService,
} from './similar-issues.service';

type SourceFamily = 'frontend' | 'backend' | 'unknown';

type FixPatternId =
  | 'null_guard'
  | 'defensive_rendering'
  | 'async_error_handling'
  | 'config_validation'
  | 'request_fallback'
  | 'middleware_error_handling'
  | 'state_initialization'
  | 'regression_testing'
  | 'input_validation';

type FixPatternDescriptor = {
  id: FixPatternId;
  label: string;
  signalLabel: string;
  action: string;
  keywords: string[];
};

export type FixMemoryConfidence = 'low' | 'medium' | 'high';

export interface FixMemoryRelatedFix {
  id: string;
  title: string;
  status: string;
  resolutionNote: string | null;
  lastSeenAt: Date;
  reason: string;
}

export interface FixMemory {
  summary: string | null;
  confidence: FixMemoryConfidence;
  signals: string[];
  recommendedActions: string[];
  relatedFixes: FixMemoryRelatedFix[];
  derivedFrom: {
    resolvedSimilarIssues: number;
    resolutionNotesUsed: number;
    preventionInsightUsed: boolean;
    currentAnalysisUsed: boolean;
  };
}

const FIX_PATTERNS: FixPatternDescriptor[] = [
  {
    id: 'null_guard',
    label: 'null guards and optional chaining',
    signalLabel: 'null checks before property access',
    action: 'Add null/undefined guards before property access.',
    keywords: [
      'null guard',
      'null check',
      'optional chaining',
      'guard against null',
      'check for null',
      'nullable',
      'undefined guard',
      'undefined check',
    ],
  },
  {
    id: 'defensive_rendering',
    label: 'defensive rendering checks',
    signalLabel: 'defensive rendering before the failing route or component renders',
    action: 'Add defensive rendering checks before the failing route or component renders.',
    keywords: [
      'defensive render',
      'defensive rendering',
      'rendering guard',
      'render guard',
      'loading guard',
      'before rendering',
      'conditional render',
    ],
  },
  {
    id: 'async_error_handling',
    label: 'explicit async error handling',
    signalLabel: 'try/catch or explicit promise rejection handling',
    action: 'Wrap async work in try/catch or add explicit promise rejection handling.',
    keywords: [
      'try/catch',
      'try catch',
      'catch handler',
      'add catch',
      'promise rejection',
      'unhandled rejection',
      'handled async',
      'wrap async',
    ],
  },
  {
    id: 'config_validation',
    label: 'config and environment validation',
    signalLabel: 'startup-time config or environment validation',
    action: 'Validate required config or env values before the failing code path runs.',
    keywords: [
      'validate config',
      'validate env',
      'environment check',
      'missing env',
      'missing config',
      'config validation',
      'startup validation',
    ],
  },
  {
    id: 'request_fallback',
    label: 'request fallbacks and failure handling',
    signalLabel: 'request fallback or graceful failure handling',
    action: 'Add request failure handling with a safe fallback or retry path.',
    keywords: [
      'fallback',
      'graceful fallback',
      'request error',
      'retry',
      'network fallback',
      'safe fallback',
      'default response',
    ],
  },
  {
    id: 'middleware_error_handling',
    label: 'centralized middleware or error handling',
    signalLabel: 'middleware or centralized error handling',
    action: 'Move repeated guard logic into middleware or centralized error handling where practical.',
    keywords: [
      'middleware',
      'centralized error',
      'global handler',
      'error handler',
      'wrapped handler',
    ],
  },
  {
    id: 'state_initialization',
    label: 'state initialization and default values',
    signalLabel: 'state initialization or safe default values',
    action: 'Initialize state or fallback values before use.',
    keywords: [
      'initialize state',
      'initialized state',
      'default value',
      'fallback value',
      'safe default',
      'initialize value',
    ],
  },
  {
    id: 'regression_testing',
    label: 'regression tests around the failing path',
    signalLabel: 'regression tests or smoke coverage',
    action: 'Add a regression test for the affected route or handler.',
    keywords: [
      'regression test',
      'smoke test',
      'add test',
      'coverage',
      'test for',
      'guardrail',
      'checklist',
    ],
  },
  {
    id: 'input_validation',
    label: 'input validation before execution',
    signalLabel: 'input validation before the failing path runs',
    action: 'Validate input earlier and fail fast on bad payloads.',
    keywords: [
      'validate input',
      'input validation',
      'schema',
      'sanitize',
      'invalid payload',
      'bad request',
    ],
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asDisplayString(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function splitFingerprint(fingerprint: string) {
  const parts = fingerprint.split('|');
  return {
    source: parts[0]?.trim() || '',
    route: parts[1]?.trim() || '',
    message: parts[2]?.trim() || '',
  };
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[`"'()[\]{}]/g, ' ')
    .replace(/[^a-z0-9/:._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSentence(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;

  const sentence = trimmed.replace(/[.!?\s]+$/g, '');
  if (!sentence) return null;

  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}

function canonicalize(value: string | null | undefined) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function pushUnique(
  target: string[],
  seen: Set<string>,
  value: string | null | undefined,
) {
  const sentence = toSentence(value);
  if (!sentence) return;

  const key = canonicalize(sentence);
  if (!key || seen.has(key)) return;

  seen.add(key);
  target.push(sentence);
}

function getSourceFamily(source: string | null | undefined): SourceFamily {
  const normalized = source?.trim().toLowerCase();
  if (!normalized) return 'unknown';

  if (
    normalized === 'frontend' ||
    normalized === 'browser' ||
    normalized.includes('front') ||
    normalized.includes('browser') ||
    normalized.includes('web')
  ) {
    return 'frontend';
  }

  if (
    normalized === 'backend' ||
    normalized.includes('api') ||
    normalized.includes('server') ||
    normalized.includes('node') ||
    normalized.includes('backend')
  ) {
    return 'backend';
  }

  return 'unknown';
}

function getRouteValue(
  context: Record<string, unknown> | null,
  sampleContext: Record<string, unknown> | null,
  fingerprintRoute: string,
) {
  return (
    asDisplayString(context?.route) ??
    asDisplayString(context?.pathname) ??
    asDisplayString(context?.path) ??
    asDisplayString(sampleContext?.route) ??
    asDisplayString(sampleContext?.pathname) ??
    asDisplayString(sampleContext?.path) ??
    asDisplayString(fingerprintRoute)
  );
}

function getRouteLabel(sourceFamily: SourceFamily) {
  if (sourceFamily === 'frontend') return 'frontend route';
  if (sourceFamily === 'backend') return 'API route';
  return 'route';
}

function isSameRouteSignal(reason: string | null | undefined) {
  const normalized = normalizeText(reason);
  return (
    normalized.includes('same frontend route') ||
    normalized.includes('same api endpoint') ||
    normalized.includes('same api path') ||
    normalized.includes('same route')
  );
}

function isSameAreaSignal(reason: string | null | undefined) {
  return normalizeText(reason).includes('around ');
}

function formatPatternList(patterns: FixPatternDescriptor[]) {
  const labels = patterns.map((pattern) => pattern.label);
  if (labels.length === 0) return 'reusable defensive fixes';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels[0]}, ${labels[1]}, and ${labels[2]}`;
}

function extractFixPatterns(value: string | null | undefined) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  return FIX_PATTERNS.filter((pattern) =>
    pattern.keywords.some((keyword) => normalized.includes(keyword)),
  );
}

function buildSentenceAction(value: string | null | undefined) {
  const sentence = toSentence(value);
  if (!sentence) return null;

  return sentence
    .replace(/^Added\b/i, 'Add')
    .replace(/^Guarded\b/i, 'Guard')
    .replace(/^Initialized\b/i, 'Initialize')
    .replace(/^Validated\b/i, 'Validate')
    .replace(/^Wrapped\b/i, 'Wrap')
    .replace(/^Handled\b/i, 'Handle')
    .replace(/^Checked\b/i, 'Check')
    .replace(/^Used\b/i, 'Use')
    .replace(/^Introduced\b/i, 'Introduce')
    .replace(/^Updated\b/i, 'Update')
    .replace(/^Moved\b/i, 'Move')
    .replace(/^Fixed\b/i, 'Fix');
}

function computeConfidence(input: {
  resolvedSimilarCount: number;
  resolutionNotesUsed: number;
  strongestPatternCount: number;
  routeAlignedResolvedCount: number;
  areaAlignedResolvedCount: number;
  analysisAligned: boolean;
  preventionAligned: boolean;
}) {
  if (input.resolutionNotesUsed === 0) {
    return input.resolvedSimilarCount > 0 ? 'low' : 'low';
  }

  let score = 0;

  if (input.resolutionNotesUsed >= 2) {
    score += 2;
  } else {
    score += 1;
  }

  if (input.strongestPatternCount >= 2) {
    score += 1;
  }

  if (
    input.routeAlignedResolvedCount > 0 ||
    input.areaAlignedResolvedCount > 0
  ) {
    score += 1;
  }

  if (input.analysisAligned) {
    score += 1;
  }

  if (input.preventionAligned) {
    score += 1;
  }

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function buildRelatedFixReason(input: {
  item: SimilarIssueItem;
  matchingPatterns: FixPatternDescriptor[];
  sourceFamily: SourceFamily;
}) {
  const parts: string[] = [];
  const normalizedNote = toSentence(input.item.resolutionNote);

  if (normalizedNote) {
    if (input.matchingPatterns.length > 0) {
      parts.push(
        `Resolved issue with matching ${formatPatternList(
          input.matchingPatterns.slice(0, 2),
        )} pattern`,
      );
    } else {
      parts.push('Resolved issue with matching error pattern');
    }
  } else {
    parts.push(
      'Resolved similar issue with matching route or error pattern, but without a saved fix note',
    );
  }

  if (isSameRouteSignal(input.item.similarityReason)) {
    parts.push(`in the same ${getRouteLabel(input.sourceFamily)}`);
  } else if (isSameAreaSignal(input.item.similarityReason)) {
    parts.push('around the same code area');
  }

  return `${parts.join(' ')}.`;
}

@Injectable()
export class FixMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly similarIssues: SimilarIssuesService,
    private readonly preventionInsights: PreventionInsightsService,
  ) {}

  async getFixMemory(
    projectId: string,
    groupId: string,
  ): Promise<FixMemory | null> {
    const current = await this.prisma.errorGroup.findFirst({
      where: { id: groupId, projectId },
      select: {
        id: true,
        title: true,
        fingerprint: true,
        isRegression: true,
        regressionCount: true,
        lastRegressedAt: true,
        aiAnalysis: true,
        sample: true,
        events: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          select: {
            source: true,
            message: true,
            context: true,
            timestamp: true,
          },
        },
      },
    });

    if (!current) {
      return null;
    }

    const similarItems =
      (await this.similarIssues.findSimilarIssues(projectId, groupId)) ?? [];
    const prevention =
      await this.preventionInsights.getPreventionInsights(projectId, groupId);
    const analysis = normalizeStoredAiAnalysis(current.aiAnalysis).analysis;

    const latestEvent = current.events[0] ?? null;
    const sampleRecord = asRecord(current.sample);
    const sampleContext = asRecord(sampleRecord?.context);
    const eventContext = asRecord(latestEvent?.context);
    const fingerprintParts = splitFingerprint(current.fingerprint);
    const source =
      asDisplayString(latestEvent?.source) ??
      asDisplayString(sampleRecord?.source) ??
      asDisplayString(fingerprintParts.source);
    const sourceFamily = getSourceFamily(source);
    const route = getRouteValue(
      eventContext,
      sampleContext,
      fingerprintParts.route,
    );

    const resolvedSimilar = similarItems.filter(
      (item) => item.id !== groupId && item.status === 'resolved',
    );
    const resolvedWithNotes = resolvedSimilar.filter((item) =>
      Boolean(toSentence(item.resolutionNote)),
    );

    const patternCounts = new Map<FixPatternId, number>();
    const patternById = new Map<FixPatternId, FixPatternDescriptor>();

    for (const item of resolvedWithNotes) {
      const patterns = extractFixPatterns(item.resolutionNote);
      const uniquePatternIds = new Set(patterns.map((pattern) => pattern.id));

      for (const patternId of uniquePatternIds) {
        patternCounts.set(patternId, (patternCounts.get(patternId) ?? 0) + 1);
      }

      for (const pattern of patterns) {
        patternById.set(pattern.id, pattern);
      }
    }

    const rankedPatterns = [...patternCounts.entries()]
      .sort((left, right) => {
        const countDelta = right[1] - left[1];
        if (countDelta !== 0) return countDelta;
        return left[0].localeCompare(right[0]);
      })
      .map(([patternId, count]) => ({
        pattern: patternById.get(patternId)!,
        count,
      }));

    const topPatterns = rankedPatterns.slice(0, 2).map((entry) => entry.pattern);
    const strongestPatternCount = rankedPatterns[0]?.count ?? 0;
    const topPatternIds = new Set(topPatterns.map((pattern) => pattern.id));

    const analysisPatterns = [
      ...(extractFixPatterns(analysis?.suggestedFix ?? null) ?? []),
      ...(extractFixPatterns(analysis?.nextStep ?? null) ?? []),
      ...(extractFixPatterns(analysis?.preventionTip ?? null) ?? []),
    ];
    const preventionPatterns = prevention
      ? [
          ...extractFixPatterns(prevention.preventionTip),
          ...prevention.recommendedActions.flatMap((action) =>
            extractFixPatterns(action),
          ),
        ]
      : [];

    const analysisAligned = analysisPatterns.some((pattern) =>
      topPatternIds.has(pattern.id),
    );
    const preventionAligned = preventionPatterns.some((pattern) =>
      topPatternIds.has(pattern.id),
    );

    const routeAlignedResolvedCount = resolvedWithNotes.filter((item) =>
      isSameRouteSignal(item.similarityReason),
    ).length;
    const areaAlignedResolvedCount = resolvedWithNotes.filter((item) =>
      isSameAreaSignal(item.similarityReason),
    ).length;
    const regressionRelevant =
      current.isRegression ||
      current.regressionCount > 0 ||
      current.lastRegressedAt !== null ||
      prevention?.derivedFrom.regressionHistory === true ||
      resolvedSimilar.some((item) => item.isRegression);

    const confidence = computeConfidence({
      resolvedSimilarCount: resolvedSimilar.length,
      resolutionNotesUsed: resolvedWithNotes.length,
      strongestPatternCount,
      routeAlignedResolvedCount,
      areaAlignedResolvedCount,
      analysisAligned,
      preventionAligned,
    });

    const signals: string[] = [];
    const signalKeys = new Set<string>();

    if (resolvedWithNotes.length > 0) {
      pushUnique(
        signals,
        signalKeys,
        `${resolvedWithNotes.length} resolved similar ${pluralize(
          resolvedWithNotes.length,
          'issue with a resolution note was',
          'issues with resolution notes were',
        )} found`,
      );
    } else if (resolvedSimilar.length > 0) {
      pushUnique(
        signals,
        signalKeys,
        `${resolvedSimilar.length} resolved similar ${pluralize(
          resolvedSimilar.length,
          'issue was',
          'issues were',
        )} found, but saved fix notes are limited`,
      );
    }

    if (rankedPatterns.length > 0) {
      pushUnique(
        signals,
        signalKeys,
        `Past fixes repeatedly mention ${rankedPatterns[0].pattern.signalLabel}`,
      );
    }

    if (routeAlignedResolvedCount >= 2) {
      pushUnique(
        signals,
        signalKeys,
        `The same ${getRouteLabel(sourceFamily)} family appears in multiple resolved issues`,
      );
    } else if (routeAlignedResolvedCount === 1) {
      pushUnique(
        signals,
        signalKeys,
        `A resolved reference matches the same ${getRouteLabel(sourceFamily)}`,
      );
    } else if (areaAlignedResolvedCount > 0) {
      pushUnique(
        signals,
        signalKeys,
        'Resolved references also cluster around the same code area',
      );
    }

    if (analysisAligned) {
      pushUnique(
        signals,
        signalKeys,
        'Current AI guidance overlaps with the same reusable fix pattern',
      );
    }

    if (!analysisAligned && preventionAligned) {
      pushUnique(
        signals,
        signalKeys,
        'Prevention guidance points in the same reusable fix direction',
      );
    }

    if (regressionRelevant) {
      pushUnique(
        signals,
        signalKeys,
        'Regression history suggests tests or guardrails should be reused with the fix',
      );
    }

    const recommendedActions: string[] = [];
    const actionKeys = new Set<string>();

    for (const pattern of topPatterns) {
      pushUnique(recommendedActions, actionKeys, pattern.action);
    }

    if (resolvedWithNotes.length > 0) {
      pushUnique(
        recommendedActions,
        actionKeys,
        'Review the saved resolution notes from similar resolved issues before closing this issue',
      );
    }

    if (regressionRelevant) {
      pushUnique(
        recommendedActions,
        actionKeys,
        'Add a regression test for the affected route or handler',
      );
    }

    if (route && sourceFamily === 'frontend' && routeAlignedResolvedCount > 0) {
      pushUnique(
        recommendedActions,
        actionKeys,
        `Compare the current ${getRouteLabel(sourceFamily)} implementation with the resolved references before shipping`,
      );
    }

    if (recommendedActions.length === 0) {
      const fallbackPatterns = [
        ...analysisPatterns,
        ...preventionPatterns,
      ];

      for (const pattern of fallbackPatterns) {
        pushUnique(recommendedActions, actionKeys, pattern.action);
      }
    }

    if (recommendedActions.length === 0) {
      pushUnique(
        recommendedActions,
        actionKeys,
        buildSentenceAction(analysis?.suggestedFix ?? prevention?.preventionTip),
      );
    }

    const relatedFixSource =
      resolvedWithNotes.length > 0 ? resolvedWithNotes : resolvedSimilar;
    const relatedFixes = relatedFixSource
      .map((item) => {
        const matchingPatterns = extractFixPatterns(item.resolutionNote).filter(
          (pattern) => topPatternIds.has(pattern.id),
        );
        let utilityScore = item.score;

        if (item.resolutionNote) utilityScore += 0.15;
        if (matchingPatterns.length > 0) {
          utilityScore += 0.08 * matchingPatterns.length;
        }
        if (isSameRouteSignal(item.similarityReason)) utilityScore += 0.06;
        if (isSameAreaSignal(item.similarityReason)) utilityScore += 0.03;

        return {
          item,
          utilityScore,
          matchingPatterns,
        };
      })
      .sort((left, right) => {
        const scoreDelta = right.utilityScore - left.utilityScore;
        if (scoreDelta !== 0) return scoreDelta;
        return right.item.lastSeenAt.getTime() - left.item.lastSeenAt.getTime();
      })
      .slice(0, 3)
      .map(({ item, matchingPatterns }) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        resolutionNote: toSentence(item.resolutionNote),
        lastSeenAt: item.lastSeenAt,
        reason: buildRelatedFixReason({
          item,
          matchingPatterns,
          sourceFamily,
        }),
      }));

    const summary = this.buildSummary({
      resolvedSimilarCount: resolvedSimilar.length,
      resolutionNotesUsed: resolvedWithNotes.length,
      topPatterns,
      sourceFamily,
      route,
      analysisAligned,
      preventionAligned,
    });

    return {
      summary,
      confidence,
      signals: signals.slice(0, 4),
      recommendedActions: recommendedActions.slice(0, 4),
      relatedFixes,
      derivedFrom: {
        resolvedSimilarIssues: resolvedSimilar.length,
        resolutionNotesUsed: resolvedWithNotes.length,
        preventionInsightUsed: Boolean(prevention),
        currentAnalysisUsed: Boolean(analysis),
      },
    };
  }

  private buildSummary(input: {
    resolvedSimilarCount: number;
    resolutionNotesUsed: number;
    topPatterns: FixPatternDescriptor[];
    sourceFamily: SourceFamily;
    route: string | null;
    analysisAligned: boolean;
    preventionAligned: boolean;
  }) {
    if (input.resolutionNotesUsed === 0) {
      if (input.resolvedSimilarCount > 0) {
        return 'Resolved similar issues exist, but reusable fix memory is limited because saved resolution notes are sparse.';
      }

      return 'No reusable fix memory is available for this issue yet.';
    }

    const patternSummary = formatPatternList(input.topPatterns);

    const base =
      input.resolutionNotesUsed >= 2
        ? `Similar resolved issues were previously fixed with ${patternSummary}.`
        : `A resolved similar issue previously used ${patternSummary}.`;

    if (input.analysisAligned || input.preventionAligned) {
      return `${base} Current guidance points in the same fix direction.`;
    }

    if (input.route && input.sourceFamily !== 'unknown') {
      return `${base} The strongest references come from the same ${getRouteLabel(
        input.sourceFamily,
      )}.`;
    }

    return base;
  }
}
