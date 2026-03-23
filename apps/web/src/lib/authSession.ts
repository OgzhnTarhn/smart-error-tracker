const AUTH_SESSION_STORAGE_KEY = 'smart-error-tracker.auth-session';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
}

export interface AuthProjectSummary {
    id: string;
    name: string;
    key: string;
}

export interface StoredAuthSession {
    token: string;
    user: AuthUser;
    mode: 'demo' | 'member';
    project: AuthProjectSummary | null;
}

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStoredAuthSession() {
    if (!canUseStorage()) return null;

    try {
        const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
        if (!rawValue) return null;

        const parsed = JSON.parse(rawValue) as StoredAuthSession;
        if (!parsed || typeof parsed !== 'object' || !parsed.token || !parsed.user) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export function getStoredAuthToken() {
    return getStoredAuthSession()?.token ?? '';
}

export function setStoredAuthSession(session: StoredAuthSession) {
    if (!canUseStorage()) return;
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function getAuthAvatarLabel(fallback = 'OG') {
    const session = getStoredAuthSession();
    if (!session?.user?.name) return fallback;

    const initials = session.user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    return initials || fallback;
}
