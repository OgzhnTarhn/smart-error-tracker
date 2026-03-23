import { type FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/public/AuthShell';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { login, loginDemo, isAuthenticated, session } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [notice, setNotice] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fallbackPath = session?.project ? `/projects/${session.project.id}` : '/projects/new';

    const nextPath = (location.state as { from?: string } | null)?.from
        ?? fallbackPath;

    if (isAuthenticated) {
        return <Navigate to={nextPath} replace />;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!email.trim() || !password.trim()) {
            setNotice('Enter your email and password to continue.');
            return;
        }

        setSubmitting(true);
        setNotice(null);

        try {
            const nextSession = await login({
                email,
                password,
            });
            navigate(
                (location.state as { from?: string } | null)?.from
                    ?? (nextSession.project ? `/projects/${nextSession.project.id}` : '/projects/new'),
            );
        } catch (error: unknown) {
            setNotice(error instanceof Error ? error.message : 'Login failed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDemoLogin = async () => {
        setSubmitting(true);
        setNotice(null);

        try {
            const nextSession = await loginDemo();
            navigate(nextSession.project ? `/projects/${nextSession.project.id}` : '/projects/new');
        } catch (error: unknown) {
            setNotice(error instanceof Error ? error.message : 'Demo login failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Login"
            title="Return to the workspace that manages projects and issue triage."
            description="This screen is the entry point for authenticated users. The internal dashboard pages stay unchanged; access control is layered in front of them."
            formTitle="Login to Smart Error Tracker"
            formDescription="Use your workspace account to enter the protected monitoring area."
            alternateLabel="Need an account?"
            alternateLinkTo="/register"
            alternateLinkLabel="Create one"
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                        Work Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@company.com"
                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                    />
                </div>

                <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Enter your password"
                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                    />
                </div>

                {notice ? (
                    <div className="ui-info-banner rounded-2xl px-4 py-3 text-sm leading-6">
                        {notice}
                    </div>
                ) : null}

                <button
                    type="submit"
                    disabled={submitting}
                    className="ui-primary-button w-full px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? 'Signing in...' : 'Continue to Login'}
                </button>

                <button
                    type="button"
                    onClick={() => void handleDemoLogin()}
                    disabled={submitting}
                    className="ui-secondary-button w-full px-4 py-3 text-sm font-semibold text-[var(--enterprise-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Continue as Demo User
                </button>
            </form>
        </AuthShell>
    );
}
