import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/public/AuthShell';
import { hasDemoAccessConfigured, startDemoSession } from '../lib/authSession';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [notice, setNotice] = useState<string | null>(null);
    const demoConfigured = hasDemoAccessConfigured();

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!email.trim() || !password.trim()) {
            setNotice('Enter your email and password to continue.');
            return;
        }

        setNotice('Login UI is ready. The backend auth flow will be connected in the next phase.');
    };

    const handleDemoLogin = () => {
        const { apiKey } = startDemoSession();
        if (!apiKey) {
            setNotice('Demo access is not configured with a project key yet.');
            return;
        }

        navigate('/demo');
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
                    className="ui-primary-button w-full px-4 py-3 text-sm font-semibold text-white"
                >
                    Continue to Login
                </button>

                {demoConfigured ? (
                    <button
                        type="button"
                        onClick={handleDemoLogin}
                        className="ui-secondary-button w-full px-4 py-3 text-sm font-semibold text-[var(--enterprise-text)]"
                    >
                        Continue as Demo User
                    </button>
                ) : null}
            </form>
        </AuthShell>
    );
}
