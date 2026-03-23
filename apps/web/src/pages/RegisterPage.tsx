import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '../components/public/AuthShell';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const navigate = useNavigate();
    const { register, isAuthenticated, session } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [notice, setNotice] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fallbackPath = session?.project ? `/projects/${session.project.id}` : '/projects/new';

    if (isAuthenticated) {
        return <Navigate to={fallbackPath} replace />;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!name.trim() || !email.trim() || !password.trim()) {
            setNotice('Complete all fields before continuing.');
            return;
        }

        setSubmitting(true);
        setNotice(null);

        try {
            const nextSession = await register({
                name,
                email,
                password,
            });
            navigate(nextSession.project ? `/projects/${nextSession.project.id}` : '/projects/new');
        } catch (error: unknown) {
            setNotice(error instanceof Error ? error.message : 'Registration failed.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Register"
            title="Create the account that unlocks project creation and the internal dashboard."
            description="Public visitors learn the product on the landing page. Registered users enter the protected workspace for monitoring, setup, and issue investigation."
            formTitle="Create your workspace account"
            formDescription="This screen prepares the registration flow without touching the existing dashboard internals."
            alternateLabel="Already have an account?"
            alternateLinkTo="/login"
            alternateLinkLabel="Go to login"
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Oguzhan Yilmaz"
                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                    />
                </div>

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
                        placeholder="Create a secure password"
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
                    {submitting ? 'Creating account...' : 'Continue to Register'}
                </button>

                <p className="text-sm leading-6 text-[var(--enterprise-text-muted)]">
                    Want to inspect the seeded workspace first? Use the demo access flow from the public navigation.
                </p>
            </form>
        </AuthShell>
    );
}
