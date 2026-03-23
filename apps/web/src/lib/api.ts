import type { AuthProjectSummary, AuthUser } from './authSession';
import { getStoredAuthToken } from './authSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY || '';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || '';
const DASHBOARD_API_KEY_STORAGE_KEY = 'smart-error-tracker.dashboard-api-key';

export type DashboardApiKeySource = 'runtime' | 'env' | 'none';

function readStoredDashboardApiKey() {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(DASHBOARD_API_KEY_STORAGE_KEY)?.trim() ?? '';
}

export function getDashboardApiKeyOverride() {
    return readStoredDashboardApiKey();
}

export function getDashboardApiKey() {
    return readStoredDashboardApiKey() || API_KEY;
}

export function getDashboardApiKeySource(): DashboardApiKeySource {
    if (readStoredDashboardApiKey()) return 'runtime';
    if (API_KEY) return 'env';
    return 'none';
}

export function setDashboardApiKey(apiKey: string) {
    if (typeof window === 'undefined') return;

    const normalized = apiKey.trim();
    if (!normalized) {
        window.localStorage.removeItem(DASHBOARD_API_KEY_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(DASHBOARD_API_KEY_STORAGE_KEY, normalized);
}

export function clearDashboardApiKey() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(DASHBOARD_API_KEY_STORAGE_KEY);
}

const requestJson = async <T = unknown>(
    endpoint: string,
    apiKeyOverride: string | null,
    authTokenOverride: string | null = null,
    options: RequestInit = {},
): Promise<T> => {
    const headers = new Headers(options.headers || {});
    const apiKey = apiKeyOverride ?? getDashboardApiKey();
    const authToken = authTokenOverride ?? getStoredAuthToken();
    if (apiKey) {
        headers.set('x-api-key', apiKey);
    } else {
        headers.delete('x-api-key');
    }
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
    } else {
        headers.delete('Authorization');
    }
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

export const apiFetch = async <T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> => requestJson<T>(endpoint, null, null, options);

export const apiFetchWithApiKey = async <T = unknown>(
    endpoint: string,
    apiKey: string,
    options: RequestInit = {},
): Promise<T> => requestJson<T>(endpoint, apiKey, null, options);

export const hasAdminConsoleAccess = Boolean(ADMIN_TOKEN);

export const adminFetch = async <T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> => {
    if (!ADMIN_TOKEN) {
        throw new Error(
            'VITE_ADMIN_TOKEN is required to create projects from the dashboard.',
        );
    }

    const headers = new Headers(options.headers || {});
    headers.set('x-admin-token', ADMIN_TOKEN);
    const authToken = getStoredAuthToken();
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
    }
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

export interface AdminProjectSummary {
    id: string;
    name: string;
    key: string;
}

export interface AdminProjectListItem extends AdminProjectSummary {
    createdAt: string;
    apiKeyCount: number;
}

export interface AdminProjectsResponse {
    ok?: boolean;
    projects?: AdminProjectListItem[];
    error?: string;
}

export interface CreateAdminProjectRequest {
    name: string;
    label?: string;
}

export interface CreateAdminProjectResponse {
    ok?: boolean;
    project?: AdminProjectSummary;
    apiKey?: string;
    error?: string;
}

export const createAdminProject = (body: CreateAdminProjectRequest) =>
    adminFetch<CreateAdminProjectResponse>('/admin/projects', {
        method: 'POST',
        body: JSON.stringify(body),
    });

export const getAdminProjects = () =>
    adminFetch<AdminProjectsResponse>('/admin/projects');

export interface AdminProjectApiKeyListItem {
    id: string;
    label: string | null;
    createdAt: string;
    revokedAt: string | null;
}

export interface AdminProjectApiKeysResponse {
    ok?: boolean;
    keys?: AdminProjectApiKeyListItem[];
    error?: string;
}

export interface CreateAdminProjectApiKeyRequest {
    label?: string;
}

export interface CreateAdminProjectApiKeyResponse {
    ok?: boolean;
    apiKey?: string;
    keyId?: string;
    error?: string;
}

export const getAdminProjectApiKeys = (projectId: string) =>
    adminFetch<AdminProjectApiKeysResponse>(`/admin/projects/${projectId}/keys`);

export const createAdminProjectApiKey = (
    projectId: string,
    body: CreateAdminProjectApiKeyRequest,
) =>
    adminFetch<CreateAdminProjectApiKeyResponse>(`/admin/projects/${projectId}/keys`, {
        method: 'POST',
        body: JSON.stringify(body),
    });

export interface ProjectContext {
    id: string;
    name: string;
    key: string;
}

export interface ProjectContextResponse {
    ok: boolean;
    project?: ProjectContext;
    error?: string;
}

export const getProjectContext = () =>
    apiFetch<ProjectContextResponse>('/project-context');

export const getProjectContextForApiKey = (apiKey: string) =>
    apiFetchWithApiKey<ProjectContextResponse>('/project-context', apiKey);

async function authRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    authTokenOverride: string | null = null,
) {
    const headers = new Headers(options.headers || {});
    const authToken = authTokenOverride ?? getStoredAuthToken();
    if (authToken) {
        headers.set('Authorization', `Bearer ${authToken}`);
    } else {
        headers.delete('Authorization');
    }
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
}

export interface AuthResponse {
    ok: boolean;
    error?: string;
    sessionToken?: string;
    mode?: 'demo' | 'member';
    user?: AuthUser;
    project?: AuthProjectSummary | null;
    dashboardApiKey?: string | null;
}

export interface AuthMeResponse {
    ok: boolean;
    error?: string;
    mode?: 'demo' | 'member';
    user?: AuthUser;
    project?: AuthProjectSummary | null;
    dashboardApiKeyAvailable?: boolean;
}

export interface DemoAccessResponse {
    ok: boolean;
    enabled?: boolean;
    error?: string;
    user?: Pick<AuthUser, 'name' | 'email'>;
    project?: AuthProjectSummary | null;
}

export const registerUser = (body: { name: string; email: string; password: string }) =>
    authRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
    });

export const loginUser = (body: { email: string; password: string }) =>
    authRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
    });

export const loginDemoUser = () =>
    authRequest<AuthResponse>('/auth/demo-login', {
        method: 'POST',
    });

export const getDemoAccess = () =>
    authRequest<DemoAccessResponse>('/auth/demo-access');

export const getAuthMe = (authToken?: string) =>
    authRequest<AuthMeResponse>('/auth/me', {}, authToken ?? null);

export const logoutUser = (authToken?: string) =>
    authRequest<{ ok: boolean; error?: string }>('/auth/logout', {
        method: 'POST',
    }, authToken ?? null);

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

export type DashboardRange = '7d' | '30d';

export const getDashboardStats = (range: DashboardRange = '7d') =>
    apiFetch<DashboardStatsResponse>(`/stats?range=${range}`);

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

export type PreventionRepeatRisk = 'low' | 'medium' | 'high';

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

export interface PreventionInsightsResponse {
    ok: boolean;
    insights?: PreventionInsights;
    error?: string;
}

export const getPreventionInsights = (id: string) =>
    apiFetch<PreventionInsightsResponse>(`/groups/${id}/prevention-insights`);

export type FixMemoryConfidence = 'low' | 'medium' | 'high';

export interface FixMemoryRelatedFix {
    id: string;
    title: string;
    status: string;
    resolutionNote: string | null;
    lastSeenAt: string;
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

export interface FixMemoryResponse {
    ok: boolean;
    memory?: FixMemory;
    error?: string;
}

export const getFixMemory = (id: string) =>
    apiFetch<FixMemoryResponse>(`/groups/${id}/fix-memory`);

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
