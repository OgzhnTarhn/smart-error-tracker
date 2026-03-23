import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicSiteChrome from '../components/public/PublicSiteChrome';
import { useAuth } from '../context/AuthContext';
import { getDemoAccess, type DemoAccessResponse } from '../lib/api';
import type { AuthProjectSummary } from '../lib/authSession';

export default function DemoAccessPage() {
    const navigate = useNavigate();
    const { loginDemo } = useAuth();
    const [project, setProject] = useState<AuthProjectSummary | null>(null);
    const [demoUser, setDemoUser] = useState<DemoAccessResponse['user'] | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const [entering, setEntering] = useState(false);

    useEffect(() => {
        let active = true;
        setStatus('loading');
        setMessage(null);

        void (async () => {
            try {
                const response = await getDemoAccess();
                if (!response.ok) {
                    throw new Error(response.error ?? 'Demo project context could not be loaded.');
                }

                if (!active) return;
                setDemoUser(response.user ?? null);
                setProject(response.project ?? null);

                if (!response.enabled || !response.project) {
                    setStatus('error');
                    setMessage('No existing demo project is available to bind right now.');
                    return;
                }

                setStatus('ready');
            } catch (err: unknown) {
                if (!active) return;
                setStatus('error');
                setMessage(
                    err instanceof Error
                        ? err.message
                        : 'Demo project context could not be loaded.',
                );
            }
        })();

        return () => {
            active = false;
        };
    }, []);

    const handleDemoEntry = async () => {
        setEntering(true);
        setMessage(null);

        try {
            const nextSession = await loginDemo();
            navigate(nextSession.project ? `/projects/${nextSession.project.id}` : '/projects/new');
        } catch (error: unknown) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Demo login failed.');
        } finally {
            setEntering(false);
        }
    };

    return (
        <PublicSiteChrome>
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-10 md:px-6 xl:px-8 xl:py-12">
                <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
                    <div className="max-w-3xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cbd7ff]">
                            Demo Access
                        </div>
                        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-white md:text-6xl">
                            Enter the existing demo project through a dedicated demo session.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--enterprise-text-muted)]">
                            This page is not a fake marketing step. It resolves the real demo project
                            binding from the backend and opens the seeded workspace through a dedicated
                            demo user path.
                        </p>

                        <div className="mt-8 border-l border-[rgba(107,130,255,0.28)] pl-5">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--enterprise-text-dim)]">
                                Demo user
                            </div>
                            <div className="mt-3 text-2xl font-semibold text-white">
                                {demoUser?.name ?? 'Demo Analyst'}
                            </div>
                            <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                {demoUser?.email ?? 'demo@smarterror.dev'}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[34px] border border-[var(--enterprise-border)] bg-[linear-gradient(180deg,rgba(18,25,36,0.98),rgba(10,14,20,0.98))] shadow-[0_22px_60px_rgba(2,6,23,0.32)]">
                        <div className="border-b border-[var(--enterprise-border)] px-6 pb-6 pt-7">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--enterprise-text-dim)]">
                                Demo workspace
                            </div>
                            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                                Existing project binding
                            </h2>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            <div className="border-l border-[rgba(107,130,255,0.24)] pl-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                    Demo access status
                                </div>
                                <div className="mt-2 text-lg font-semibold text-white">
                                    {status === 'ready' ? 'Ready' : status === 'loading' ? 'Checking' : 'Unavailable'}
                                </div>
                                <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                    The demo session is resolved from backend project membership instead of a fake frontend-only route.
                                </p>
                            </div>

                            <div className="border-l border-[rgba(107,130,255,0.24)] pl-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                    Resolved project
                                </div>
                                <div className="mt-2 text-lg font-semibold text-white">
                                    {status === 'ready'
                                        ? project?.name ?? 'Unknown project'
                                        : status === 'loading'
                                            ? 'Resolving project context...'
                                            : 'Unavailable'}
                                </div>
                                <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                    {status === 'ready' && project
                                        ? `Project key ${project.key} will open through the demo session.`
                                        : message ?? 'The demo project context will appear here once the key resolves.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleDemoEntry()}
                                disabled={status !== 'ready' || entering}
                                className="ui-primary-button w-full px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {entering
                                    ? 'Opening demo workspace...'
                                    : project?.id
                                        ? 'Enter Demo Project'
                                        : 'Enter Demo Dashboard'}
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        </PublicSiteChrome>
    );
}
