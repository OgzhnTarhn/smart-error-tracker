import { type Schema, Type } from '@google/genai';
import { Prisma } from '@prisma/client';

export const ANALYSIS_SEVERITY_VALUES = [
  'low',
  'medium',
  'high',
  'critical',
] as const;
export type AnalysisSeverity = (typeof ANALYSIS_SEVERITY_VALUES)[number];

export const ANALYSIS_CONFIDENCE_VALUES = ['low', 'medium', 'high'] as const;
export type AnalysisConfidence = (typeof ANALYSIS_CONFIDENCE_VALUES)[number];

export interface StructuredAiAnalysis {
  rootCause: string | null;
  suggestedFix: string | null;
  likelyArea: string | null;
  nextStep: string | null;
  preventionTip: string | null;
  severity: AnalysisSeverity | null;
  confidence: AnalysisConfidence | null;
  summary?: string | null;
}

export interface StoredAiAnalysis extends StructuredAiAnalysis {
  eventId?: string | null;
}

const STRUCTURED_ANALYSIS_KEYS = [
  'rootCause',
  'suggestedFix',
  'likelyArea',
  'nextStep',
  'preventionTip',
  'severity',
  'confidence',
  'summary',
] as const satisfies readonly (keyof StructuredAiAnalysis)[];

const FIELD_ALIASES: Record<(typeof STRUCTURED_ANALYSIS_KEYS)[number], string[]> =
  {
    rootCause: ['rootCause', 'cause', 'diagnosis'],
    suggestedFix: ['suggestedFix', 'fix', 'fixSuggestion', 'recommendation'],
    likelyArea: ['likelyArea', 'area', 'location', 'component'],
    nextStep: ['nextStep', 'nextAction', 'debugStep'],
    preventionTip: ['preventionTip', 'prevention', 'futureGuardrail'],
    severity: ['severity', 'impact'],
    confidence: ['confidence', 'certainty'],
    summary: ['summary', 'overview', 'analysis', 'details'],
  };

const SECTION_LABEL_TO_KEY: Record<string, keyof StructuredAiAnalysis> = {
  'root cause': 'rootCause',
  'suggested fix': 'suggestedFix',
  'likely area': 'likelyArea',
  'next step': 'nextStep',
  'prevention tip': 'preventionTip',
  severity: 'severity',
  confidence: 'confidence',
  summary: 'summary',
};

const SECTION_LABEL_PATTERN = Object.keys(SECTION_LABEL_TO_KEY)
  .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

export const STRUCTURED_AI_ANALYSIS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  propertyOrdering: [
    'rootCause',
    'suggestedFix',
    'likelyArea',
    'nextStep',
    'preventionTip',
    'severity',
    'confidence',
    'summary',
  ],
  required: [
    'rootCause',
    'suggestedFix',
    'likelyArea',
    'nextStep',
    'preventionTip',
    'severity',
    'confidence',
  ],
  properties: {
    rootCause: {
      type: Type.STRING,
      nullable: true,
      description: 'Concise reason the error most likely happened.',
    },
    suggestedFix: {
      type: Type.STRING,
      nullable: true,
      description: 'Short debugging-oriented fix idea to try next.',
    },
    likelyArea: {
      type: Type.STRING,
      nullable: true,
      description: 'File, subsystem, or code area most worth inspecting.',
    },
    nextStep: {
      type: Type.STRING,
      nullable: true,
      description: 'Single best next debugging action.',
    },
    preventionTip: {
      type: Type.STRING,
      nullable: true,
      description: 'Brief prevention idea to reduce repeat failures.',
    },
    severity: {
      type: Type.STRING,
      nullable: true,
      enum: [...ANALYSIS_SEVERITY_VALUES],
      description: 'Estimated impact level of this event.',
    },
    confidence: {
      type: Type.STRING,
      nullable: true,
      enum: [...ANALYSIS_CONFIDENCE_VALUES],
      description: 'Confidence in the diagnosis.',
    },
    summary: {
      type: Type.STRING,
      nullable: true,
      description: 'Optional one-line summary when useful.',
    },
  },
};

export function createEmptyStructuredAiAnalysis(): StructuredAiAnalysis {
  return {
    rootCause: null,
    suggestedFix: null,
    likelyArea: null,
    nextStep: null,
    preventionTip: null,
    severity: null,
    confidence: null,
    summary: null,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function canonicalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getValueByAlias(
  value: Record<string, unknown>,
  aliases: string[],
): unknown {
  const aliasedKeys = new Set(aliases.map(canonicalizeKey));

  for (const [key, entry] of Object.entries(value)) {
    if (aliasedKeys.has(canonicalizeKey(key))) {
      return entry;
    }
  }

  return undefined;
}

function normalizeEnumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized)
    ? (normalized as T[number])
    : null;
}

function stripMarkdownCodeFence(rawText: string) {
  return rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function tryParseJsonObject(rawText: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(rawText);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function tryParseEmbeddedJsonObject(
  rawText: string,
): Record<string, unknown> | null {
  const start = rawText.indexOf('{');
  const end = rawText.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return tryParseJsonObject(rawText.slice(start, end + 1));
}

function parseLabeledSections(rawText: string): Record<string, unknown> | null {
  const regex = new RegExp(
    String.raw`(?:^|\n)\s*(?:[-*]\s*)?(${SECTION_LABEL_PATTERN})\s*:\s*([\s\S]*?)(?=\n\s*(?:[-*]\s*)?(?:${SECTION_LABEL_PATTERN})\s*:|$)`,
    'gi',
  );

  const result: Record<string, unknown> = {};

  for (const match of rawText.matchAll(regex)) {
    const label = match[1]?.trim().toLowerCase();
    const value = match[2]?.trim();
    if (!label || !value) continue;

    const key = SECTION_LABEL_TO_KEY[label];
    if (!key) continue;

    result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function hasStructuredAnalysisContent(
  analysis: StructuredAiAnalysis | null | undefined,
) {
  if (!analysis) return false;

  return Boolean(
    analysis.rootCause ||
      analysis.suggestedFix ||
      analysis.likelyArea ||
      analysis.nextStep ||
      analysis.preventionTip ||
      analysis.severity ||
      analysis.confidence ||
      analysis.summary,
  );
}

export function normalizeStructuredAiAnalysis(
  value: unknown,
): StructuredAiAnalysis | null {
  const record = asRecord(value);
  if (!record) return null;

  const normalized: StructuredAiAnalysis = {
    rootCause: asNonEmptyString(
      getValueByAlias(record, FIELD_ALIASES.rootCause),
    ),
    suggestedFix: asNonEmptyString(
      getValueByAlias(record, FIELD_ALIASES.suggestedFix),
    ),
    likelyArea: asNonEmptyString(
      getValueByAlias(record, FIELD_ALIASES.likelyArea),
    ),
    nextStep: asNonEmptyString(getValueByAlias(record, FIELD_ALIASES.nextStep)),
    preventionTip: asNonEmptyString(
      getValueByAlias(record, FIELD_ALIASES.preventionTip),
    ),
    severity: normalizeEnumValue(
      getValueByAlias(record, FIELD_ALIASES.severity),
      ANALYSIS_SEVERITY_VALUES,
    ),
    confidence: normalizeEnumValue(
      getValueByAlias(record, FIELD_ALIASES.confidence),
      ANALYSIS_CONFIDENCE_VALUES,
    ),
    summary: asNonEmptyString(getValueByAlias(record, FIELD_ALIASES.summary)),
  };

  return hasStructuredAnalysisContent(normalized) ? normalized : null;
}

export function parseStructuredAiAnalysisResponse(
  rawText: string | null | undefined,
): StructuredAiAnalysis | null {
  const trimmedText = asNonEmptyString(rawText);
  if (!trimmedText) return null;

  const cleanedText = stripMarkdownCodeFence(trimmedText);
  const parsedCandidates = [
    tryParseJsonObject(cleanedText),
    tryParseEmbeddedJsonObject(cleanedText),
    parseLabeledSections(cleanedText),
  ];

  for (const candidate of parsedCandidates) {
    const normalized = normalizeStructuredAiAnalysis(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return {
    ...createEmptyStructuredAiAnalysis(),
    summary: cleanedText,
  };
}

export function normalizeStoredAiAnalysis(
  value: Prisma.JsonValue | null | undefined,
): { eventId: string | null; analysis: StructuredAiAnalysis | null } {
  const record = asRecord(value);
  if (!record) {
    return { eventId: null, analysis: null };
  }

  return {
    eventId: asNonEmptyString(record.eventId),
    analysis: normalizeStructuredAiAnalysis(record),
  };
}

export function serializeStoredAiAnalysis(
  eventId: string,
  analysis: StructuredAiAnalysis | null,
): Prisma.InputJsonValue | undefined {
  if (!analysis || !hasStructuredAnalysisContent(analysis)) {
    return undefined;
  }

  const storedAnalysis: Prisma.InputJsonObject = {
    eventId,
    rootCause: analysis.rootCause,
    suggestedFix: analysis.suggestedFix,
    likelyArea: analysis.likelyArea,
    nextStep: analysis.nextStep,
    preventionTip: analysis.preventionTip,
    severity: analysis.severity,
    confidence: analysis.confidence,
    summary: analysis.summary ?? null,
  };

  return storedAnalysis;
}
