import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeStoredAiAnalysis } from './ai-analysis';
import {
  SimilarIssueItem,
  SimilarIssuesService,
} from './similar-issues.service';

type SourceFamily = 'frontend' | 'backend' | 'unknown';

export type PreventionRepeatRisk = 'low' | 'medium' | 'high';

type PreventionErrorFamily =
  | 'null_access'
  | 'undefined_access'
  | 'promise_rejection'
  | 'config_missing'
  | 'network_failure'
  | 'rendering_guard_issue'
  | 'unknown';

type PreventionGroupRow = {
  id: string;
  title: string;
  fingerprint: string;
  resolutionNote: string | null;
  isRegression: boolean;
  regressionCount: number;
  lastRegressedAt: Date | null;
  aiAnalysis: Prisma.JsonValue | null;
  sample: Prisma.JsonValue | null;
  events: {
    source: string;
    message: string;
    context: Prisma.JsonValue | null;
    timestamp: Date;
  }[];
};

export interface PreventionInsights {
  preventionTip: string | null;
  repeatRisk: PreventionRepeatRisk;
  repeatSignals: string[];
  recommendedActions: string[];
  derivedFrom: {
    currentAnalysis: boolean;
    similarIssuesCount: number;
    regressionHistory: boolean;
    resolutionNotesUsed: number;
  };
}

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

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function detectErrorFamily(input: {
  title: string;
  message: string | null;
  sourceFamily: SourceFamily;
  route: string | null;
  likelyArea: string | null;
  rootCause: string | null;
}): PreventionErrorFamily {
  const text = normalizeText(
    [
      input.title,
      input.message,
      input.rootCause,
      input.likelyArea,
      input.route,
    ]
      .filter(Boolean)
      .join(' '),
  );

  if (
    text.includes('cannot read properties of null') ||
    text.includes('cannot read property') && text.includes(' of null') ||
    text.includes('null is not an object') ||
    text.includes("reading '") && text.includes('null')
  ) {
    return 'null_access';
  }

  if (
    text.includes('cannot read properties of undefined') ||
    text.includes('cannot read property') && text.includes(' of undefined') ||
    text.includes('undefined is not an object') ||
    text.includes("reading '") && text.includes('undefined')
  ) {
    return 'undefined_access';
  }

  if (
    text.includes('uncaught (in promise)') ||
    text.includes('unhandled promise rejection') ||
    text.includes('unhandledrejection') ||
    text.includes('promise rejection')
  ) {
    return 'promise_rejection';
  }

  if (
    text.includes('environment variable') ||
    text.includes('process.env') ||
    text.includes('missing env') ||
    text.includes('missing config') ||
    text.includes('missing configuration') ||
    text.includes('not configured') ||
    text.includes('api key missing')
  ) {
    return 'config_missing';
  }

  if (
    text.includes('network error') ||
    text.includes('fetch failed') ||
    text.includes('request failed') ||
    text.includes('econnrefused') ||
    text.includes('etimedout') ||
    /status 5\d\d/.test(text)
  ) {
    return 'network_failure';
  }

  if (
    input.sourceFamily === 'frontend' &&
    Boolean(input.route || input.likelyArea) &&
    (
      text.includes('render') ||
      text.includes('component') ||
      text.includes('hydration') ||
      text.includes('props') ||
      text.includes('state')
    )
  ) {
    return 'rendering_guard_issue';
  }

  return 'unknown';
}

function getErrorFamilyLabel(family: PreventionErrorFamily) {
  switch (family) {
    case 'null_access':
      return 'null-access';
    case 'undefined_access':
      return 'undefined-access';
    case 'promise_rejection':
      return 'unhandled promise rejection';
    case 'config_missing':
      return 'config or environment setup';
    case 'network_failure':
      return 'network/request';
    case 'rendering_guard_issue':
      return 'rendering guard';
    default:
      return 'repeat';
  }
}

function toSentence(value: string | null | undefined): string | null {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;

  const sentence = trimmed.replace(/[.!?\s]+$/g, '');
  if (!sentence) return null;

  return `${sentence[0].toUpperCase()}${sentence.slice(1)}.`;
}

function canonicalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function actionizeResolutionNote(note: string | null | undefined) {
  const sentence = toSentence(note);
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

function buildFallbackPreventionTip(
  family: PreventionErrorFamily,
  sourceFamily: SourceFamily,
  route: string | null,
) {
  switch (family) {
    case 'null_access':
      return 'Add null checks or optional chaining before property access.';
    case 'undefined_access':
      return 'Initialize values before use and add defensive rendering guards.';
    case 'promise_rejection':
      return 'Handle async failures with catch or try/catch before they escape.';
    case 'config_missing':
      return 'Validate required environment and config values at startup.';
    case 'network_failure':
      return 'Add request failure handling with safe user-facing fallbacks.';
    case 'rendering_guard_issue':
      return route && sourceFamily === 'frontend'
        ? `Add route-level defensive rendering guards for ${route}.`
        : 'Add defensive rendering guards for incomplete component state.';
    default:
      return null;
  }
}

function buildFamilyRecommendedAction(
  family: PreventionErrorFamily,
  sourceFamily: SourceFamily,
  route: string | null,
) {
  switch (family) {
    case 'null_access':
      return 'Check for nullable values before property access.';
    case 'undefined_access':
      return 'Initialize values before property access and guard empty state.';
    case 'promise_rejection':
      return 'Wrap async work in try/catch or add explicit promise rejection handling.';
    case 'config_missing':
      return 'Validate required env/config values during startup.';
    case 'network_failure':
      return 'Add request error handling and graceful retries where appropriate.';
    case 'rendering_guard_issue':
      return route && sourceFamily === 'frontend'
        ? 'Add route-level defensive rendering guards.'
        : 'Guard component rendering until required data is ready.';
    default:
      return null;
  }
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function isSameRouteSignal(reason: string | null | undefined) {
  const normalized = normalizeText(reason);
  return (
    normalized.includes('same frontend route') ||
    normalized.includes('same route') ||
    normalized.includes('same api endpoint') ||
    normalized.includes('same api path')
  );
}

function isSameAreaSignal(reason: string | null | undefined) {
  return normalizeText(reason).includes('around ');
}

function getRouteLabel(sourceFamily: SourceFamily) {
  if (sourceFamily === 'frontend') return 'frontend route';
  if (sourceFamily === 'backend') return 'API route';
  return 'route';
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

function computeRepeatRisk(input: {
  isRegression: boolean;
  regressionCount: number;
  similarIssuesCount: number;
  sameRouteCount: number;
  sameAreaCount: number;
  similarRegressionCount: number;
  resolutionNotesUsed: number;
}): PreventionRepeatRisk {
  let score = 0;

  if (input.isRegression) {
    score += 2;
  } else if (input.regressionCount > 0) {
    score += 1;
  }

  if (input.similarIssuesCount >= 3) {
    score += 2;
  } else if (input.similarIssuesCount > 0) {
    score += 1;
  }

  if (input.sameRouteCount > 0 || input.sameAreaCount > 0) {
    score += 1;
  }

  if (input.similarRegressionCount > 0) {
    score += 1;
  }

  if (input.resolutionNotesUsed > 0) {
    score += 1;
  }

  if (score >= 4) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

@Injectable()
export class PreventionInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly similarIssues: SimilarIssuesService,
  ) {}

  async getPreventionInsights(
    projectId: string,
    groupId: string,
  ): Promise<PreventionInsights | null> {
    const current = await this.prisma.errorGroup.findFirst({
      where: { id: groupId, projectId },
      select: {
        id: true,
        title: true,
        fingerprint: true,
        resolutionNote: true,
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

    const latestEvent = current.events[0] ?? null;
    const sampleRecord = asRecord(current.sample);
    const sampleContext = asRecord(sampleRecord?.context);
    const fingerprintParts = splitFingerprint(current.fingerprint);

    const source =
      asDisplayString(latestEvent?.source) ??
      asDisplayString(sampleRecord?.source) ??
      asDisplayString(fingerprintParts.source);
    const sourceFamily = getSourceFamily(source);
    const eventContext = asRecord(latestEvent?.context);
    const route = getRouteValue(
      eventContext,
      sampleContext,
      fingerprintParts.route,
    );

    const analysis = normalizeStoredAiAnalysis(current.aiAnalysis).analysis;
    const family = detectErrorFamily({
      title: current.title,
      message:
        asDisplayString(latestEvent?.message) ??
        asDisplayString(sampleRecord?.message),
      sourceFamily,
      route,
      likelyArea: analysis?.likelyArea ?? null,
      rootCause: analysis?.rootCause ?? null,
    });

    const similarItems =
      (await this.similarIssues.findSimilarIssues(projectId, groupId)) ?? [];
    const hasResolutionNotes = similarItems.some((item) =>
      Boolean(toSentence(item.resolutionNote)),
    );
    const sameRouteCount = similarItems.filter((item) =>
      isSameRouteSignal(item.similarityReason),
    ).length;
    const sameAreaCount = similarItems.filter((item) =>
      isSameAreaSignal(item.similarityReason),
    ).length;
    const similarRegressionCount = similarItems.filter(
      (item) => item.isRegression,
    ).length;

    const resolutionNoteActions = this.buildResolutionNoteActions(
      similarItems,
      analysis?.suggestedFix ?? null,
      analysis?.nextStep ?? null,
    );
    const resolutionNotesUsed = resolutionNoteActions.length;
    const regressionHistory =
      current.isRegression ||
      current.regressionCount > 0 ||
      current.lastRegressedAt !== null ||
      similarRegressionCount > 0;

    const preventionTip =
      toSentence(analysis?.preventionTip) ??
      buildFallbackPreventionTip(family, sourceFamily, route);

    const repeatSignals = this.buildRepeatSignals({
      similarIssuesCount: similarItems.length,
      sameRouteCount,
      sameAreaCount,
      sourceFamily,
      regressionHistory,
      currentIsRegression: current.isRegression,
      resolutionNotesUsed,
      family,
    });

    const recommendedActions = this.buildRecommendedActions({
      analysisSuggestedFix: analysis?.suggestedFix ?? null,
      analysisNextStep: analysis?.nextStep ?? null,
      preventionTip,
      hasResolutionNotes,
      family,
      sourceFamily,
      route,
      resolutionNoteActions,
    });

    return {
      preventionTip,
      repeatRisk: computeRepeatRisk({
        isRegression: current.isRegression,
        regressionCount: current.regressionCount,
        similarIssuesCount: similarItems.length,
        sameRouteCount,
        sameAreaCount,
        similarRegressionCount,
        resolutionNotesUsed,
      }),
      repeatSignals,
      recommendedActions,
      derivedFrom: {
        currentAnalysis: Boolean(analysis),
        similarIssuesCount: similarItems.length,
        regressionHistory,
        resolutionNotesUsed,
      },
    };
  }

  private buildResolutionNoteActions(
    similarItems: SimilarIssueItem[],
    analysisSuggestedFix: string | null,
    analysisNextStep: string | null,
  ) {
    const actions: string[] = [];
    const seen = new Set<string>();
    const skipKeys = new Set(
      [analysisSuggestedFix, analysisNextStep]
        .map((value) => toSentence(value))
        .filter((value): value is string => Boolean(value))
        .map(canonicalize),
    );

    for (const item of similarItems) {
      const action = actionizeResolutionNote(item.resolutionNote);
      if (!action) continue;

      const key = canonicalize(action);
      if (!key || seen.has(key) || skipKeys.has(key)) continue;

      seen.add(key);
      actions.push(action);

      if (actions.length >= 1) {
        break;
      }
    }

    return actions;
  }

  private buildRepeatSignals(input: {
    similarIssuesCount: number;
    sameRouteCount: number;
    sameAreaCount: number;
    sourceFamily: SourceFamily;
    regressionHistory: boolean;
    currentIsRegression: boolean;
    resolutionNotesUsed: number;
    family: PreventionErrorFamily;
  }) {
    const signals: string[] = [];
    const seen = new Set<string>();

    if (input.similarIssuesCount > 0) {
      if (input.sameRouteCount > 0) {
        pushUnique(
          signals,
          seen,
          `This issue has similarities with ${input.sameRouteCount} past ${pluralize(
            input.sameRouteCount,
            'issue',
            'issues',
          )} in the same ${getRouteLabel(input.sourceFamily)}`,
        );
      } else if (input.sameAreaCount > 0) {
        pushUnique(
          signals,
          seen,
          `This issue has similarities with ${input.sameAreaCount} past ${pluralize(
            input.sameAreaCount,
            'issue',
            'issues',
          )} around the same code area`,
        );
      } else {
        pushUnique(
          signals,
          seen,
          `This issue has similarities with ${input.similarIssuesCount} past ${pluralize(
            input.similarIssuesCount,
            'issue',
            'issues',
          )} in recent project history`,
        );
      }
    }

    if (input.resolutionNotesUsed > 0) {
      pushUnique(
        signals,
        seen,
        `${input.resolutionNotesUsed} resolved similar ${pluralize(
          input.resolutionNotesUsed,
          'issue includes',
          'issues include',
        )} a saved resolution note`,
      );
    }

    if (input.currentIsRegression) {
      pushUnique(
        signals,
        seen,
        'This issue belongs to a pattern that has regressed before',
      );
    } else if (input.regressionHistory) {
      pushUnique(
        signals,
        seen,
        'Related issues in this pattern have regressed before',
      );
    }

    if (input.family !== 'unknown' && input.similarIssuesCount > 0) {
      pushUnique(
        signals,
        seen,
        `This matches a recurring ${getErrorFamilyLabel(input.family)} pattern`,
      );
    }

    return signals.slice(0, 4);
  }

  private buildRecommendedActions(input: {
    analysisSuggestedFix: string | null;
    analysisNextStep: string | null;
    preventionTip: string | null;
    hasResolutionNotes: boolean;
    family: PreventionErrorFamily;
    sourceFamily: SourceFamily;
    route: string | null;
    resolutionNoteActions: string[];
  }) {
    const actions: string[] = [];
    const seen = new Set<string>();

    pushUnique(actions, seen, input.analysisSuggestedFix);
    pushUnique(actions, seen, input.analysisNextStep);
    pushUnique(
      actions,
      seen,
      buildFamilyRecommendedAction(
        input.family,
        input.sourceFamily,
        input.route,
      ),
    );

    for (const action of input.resolutionNoteActions) {
      pushUnique(actions, seen, action);
    }

    if (input.hasResolutionNotes) {
      pushUnique(
        actions,
        seen,
        'Review similar resolved issue notes before shipping the fix',
      );
    }

    if (
      input.sourceFamily === 'frontend' &&
      input.route &&
      (input.family === 'null_access' ||
        input.family === 'undefined_access' ||
        input.family === 'rendering_guard_issue')
    ) {
      pushUnique(actions, seen, 'Add route-level defensive rendering guards');
    }

    if (actions.length === 0) {
      pushUnique(actions, seen, input.preventionTip);
    }

    return actions.slice(0, 4);
  }
}
