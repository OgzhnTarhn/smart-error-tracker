import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeStoredAiAnalysis } from './ai-analysis';

const DEFAULT_LIMIT = 5;
const CANDIDATE_POOL_MULTIPLIER = 24;
const MAX_CANDIDATE_POOL = 160;
const MIN_SIMILARITY_SCORE = 0.26;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'been',
  'before',
  'but',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'with',
]);

type SourceFamily = 'frontend' | 'backend' | 'unknown';
type RouteValueType = 'route' | 'endpoint' | 'path' | 'url';

type LatestEventRow = {
  source: string;
  message: string;
  context: Prisma.JsonValue | null;
  timestamp: Date;
};

type SimilarityGroupRow = {
  id: string;
  fingerprint: string;
  title: string;
  status: string;
  resolutionNote: string | null;
  isRegression: boolean;
  lastSeenAt: Date;
  aiAnalysis: Prisma.JsonValue | null;
  sample: Prisma.JsonValue | null;
  events: LatestEventRow[];
};

type ErrorFamily =
  | 'null_access'
  | 'undefined_access'
  | 'array_on_undefined'
  | 'promise_rejection'
  | 'config_missing'
  | 'network_failure';

type RouteDescriptor = {
  raw: string;
  normalized: string;
  segments: string[];
  type: RouteValueType;
};

type PathDescriptor = {
  raw: string;
  normalized: string;
  segments: string[];
  basename: string | null;
};

type GroupSignals = {
  id: string;
  title: string;
  status: string;
  resolutionNote: string | null;
  isRegression: boolean;
  lastSeenAt: Date;
  source: string | null;
  sourceFamily: SourceFamily;
  route: RouteDescriptor | null;
  likelyArea: string | null;
  likelyAreaPath: PathDescriptor | null;
  errorFamily: ErrorFamily | null;
  normalizedText: string;
  textTokens: Set<string>;
  fingerprintMessageText: string;
  fingerprintMessageTokens: Set<string>;
  fingerprintFrameText: string;
  fingerprintFramePath: PathDescriptor | null;
};

type SimilarityBreakdown = {
  titlePattern: number;
  fingerprintPattern: number;
  routeSimilarity: number;
  likelyAreaSimilarity: number;
  sourceSimilarity: number;
  errorFamilyMatch: boolean;
  resolutionPreference: number;
};

export interface SimilarIssueItem {
  id: string;
  title: string;
  status: string;
  similarityReason: string;
  resolutionNote: string | null;
  lastSeenAt: Date;
  isRegression: boolean;
  score: number;
}

function asRecord(
  value: unknown,
): Record<string, unknown> | null {
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

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/\b[0-9]+\b/g, ' <n> ')
    .replace(/\b[0-9a-f]{8,}\b/gi, ' <hex> ')
    .replace(/\b[0-9a-f-]{32,}\b/gi, ' <id> ')
    .replace(/[`"'()[\]{}]/g, ' ')
    .replace(/[^a-z0-9<>/:._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTokenSet(value: string | null | undefined) {
  return new Set(
    normalizeText(value)
      .split(' ')
      .map((token) => token.trim())
      .filter(
        (token) => token.length >= 3 && !STOP_WORDS.has(token),
      ),
  );
}

function splitFingerprint(fingerprint: string) {
  const parts = fingerprint.split('|');
  return {
    source: parts[0]?.trim() || '',
    route: parts[1]?.trim() || '',
    message: parts[2]?.trim() || '',
    frame: parts.slice(3).join('|').trim(),
  };
}

function normalizePathSegment(segment: string) {
  return segment
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/:\w+/g, ':param')
    .replace(/\b[0-9]+\b/g, '<n>')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<hex>')
    .replace(/\b[0-9a-f-]{32,}\b/gi, '<id>')
    .trim();
}

function buildPathDescriptor(value: string | null | undefined): PathDescriptor | null {
  const label = asDisplayString(value);
  if (!label) return null;

  const normalized = label.replace(/\\/g, '/').replace(/\/+/g, '/').trim();
  if (!normalized) return null;

  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(normalizePathSegment);
  const basename = segments.at(-1) ?? null;

  return {
    raw: label,
    normalized: normalized.toLowerCase(),
    segments,
    basename,
  };
}

function extractPathFromUrl(value: unknown): string | null {
  const label = asDisplayString(value);
  if (!label) return null;

  try {
    const parsedUrl = new URL(label, 'http://local.smart-error-tracker');
    const pathname = parsedUrl.pathname.trim();
    return pathname || '/';
  } catch {
    const pathname = label.split(/[?#]/, 1)[0]?.trim();
    return pathname || null;
  }
}

function isFrontendSource(source: string | null | undefined) {
  const normalized = source?.trim().toLowerCase();
  if (!normalized) return false;

  return (
    normalized === 'frontend' ||
    normalized === 'browser' ||
    normalized.includes('front') ||
    normalized.includes('browser') ||
    normalized.includes('web')
  );
}

function getSourceFamily(source: string | null | undefined): SourceFamily {
  const normalized = source?.trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (isFrontendSource(normalized)) return 'frontend';

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

function buildRouteDescriptor(
  value: string,
  type: RouteValueType,
): RouteDescriptor | null {
  const label = type === 'url' ? extractPathFromUrl(value) : asDisplayString(value);
  if (!label) return null;

  const normalized = label
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
  const segments = normalized
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map(normalizePathSegment);

  return {
    raw: label,
    normalized: normalized.toLowerCase(),
    segments,
    type,
  };
}

function extractRouteDescriptor(
  source: string | null,
  eventContext: Record<string, unknown> | null,
  sampleContext: Record<string, unknown> | null,
  fallbackRoute: string,
): RouteDescriptor | null {
  const preferredKeys = isFrontendSource(source)
    ? (['route', 'path', 'url'] as const)
    : (['endpoint', 'path', 'route', 'url'] as const);

  for (const context of [eventContext, sampleContext]) {
    const requestContext = asRecord(context?.request);

    for (const key of preferredKeys) {
      const directValue = context?.[key];
      const nestedValue = requestContext?.[key];
      const candidateValue = key === 'url'
        ? extractPathFromUrl(directValue) ?? extractPathFromUrl(nestedValue)
        : asDisplayString(directValue) ?? asDisplayString(nestedValue);

      if (candidateValue) {
        return buildRouteDescriptor(candidateValue, key);
      }
    }
  }

  if (fallbackRoute) {
    return buildRouteDescriptor(
      fallbackRoute,
      isFrontendSource(source) ? 'route' : 'endpoint',
    );
  }

  return null;
}

function getErrorFamily(text: string): ErrorFamily | null {
  if (
    /cannot read (?:properties|property) of null/i.test(text) ||
    /cannot destructure .* of null/i.test(text) ||
    /null is not an object/i.test(text)
  ) {
    return 'null_access';
  }

  if (
    /cannot read (?:properties|property) of undefined/i.test(text) ||
    /cannot destructure .* of undefined/i.test(text) ||
    /undefined is not an object/i.test(text)
  ) {
    return 'undefined_access';
  }

  if (
    /reading ['"`]?(?:map|filter|reduce|foreach|find|some|every)['"`]?/i.test(
      text,
    ) ||
    /\b(?:map|filter|reduce|foreach|find|some|every)\b.*undefined/i.test(text)
  ) {
    return 'array_on_undefined';
  }

  if (
    /unhandled promise rejection/i.test(text) ||
    /uncaught \(in promise\)/i.test(text) ||
    /promise rejection/i.test(text)
  ) {
    return 'promise_rejection';
  }

  if (
    /\b(missing|required)\b.*\b(env|environment|config|configuration|api key|token)\b/i.test(
      text,
    ) ||
    /\b(env|environment|config|configuration)\b.*\b(missing|undefined|not set|not configured)\b/i.test(
      text,
    )
  ) {
    return 'config_missing';
  }

  if (
    /failed to fetch/i.test(text) ||
    /network ?error/i.test(text) ||
    /network request failed/i.test(text) ||
    /request failed/i.test(text) ||
    /\b(?:econnreset|econnrefused|etimedout|timeout)\b/i.test(text)
  ) {
    return 'network_failure';
  }

  return null;
}

function getErrorFamilyLabel(family: ErrorFamily) {
  switch (family) {
    case 'null_access':
      return 'null-access error';
    case 'undefined_access':
      return 'undefined-access error';
    case 'array_on_undefined':
      return 'array-method on undefined';
    case 'promise_rejection':
      return 'unhandled promise rejection';
    case 'config_missing':
      return 'config or env issue';
    case 'network_failure':
      return 'network or request failure';
  }
}

function countSharedTokens(a: Set<string>, b: Set<string>) {
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }
  return shared;
}

function computeTokenOverlap(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;

  const shared = countSharedTokens(a, b);
  if (shared === 0) return 0;

  return shared / Math.max(a.size, b.size);
}

function computeTextSimilarity(
  leftText: string,
  leftTokens: Set<string>,
  rightText: string,
  rightTokens: Set<string>,
) {
  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 1;

  let score = computeTokenOverlap(leftTokens, rightTokens);
  if (
    (leftText.includes(rightText) || rightText.includes(leftText)) &&
    Math.min(leftText.length, rightText.length) >= 18
  ) {
    score = Math.max(score, 0.85);
  }

  return score;
}

function computeSharedPrefixScore(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;

  let shared = 0;
  const limit = Math.min(left.length, right.length);
  while (shared < limit && left[shared] === right[shared]) {
    shared += 1;
  }

  return shared / Math.max(left.length, right.length);
}

function computeSharedSuffix(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) return 0;

  let shared = 0;
  const leftCopy = [...left];
  const rightCopy = [...right];

  while (
    shared < leftCopy.length &&
    shared < rightCopy.length &&
    leftCopy[leftCopy.length - 1 - shared] ===
      rightCopy[rightCopy.length - 1 - shared]
  ) {
    shared += 1;
  }

  return shared;
}

function computeRouteSimilarity(
  currentRoute: RouteDescriptor | null,
  candidateRoute: RouteDescriptor | null,
) {
  if (!currentRoute || !candidateRoute) return 0;
  if (currentRoute.normalized === candidateRoute.normalized) return 1;

  return computeSharedPrefixScore(currentRoute.segments, candidateRoute.segments);
}

function computeLikelyAreaSimilarity(
  currentPath: PathDescriptor | null,
  candidatePath: PathDescriptor | null,
) {
  if (!currentPath || !candidatePath) return 0;
  if (currentPath.normalized === candidatePath.normalized) return 1;
  if (
    currentPath.basename &&
    candidatePath.basename &&
    currentPath.basename === candidatePath.basename
  ) {
    return 0.78;
  }

  const sharedSuffix = computeSharedSuffix(
    currentPath.segments,
    candidatePath.segments,
  );
  if (sharedSuffix === 0) return 0;

  return sharedSuffix / Math.min(currentPath.segments.length, candidatePath.segments.length);
}

function computeFingerprintSimilarity(
  current: GroupSignals,
  candidate: GroupSignals,
) {
  const messageSimilarity = computeTextSimilarity(
    normalizeText(current.fingerprintMessageText),
    current.fingerprintMessageTokens,
    normalizeText(candidate.fingerprintMessageText),
    candidate.fingerprintMessageTokens,
  );
  const frameSimilarity = computeLikelyAreaSimilarity(
    current.fingerprintFramePath,
    candidate.fingerprintFramePath,
  );

  return Math.max(messageSimilarity, frameSimilarity);
}

function computeSourceSimilarity(
  currentSource: string | null,
  currentFamily: SourceFamily,
  candidateSource: string | null,
  candidateFamily: SourceFamily,
) {
  if (currentSource && candidateSource) {
    if (currentSource.toLowerCase() === candidateSource.toLowerCase()) {
      return 1;
    }
  }

  if (
    currentFamily !== 'unknown' &&
    currentFamily === candidateFamily
  ) {
    return 0.6;
  }

  return 0;
}

function getResolutionPreference(status: string, resolutionNote: string | null) {
  if (status === 'resolved' && resolutionNote) return 1;
  if (status === 'resolved') return 0.4;
  return 0;
}

function roundScore(value: number) {
  return Number(value.toFixed(2));
}

function shortenPath(value: string | null | undefined) {
  const label = asDisplayString(value);
  if (!label) return null;

  const segments = label.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.length <= 2) return label;
  return segments.slice(-2).join('/');
}

function getRouteLabel(route: RouteDescriptor | null, sourceFamily: SourceFamily) {
  if (!route) return 'route';
  if (route.type === 'endpoint') return 'API endpoint';
  if (route.type === 'path') return sourceFamily === 'backend' ? 'API path' : 'path';
  if (route.type === 'url') return sourceFamily === 'backend' ? 'API path' : 'route';
  return sourceFamily === 'frontend' ? 'frontend route' : 'route';
}

function buildSimilarityReason(
  candidate: GroupSignals,
  breakdown: SimilarityBreakdown,
) {
  const familyLabel = candidate.errorFamily
    ? getErrorFamilyLabel(candidate.errorFamily)
    : 'issue';
  const routeLabel = getRouteLabel(candidate.route, candidate.sourceFamily);
  const shortLikelyArea = shortenPath(candidate.likelyArea);

  if (breakdown.routeSimilarity >= 0.95 && breakdown.errorFamilyMatch) {
    return `Similar ${familyLabel} on the same ${routeLabel}`;
  }

  if (
    breakdown.likelyAreaSimilarity >= 0.75 &&
    breakdown.errorFamilyMatch &&
    shortLikelyArea
  ) {
    return `Similar ${familyLabel} around ${shortLikelyArea}`;
  }

  if (breakdown.routeSimilarity >= 0.95) {
    return `Similar issue on the same ${routeLabel}`;
  }

  if (breakdown.likelyAreaSimilarity >= 0.75 && shortLikelyArea) {
    return `Similar issue around ${shortLikelyArea}`;
  }

  if (breakdown.titlePattern >= 0.6 && breakdown.sourceSimilarity >= 0.95) {
    return `Matching ${candidate.sourceFamily} error pattern`;
  }

  if (breakdown.errorFamilyMatch) {
    return `Similar ${familyLabel}`;
  }

  if (breakdown.titlePattern >= 0.45) {
    return 'Matching error message pattern';
  }

  if (breakdown.sourceSimilarity >= 0.95) {
    return 'Related issue from the same source';
  }

  return 'Related issue with overlapping error signals';
}

function buildGroupSignals(row: SimilarityGroupRow): GroupSignals {
  const latestEvent = row.events[0] ?? null;
  const sampleRecord = asRecord(row.sample);
  const sampleContext = asRecord(sampleRecord?.context);
  const eventContext = asRecord(latestEvent?.context);
  const fingerprintParts = splitFingerprint(row.fingerprint);

  const source =
    asDisplayString(latestEvent?.source) ??
    asDisplayString(sampleRecord?.source) ??
    asDisplayString(fingerprintParts.source);
  const sourceFamily = getSourceFamily(source);
  const route = extractRouteDescriptor(
    source,
    eventContext,
    sampleContext,
    fingerprintParts.route,
  );
  const latestMessage =
    asDisplayString(latestEvent?.message) ??
    asDisplayString(sampleRecord?.message);
  const likelyArea =
    normalizeStoredAiAnalysis(row.aiAnalysis).analysis?.likelyArea ?? null;

  const combinedText = [row.title, latestMessage].filter(Boolean).join(' ');

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    resolutionNote: row.resolutionNote,
    isRegression: row.isRegression,
    lastSeenAt: row.lastSeenAt,
    source,
    sourceFamily,
    route,
    likelyArea,
    likelyAreaPath: buildPathDescriptor(likelyArea),
    errorFamily: getErrorFamily(combinedText),
    normalizedText: normalizeText(combinedText),
    textTokens: toTokenSet(combinedText),
    fingerprintMessageText: fingerprintParts.message || row.title,
    fingerprintMessageTokens: toTokenSet(fingerprintParts.message || row.title),
    fingerprintFrameText: fingerprintParts.frame,
    fingerprintFramePath: buildPathDescriptor(fingerprintParts.frame),
  };
}

function computeBreakdown(
  current: GroupSignals,
  candidate: GroupSignals,
): SimilarityBreakdown {
  return {
    titlePattern: computeTextSimilarity(
      current.normalizedText,
      current.textTokens,
      candidate.normalizedText,
      candidate.textTokens,
    ),
    fingerprintPattern: computeFingerprintSimilarity(current, candidate),
    routeSimilarity: computeRouteSimilarity(current.route, candidate.route),
    likelyAreaSimilarity: computeLikelyAreaSimilarity(
      current.likelyAreaPath,
      candidate.likelyAreaPath,
    ),
    sourceSimilarity: computeSourceSimilarity(
      current.source,
      current.sourceFamily,
      candidate.source,
      candidate.sourceFamily,
    ),
    errorFamilyMatch:
      Boolean(current.errorFamily) &&
      current.errorFamily === candidate.errorFamily,
    resolutionPreference: getResolutionPreference(
      candidate.status,
      candidate.resolutionNote,
    ),
  };
}

function computeSimilarityScore(breakdown: SimilarityBreakdown) {
  const score =
    breakdown.titlePattern * 0.34 +
    breakdown.fingerprintPattern * 0.12 +
    breakdown.routeSimilarity * 0.16 +
    breakdown.likelyAreaSimilarity * 0.14 +
    (breakdown.errorFamilyMatch ? 0.14 : 0) +
    breakdown.sourceSimilarity * 0.08 +
    breakdown.resolutionPreference * 0.08;

  return Math.min(score, 1);
}

@Injectable()
export class SimilarIssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findSimilarIssues(
    projectId: string,
    groupId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<SimilarIssueItem[] | null> {
    const take = Math.min(
      Math.max(limit * CANDIDATE_POOL_MULTIPLIER, 100),
      MAX_CANDIDATE_POOL,
    );
    const select = {
      id: true,
      fingerprint: true,
      title: true,
      status: true,
      resolutionNote: true,
      isRegression: true,
      lastSeenAt: true,
      aiAnalysis: true,
      sample: true,
      events: {
        take: 1,
        orderBy: { timestamp: 'desc' as const },
        select: {
          source: true,
          message: true,
          context: true,
          timestamp: true,
        },
      },
    } as const;

    const current = await this.prisma.errorGroup.findFirst({
      where: { id: groupId, projectId },
      select,
    });

    if (!current) {
      return null;
    }

    const candidates = await this.prisma.errorGroup.findMany({
      where: {
        projectId,
        id: { not: groupId },
      },
      orderBy: { lastSeenAt: 'desc' },
      take,
      select,
    });

    const currentSignals = buildGroupSignals(current);
    const ranked = candidates
      .filter((candidate) => candidate.id !== current.id)
      .map((candidate) => {
        const candidateSignals = buildGroupSignals(candidate);
        const breakdown = computeBreakdown(currentSignals, candidateSignals);
        const score = computeSimilarityScore(breakdown);

        return {
          id: candidate.id,
          title: candidate.title,
          status: candidate.status,
          similarityReason: buildSimilarityReason(candidateSignals, breakdown),
          resolutionNote: candidate.resolutionNote,
          lastSeenAt: candidate.lastSeenAt,
          isRegression: candidate.isRegression,
          score: roundScore(score),
        };
      })
      .filter((item) => item.score >= MIN_SIMILARITY_SCORE)
      .sort((left, right) => {
        const scoreDelta = right.score - left.score;
        if (scoreDelta !== 0) return scoreDelta;

        const timeDelta =
          right.lastSeenAt.getTime() - left.lastSeenAt.getTime();
        if (timeDelta !== 0) return timeDelta;

        return left.id.localeCompare(right.id);
      });

    return ranked.slice(0, limit);
  }
}
