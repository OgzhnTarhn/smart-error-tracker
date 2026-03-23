import { type FormEvent, useState } from 'react';
import AuthShell from '../components/public/AuthShell';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [notice, setNotice] = useState<string | null>(null);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!name.trim() || !email.trim() || !password.trim()) {
            setNotice('Complete all fields before continuing.');
            return;
        }

        setNotice('Register UI is ready. The backend auth flow will be connected in the next phase.');
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
                    className="ui-primary-button w-full px-4 py-3 text-sm font-semibold text-white"
                >
                    Continue to Register
                </button>

                <p className="text-sm leading-6 text-[var(--enterprise-text-muted)]">
                    Want to inspect the seeded workspace first? Use the demo access flow from the public navigation.
                </p>
            </form>
        </AuthShell>
    );
}
