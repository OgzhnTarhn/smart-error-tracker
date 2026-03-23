import { clearDashboardApiKey, setDashboardApiKey } from './api';

const AUTH_SESSION_STORAGE_KEY = 'smart-error-tracker.auth-session';

export interface AuthSession {
    id: string;
    name: string;
    email: string;
    role: 'demo' | 'member';
    mode: 'demo' | 'manual';
}

const DEMO_SESSION: AuthSession = {
    id: 'demo-user',
    name: 'Demo Analyst',
    email: 'demo@smarterror.dev',
    role: 'demo',
    mode: 'demo',
};

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStoredAuthSession() {
    if (!canUseStorage()) return null;

    try {
        const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (!rawValue) return null;

        const parsed = JSON.parse(rawValue) as AuthSession;
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

export function setStoredAuthSession(session: AuthSession) {
    if (!canUseStorage()) return;
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function getDemoDashboardApiKey() {
    return (import.meta.env.VITE_DEMO_API_KEY || import.meta.env.VITE_API_KEY || '').trim();
}

export function hasDemoAccessConfigured() {
    return Boolean(getDemoDashboardApiKey());
}

export function startDemoSession() {
    const apiKey = getDemoDashboardApiKey();
    setStoredAuthSession(DEMO_SESSION);

    if (apiKey) {
        setDashboardApiKey(apiKey);
    }

    return {
        session: DEMO_SESSION,
        apiKey,
    };
}

export function endAuthSession() {
    clearStoredAuthSession();
    clearDashboardApiKey();
}

export function getAuthAvatarLabel(fallback = 'OG') {
    const session = getStoredAuthSession();
    if (!session?.name) return fallback;

    const initials = session.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    return initials || fallback;
}
