import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicSiteChrome from '../components/public/PublicSiteChrome';
import { startDemoSession, getDemoDashboardApiKey, hasDemoAccessConfigured } from '../lib/authSession';
import { getProjectContextForApiKey, type ProjectContext } from '../lib/api';

export default function DemoAccessPage() {
    const navigate = useNavigate();
    const [project, setProject] = useState<ProjectContext | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);
    const [entering, setEntering] = useState(false);

    const demoApiKey = getDemoDashboardApiKey();
    const demoConfigured = hasDemoAccessConfigured();

    useEffect(() => {
        if (!demoConfigured || !demoApiKey) {
            setStatus('error');
            setMessage('Demo API key is not configured yet for this environment.');
            return;
        }

        let active = true;
        setStatus('loading');
        setMessage(null);

        void (async () => {
            try {
                const response = await getProjectContextForApiKey(demoApiKey);
                if (!response.ok || !response.project) {
                    throw new Error(response.error ?? 'Demo project context could not be loaded.');
                }

                if (!active) return;
                setProject(response.project);
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
    }, [demoApiKey, demoConfigured]);

    const handleDemoEntry = () => {
        const { apiKey } = startDemoSession();
        if (!apiKey) {
            setStatus('error');
            setMessage('Demo access is not configured with a usable API key.');
            return;
        }

        setEntering(true);
        if (project?.id) {
            navigate(`/projects/${project.id}`);
            return;
        }

        navigate('/dashboard');
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
                            This page is not a fake marketing step. It uses the configured demo API key,
                            resolves the real project context, and then opens the seeded workspace as a
                            demo user path.
                        </p>

                        <div className="mt-8 border-l border-[rgba(107,130,255,0.28)] pl-5">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--enterprise-text-dim)]">
                                Demo user
                            </div>
                            <div className="mt-3 text-2xl font-semibold text-white">
                                Demo Analyst
                            </div>
                            <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                demo@smarterror.dev
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
                                    Demo key status
                                </div>
                                <div className="mt-2 text-lg font-semibold text-white">
                                    {demoConfigured ? 'Configured' : 'Missing'}
                                </div>
                                <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                    {demoConfigured
                                        ? 'The demo session can reuse the current configured dashboard project.'
                                        : 'Add VITE_DEMO_API_KEY or reuse the current dashboard VITE_API_KEY for demo access.'}
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
                                onClick={handleDemoEntry}
                                disabled={!demoConfigured || status === 'loading' || entering}
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
