const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export const apiFetch = async <T = any>(
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

export const getGroupDetail = (id: string) => apiFetch(`/groups/${id}`);

export type StatusAction = 'resolve' | 'open' | 'ignore';
export const setGroupStatus = (id: string, action: StatusAction) =>
    apiFetch(`/groups/${id}/${action}`, { method: 'POST' });

export const analyzeEvent = (eventId: string) =>
    apiFetch(`/events/${eventId}/analyze`, { method: 'POST' });

export type GroupStatus = 'open' | 'resolved' | 'ignored';
export type GroupLevel = 'error' | 'warn' | 'info';

export interface GroupListItem {
    id: string;
    fingerprint: string;
    title: string;
    status: string;
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
