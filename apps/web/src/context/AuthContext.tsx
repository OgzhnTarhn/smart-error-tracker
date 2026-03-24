import {
    createContext,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    clearDashboardApiKey,
    changeAuthPassword,
    getAuthMe,
    loginDemoUser,
    loginUser,
    logoutUser,
    registerUser,
    setDashboardApiKey,
    updateAuthProfile,
    type AuthResponse,
} from '../lib/api';
import {
    clearStoredAuthSession,
    getStoredAuthSession,
    setStoredAuthSession,
    type StoredAuthSession,
} from '../lib/authSession';

interface AuthContextValue {
    session: StoredAuthSession | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (input: { email: string; password: string }) => Promise<StoredAuthSession>;
    register: (input: { name: string; email: string; password: string }) => Promise<StoredAuthSession>;
    loginDemo: () => Promise<StoredAuthSession>;
    updateProfile: (input: { name: string; email: string }) => Promise<StoredAuthSession>;
    changePassword: (input: {
        currentPassword: string;
        newPassword: string;
    }) => Promise<void>;
    logout: () => Promise<void>;
    refreshSession: () => Promise<StoredAuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function formatAuthErrorMessage(code: string) {
    switch (code) {
        case 'invalid_credentials':
            return 'Email or password is incorrect.';
        case 'email_in_use':
            return 'This email is already in use.';
        case 'invalid_email':
            return 'Enter a valid email address.';
        case 'password_too_short':
            return 'Password must be at least 8 characters.';
        case 'name_too_short':
            return 'Name must be at least 2 characters.';
        case 'current_password_required':
            return 'Enter your current password.';
        case 'invalid_current_password':
            return 'Current password is incorrect.';
        case 'password_unchanged':
            return 'Choose a different password.';
        case 'demo_project_not_found':
            return 'No demo project is currently bound for demo access.';
        case 'demo_account_locked':
            return 'Demo account details cannot be changed.';
        case 'unauthorized':
            return 'Your session is no longer valid. Please sign in again.';
        default:
            return code.replace(/_/g, ' ');
    }
}

function buildSessionFromAuthResponse(response: AuthResponse): StoredAuthSession {
    if (!response.sessionToken || !response.user || !response.mode) {
        throw new Error(response.error ?? 'auth_response_incomplete');
    }

    return {
        token: response.sessionToken,
        user: response.user,
        mode: response.mode,
        project: response.project ?? null,
    };
}

function buildSessionFromIdentityResponse(
    token: string,
    response: {
        user?: StoredAuthSession['user'];
        mode?: StoredAuthSession['mode'];
        project?: StoredAuthSession['project'];
        error?: string;
    },
): StoredAuthSession {
    if (!token || !response.user || !response.mode) {
        throw new Error(response.error ?? 'auth_response_incomplete');
    }

    return {
        token,
        user: response.user,
        mode: response.mode,
        project: response.project ?? null,
    };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<StoredAuthSession | null>(() => getStoredAuthSession());
    const [loading, setLoading] = useState(Boolean(getStoredAuthSession()?.token));

    const applySession = (nextSession: StoredAuthSession | null, dashboardApiKey?: string | null) => {
        setSession(nextSession);

        if (nextSession) {
            setStoredAuthSession(nextSession);
        } else {
            clearStoredAuthSession();
        }

        if (dashboardApiKey) {
            setDashboardApiKey(dashboardApiKey);
        } else if (dashboardApiKey === '' || dashboardApiKey === null) {
            clearDashboardApiKey();
        }
    };

    const refreshSession = async () => {
        const stored = getStoredAuthSession();
        if (!stored?.token) {
            applySession(null);
            setLoading(false);
            return null;
        }

        setLoading(true);

        try {
            const response = await getAuthMe(stored.token);
            if (!response.ok || !response.user || !response.mode) {
                applySession(null, '');
                return null;
            }

            const nextSession = buildSessionFromIdentityResponse(stored.token, response);

            applySession(nextSession);
            return nextSession;
        } catch {
            applySession(null, '');
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refreshSession();
    }, []);

    const authenticate = async (request: Promise<AuthResponse>) => {
        const response = await request;
        if (!response.ok) {
            throw new Error(formatAuthErrorMessage(response.error ?? 'auth_failed'));
        }

        const nextSession = buildSessionFromAuthResponse(response);
        applySession(nextSession, response.dashboardApiKey ?? null);
        return nextSession;
    };

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            loading,
            isAuthenticated: Boolean(session?.token),
            login: (input) => authenticate(loginUser(input)),
            register: (input) => authenticate(registerUser(input)),
            loginDemo: () => authenticate(loginDemoUser()),
            updateProfile: async (input) => {
                const currentToken = session?.token ?? getStoredAuthSession()?.token ?? '';
                const response = await updateAuthProfile(input, currentToken);
                if (!response.ok) {
                    throw new Error(formatAuthErrorMessage(response.error ?? 'profile_update_failed'));
                }

                const nextSession = buildSessionFromIdentityResponse(currentToken, response);
                applySession(nextSession);
                return nextSession;
            },
            changePassword: async (input) => {
                const currentToken = session?.token ?? getStoredAuthSession()?.token ?? '';
                const response = await changeAuthPassword(input, currentToken);
                if (!response.ok) {
                    throw new Error(formatAuthErrorMessage(response.error ?? 'password_change_failed'));
                }
            },
            logout: async () => {
                const currentToken = session?.token ?? getStoredAuthSession()?.token ?? '';

                try {
                    if (currentToken) {
                        await logoutUser(currentToken);
                    }
                } catch {
                    // Ignore logout network failures; local teardown still matters.
                } finally {
                    applySession(null, '');
                }
            },
            refreshSession,
        }),
        [loading, session],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}
