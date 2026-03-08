const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export const apiFetch = async <T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> => {
    const headers = new Headers(options.headers || {});
    headers.set('x-api-key', API_KEY);
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Request failed with status ${response.status}`);
    }

    return response.json() as Promise<T>;
};

export interface DashboardBreakdownItem {
    name: string;
    count: number;
}

export interface DashboardTotals {
    totalEvents: number;
    totalIssues: number;
    openIssues: number;
    resolvedIssues: number;
    ignoredIssues: number;
}

export interface DashboardTrendPoint {
    date: string;
    count: number;
}

export interface DashboardTopIssue {
    id: string;
    title: string;
    status: string;
    isRegression: boolean;
    regressionCount: number;
    lastRegressedAt: string | null;
    eventCount: number;
    lastSeenAt: string;
}

export interface DashboardStatsCounts {
    totalGroups: number;
    open: number;
    resolved: number;
    ignored: number;
    totalEvents: number;
}

export interface DashboardStatsData {
    totals: DashboardTotals;
    trend7d: DashboardTrendPoint[];
    errorsByLevel: DashboardBreakdownItem[];
    errorsByEnvironment: DashboardBreakdownItem[];
    errorsByRelease: DashboardBreakdownItem[];
    topRoutes: DashboardBreakdownItem[];
    topIssues: DashboardTopIssue[];
}

export interface DashboardStatsResponse extends Partial<DashboardStatsData> {
    ok: boolean;
    counts?: DashboardStatsCounts;
    dailyTrend?: DashboardTrendPoint[];
    error?: string;
}

export const getDashboardStats = () =>
    apiFetch<DashboardStatsResponse>('/stats');

export type AnalysisSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AnalysisConfidence = 'low' | 'medium' | 'high';

export interface EventAiAnalysis {
    rootCause: string | null;
    suggestedFix: string | null;
    likelyArea: string | null;
    nextStep: string | null;
    preventionTip: string | null;
    severity: AnalysisSeverity | null;
    confidence: AnalysisConfidence | null;
    summary?: string | null;
}

export type GroupAiAnalysis = EventAiAnalysis;

export interface GroupDetail {
    id: string;
    fingerprint: string;
    title: string;
    status: string;
    resolutionNote: string | null;
    isRegression: boolean;
    regressionCount: number;
    lastRegressedAt: string | null;
    eventCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    aiAnalysis?: GroupAiAnalysis | null;
}

export interface EventSdkInfo {
    name: string | null;
    version: string | null;
}

export interface GroupDetailEvent {
    id: string;
    source: string;
    message: string;
    stack: string | null;
    context: Record<string, unknown> | null;
    aiAnalysis?: EventAiAnalysis | null;
    environment: string | null;
    releaseVersion: string | null;
    level: string | null;
    sdk: EventSdkInfo | null;
    rawPayload: unknown | null;
    timestamp: string;
    createdAt: string;
}

export interface GroupDetailResponse {
    ok: boolean;
    group?: GroupDetail;
    events?: GroupDetailEvent[];
    error?: string;
}

export const getGroupDetail = (id: string) =>
    apiFetch<GroupDetailResponse>(`/groups/${id}`);

export interface SimilarIssue {
    id: string;
    title: string;
    status: string;
    similarityReason: string;
    resolutionNote: string | null;
    lastSeenAt: string;
    isRegression: boolean;
    score: number;
}

export interface SimilarIssuesResponse {
    ok: boolean;
    items?: SimilarIssue[];
    error?: string;
}

export const getSimilarIssues = (id: string) =>
    apiFetch<SimilarIssuesResponse>(`/groups/${id}/similar`);

export type StatusAction = 'resolve' | 'open' | 'ignore';
export interface SetGroupStatusRequest {
    note?: string;
}
export interface SetGroupStatusResponse {
    ok: boolean;
    group?: {
        id: string;
        status: string;
        resolutionNote: string | null;
        isRegression: boolean;
        regressionCount: number;
        lastRegressedAt: string | null;
        lastSeenAt: string;
        eventCount: number;
    };
    error?: string;
}
export const setGroupStatus = (
    id: string,
    action: StatusAction,
    body?: SetGroupStatusRequest,
) =>
    apiFetch<SetGroupStatusResponse>(`/groups/${id}/${action}`, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
    });

export interface AnalyzeEventResponse {
    ok: boolean;
    analysis?: EventAiAnalysis;
    aiAnalysis?: GroupAiAnalysis;
    sourceMapResult?: EventSourceMapResult;
    sourceMap?: EventSourceMapResolution | null;
    error?: string;
}

export type EventSourceMapStatus =
    | 'resolved'
    | 'not_needed'
    | 'no_stack'
    | 'unsupported_stack'
    | 'missing_source_map'
    | 'fetch_failed'
    | 'invalid_source_map'
    | 'unmapped_frame';

export interface SourceMapFrame {
    functionName: string | null;
    file: string;
    line: number;
    column: number;
}

export interface SourceMapOriginalFrame {
    source: string | null;
    line: number | null;
    column: number | null;
    name: string | null;
}

export interface EventSourceMapResolution {
    mapUrl: string;
    minified: SourceMapFrame;
    original: SourceMapOriginalFrame;
}

export interface EventSourceMapResult {
    status: EventSourceMapStatus;
    message: string;
    hint: string | null;
    sourceMap: EventSourceMapResolution | null;
    diagnostics: {
        frame: SourceMapFrame | null;
        frameKind: 'remote_asset' | 'source' | 'local_path' | 'unsupported_url' | 'unknown';
        mapUrl: string | null;
        httpStatus: number | null;
    };
}

export interface ResolveSourceMapResponse {
    ok: boolean;
    sourceMap?: EventSourceMapResolution | null;
    sourceMapResult?: EventSourceMapResult;
    error?: string;
}

export const analyzeEvent = (eventId: string) =>
    apiFetch<AnalyzeEventResponse>(`/events/${eventId}/analyze`, { method: 'POST' });

export const resolveEventSourceMap = (eventId: string) =>
    apiFetch<ResolveSourceMapResponse>(`/events/${eventId}/source-map`, { method: 'POST' });

export type GroupStatus = 'open' | 'resolved' | 'ignored';
export type GroupLevel = 'error' | 'warn' | 'info';

export interface GroupListItem {
    id: string;
    fingerprint: string;
    title: string;
    status: string;
    isRegression: boolean;
    regressionCount: number;
    lastRegressedAt: string | null;
    eventCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    environment: string | null;
    releaseVersion: string | null;
    level: string | null;
}

export interface ListGroupsResponse {
    ok: boolean;
    groups?: GroupListItem[];
    page?: {
        limit: number;
        offset: number;
        hasMore: boolean;
    };
    error?: string;
}

export interface ListGroupsParams {
    search?: string;
    status?: GroupStatus;
    environment?: string;
    level?: GroupLevel;
    release?: string;
    limit?: number;
    offset?: number;
}

export const getGroups = (params: ListGroupsParams = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status) query.set('status', params.status);
    if (params.environment) query.set('environment', params.environment);
    if (params.level) query.set('level', params.level);
    if (params.release) query.set('release', params.release);
    if (typeof params.limit === 'number') query.set('limit', String(params.limit));
    if (typeof params.offset === 'number') query.set('offset', String(params.offset));

    const queryString = query.toString();
    return apiFetch<ListGroupsResponse>(`/groups${queryString ? `?${queryString}` : ''}`);
};

export interface GroupFilterMetadataResponse {
    ok: boolean;
    environments?: string[];
    releases?: string[];
    error?: string;
}

export const getGroupFilters = () =>
    apiFetch<GroupFilterMetadataResponse>('/groups/filters');
