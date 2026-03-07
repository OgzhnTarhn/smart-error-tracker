import {
  createEmptyStructuredAiAnalysis,
  normalizeStoredAiAnalysis,
  normalizeStructuredAiAnalysis,
  parseStructuredAiAnalysisResponse,
  serializeStoredAiAnalysis,
} from './ai-analysis';

describe('ai-analysis helpers', () => {
  it('normalizes structured analysis objects and legacy fields', () => {
    expect(
      normalizeStructuredAiAnalysis({
        root_cause: 'Null route object',
        fixSuggestion: 'Guard against missing route data.',
        likelyArea: 'apps/web/src/router.ts',
        nextAction: 'Inspect route loader output.',
        prevention: 'Add a smoke test for missing route params.',
        severity: 'HIGH',
        certainty: 'medium',
      }),
    ).toEqual({
      rootCause: 'Null route object',
      suggestedFix: 'Guard against missing route data.',
      likelyArea: 'apps/web/src/router.ts',
      nextStep: 'Inspect route loader output.',
      preventionTip: 'Add a smoke test for missing route params.',
      severity: 'high',
      confidence: 'medium',
      summary: null,
    });
  });

  it('parses fenced JSON responses into structured analysis', () => {
    expect(
      parseStructuredAiAnalysisResponse(`\`\`\`json
{
  "rootCause": "A missing tenant id reaches the query layer.",
  "suggestedFix": "Validate tenant id before building the query.",
  "likelyArea": "apps/api/src/projects/projects.service.ts",
  "nextStep": "Log the tenant id right before the failing query.",
  "preventionTip": "Add request validation for tenant-scoped routes.",
  "severity": "high",
  "confidence": "high"
}
\`\`\``),
    ).toEqual({
      rootCause: 'A missing tenant id reaches the query layer.',
      suggestedFix: 'Validate tenant id before building the query.',
      likelyArea: 'apps/api/src/projects/projects.service.ts',
      nextStep: 'Log the tenant id right before the failing query.',
      preventionTip: 'Add request validation for tenant-scoped routes.',
      severity: 'high',
      confidence: 'high',
      summary: null,
    });
  });

  it('parses labeled fallback text when JSON parsing fails', () => {
    expect(
      parseStructuredAiAnalysisResponse(`
Root Cause: Query params are undefined during the first render.
Suggested Fix: Gate the request until the router state is ready.
Likely Area: apps/web/src/pages/Dashboard.tsx
Next Step: Inspect the component branch that reads router.query.
Prevention Tip: Add a loading-state branch before firing the fetch.
Severity: medium
Confidence: low
      `),
    ).toEqual({
      rootCause: 'Query params are undefined during the first render.',
      suggestedFix: 'Gate the request until the router state is ready.',
      likelyArea: 'apps/web/src/pages/Dashboard.tsx',
      nextStep: 'Inspect the component branch that reads router.query.',
      preventionTip: 'Add a loading-state branch before firing the fetch.',
      severity: 'medium',
      confidence: 'low',
      summary: null,
    });
  });

  it('falls back to summary text when output is unusable', () => {
    expect(
      parseStructuredAiAnalysisResponse(
        'The stack trace points at a null dependency during startup.',
      ),
    ).toEqual({
      ...createEmptyStructuredAiAnalysis(),
      summary: 'The stack trace points at a null dependency during startup.',
    });
  });

  it('normalizes stored analysis metadata and omits empty payloads', () => {
    expect(
      normalizeStoredAiAnalysis({
        eventId: 'evt_123',
        rootCause: 'Cache miss throws unexpectedly.',
        suggestedFix: 'Handle empty cache reads before parsing.',
        severity: 'critical',
      } as any),
    ).toEqual({
      eventId: 'evt_123',
      analysis: {
        rootCause: 'Cache miss throws unexpectedly.',
        suggestedFix: 'Handle empty cache reads before parsing.',
        likelyArea: null,
        nextStep: null,
        preventionTip: null,
        severity: 'critical',
        confidence: null,
        summary: null,
      },
    });

    expect(
      serializeStoredAiAnalysis('evt_123', createEmptyStructuredAiAnalysis()),
    ).toBeUndefined();
  });
});
