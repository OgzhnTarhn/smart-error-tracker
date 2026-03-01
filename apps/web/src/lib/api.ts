const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
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

    return response.json();
};

export const getGroupDetail = (id: string) => apiFetch(`/groups/${id}`);

export type StatusAction = 'resolve' | 'open' | 'ignore';
export const setGroupStatus = (id: string, action: StatusAction) =>
    apiFetch(`/groups/${id}/${action}`, { method: 'POST' });
