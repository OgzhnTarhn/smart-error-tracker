import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useAdminProjects } from '../hooks/useAdminProjects';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import {
    clearDashboardApiKey,
    createAdminProject,
    getDashboardApiKeyOverride,
    setDashboardApiKey,
    hasAdminConsoleAccess,
    type AdminProjectListItem,
    type CreateAdminProjectResponse,
} from '../lib/api';

type IntegrationKey = 'nextjs' | 'react' | 'node' | 'express';

interface IntegrationOption {
    key: IntegrationKey;
    label: string;
    runtime: string;
    installCommand: string;
    snippet: (apiKey: string) => string;
    summary: string;
    bullets: string[];
}

const INTEGRATIONS: IntegrationOption[] = [
    {
        key: 'nextjs',
        label: 'Next.js',
        runtime: 'Frontend + backend',
        installCommand:
            'pnpm add @smart-error-tracker/browser @smart-error-tracker/node',
        snippet: (apiKey) => `// app/client
import { init, installGlobalHandlers } from '@smart-error-tracker/browser';

init({
  baseUrl: 'http://localhost:3000',
  apiKey: '${apiKey}',
  environment: 'production',
  release: 'web@1.0.0',
});

installGlobalHandlers();`,
        summary:
            'Use the browser SDK on the client and the Node SDK in route handlers or jobs.',
        bullets: ['Client errors', 'Server exceptions', 'Release tagging'],
    },
    {
        key: 'react',
        label: 'React / Vite',
        runtime: 'Browser SDK',
        installCommand: 'pnpm add @smart-error-tracker/browser',
        snippet: (apiKey) => `import { init, installGlobalHandlers } from '@smart-error-tracker/browser';

init({
  baseUrl: 'http://localhost:3000',
  apiKey: '${apiKey}',
  environment: 'production',
  release: 'web@1.0.0',
});

installGlobalHandlers();`,
        summary:
            'Capture browser crashes, unhandled promise rejections, and manual exceptions.',
        bullets: ['Browser capture', 'Global handlers', 'Source-map ready'],
    },
    {
        key: 'node',
        label: 'Node.js',
        runtime: 'Node SDK',
        installCommand: 'pnpm add @smart-error-tracker/node',
        snippet: (apiKey) => `import { init, installGlobalHandlers } from '@smart-error-tracker/node';

init({
  baseUrl: 'http://localhost:3000',
  apiKey: '${apiKey}',
  environment: 'production',
  release: 'api@1.0.0',
});

installGlobalHandlers();`,
        summary:
            'Best for services, workers, queue consumers, and backend runtime failures.',
        bullets: ['Process crashes', 'Unhandled rejections', 'Manual capture'],
    },
    {
        key: 'express',
        label: 'Express',
        runtime: 'Middleware setup',
        installCommand: 'pnpm add @smart-error-tracker/node',
        snippet: (apiKey) => `import express from 'express';
import { init, expressErrorHandler } from '@smart-error-tracker/node';

init({
  baseUrl: 'http://localhost:3000',
  apiKey: '${apiKey}',
  environment: 'production',
  release: 'api@1.0.0',
});

const app = express();
app.use(expressErrorHandler());`,
        summary:
            'Drop in the middleware to collect request failures with request context.',
        bullets: ['Express middleware', 'Request metadata', 'Fast setup'],
    },
];

const FEATURE_CARDS = [
    {
        title: 'Create Projects',
        description:
            'Give each app or service its own project so events, releases, and issues stay isolated.',
    },
    {
        title: 'Integrate The SDK',
        description:
            'Pick the runtime you use, copy the snippet, and connect your app with the generated API key.',
    },
    {
        title: 'Investigate Faster',
        description:
            'Grouped issues, event detail, stack traces, source maps, and AI analysis stay in one flow.',
    },
];

const FLOW_CARDS = [
    {
        step: '01',
        title: 'Open setup',
        description:
            'Start from the dashboard, choose your stack, and prepare the integration flow.',
    },
    {
        step: '02',
        title: 'Generate a project key',
        description:
            'Create a project and copy the one-time API key used by the SDK.',
    },
    {
        step: '03',
        title: 'Track live errors',
        description:
            'As errors happen, Smart Error Tracker groups them into issues and makes them explorable.',
    },
];

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const API_KEY_SOURCE_LABELS = {
    runtime: 'Browser override',
    env: 'Environment default',
    none: 'No key connected',
} as const;

function PrimaryButton({
    label,
    onClick,
    disabled = false,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-full border border-orange-400/20 bg-orange-500/15 px-5 py-3 text-sm font-semibold text-orange-100 transition-colors hover:border-orange-400/30 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {label}
        </button>
    );
}

function SecondaryButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-full border border-[var(--enterprise-border)] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[var(--enterprise-text-muted)] transition-colors hover:border-white/12 hover:text-white"
        >
            {label}
        </button>
    );
}

function CopyButton({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)] transition-colors hover:text-white"
        >
            {copied ? `${label} copied` : `Copy ${label}`}
        </button>
    );
}

function FeatureCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="enterprise-panel-soft rounded-[24px] border border-[var(--enterprise-border)] p-6">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="mt-3 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                {description}
            </p>
        </div>
    );
}

function IntegrationCard({
    integration,
    onSelect,
}: {
    integration: IntegrationOption;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className="enterprise-panel-soft w-full rounded-[24px] border border-[var(--enterprise-border)] p-5 text-left transition-colors hover:border-orange-500/30 hover:bg-[#18110d]"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-white">{integration.label}</div>
                <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-200">
                    {integration.runtime}
                </span>
            </div>
            <p className="mt-4 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                {integration.summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
                {integration.bullets.map((item) => (
                    <span
                        key={item}
                        className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-[var(--enterprise-text-muted)]"
                    >
                        {item}
                    </span>
                ))}
            </div>
        </button>
    );
}

function FlowCard({
    step,
    title,
    description,
}: {
    step: string;
    title: string;
    description: string;
}) {
    return (
        <div className="enterprise-panel-soft rounded-[22px] border border-[var(--enterprise-border)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">
                {step}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-3 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                {description}
            </p>
        </div>
    );
}

function ProjectPreviewCard({ project }: { project: AdminProjectListItem }) {
    return (
        <div className="enterprise-panel-soft rounded-[22px] border border-[var(--enterprise-border)] p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-lg font-semibold text-white">{project.name}</div>
                    <div className="mt-2 font-mono text-[12px] text-[var(--enterprise-text-dim)]">
                        {project.key}
                    </div>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    {project.apiKeyCount} key{project.apiKeyCount === 1 ? '' : 's'}
                </span>
            </div>
            <div className="mt-4 text-sm text-[var(--enterprise-text-muted)]">
                Created {DATE_FORMATTER.format(new Date(project.createdAt))}
            </div>
        </div>
    );
}

function SetupModal({
    open,
    onClose,
    selectedIntegration,
    onSelectIntegration,
    projectName,
    keyLabel,
    setProjectName,
    setKeyLabel,
    submitting,
    onSubmit,
    onUseDashboardApiKey,
    createError,
    createdProject,
}: {
    open: boolean;
    onClose: () => void;
    selectedIntegration: IntegrationOption;
    onSelectIntegration: (key: IntegrationKey) => void;
    projectName: string;
    keyLabel: string;
    setProjectName: (value: string) => void;
    setKeyLabel: (value: string) => void;
    submitting: boolean;
    onSubmit: () => void;
    onUseDashboardApiKey: (apiKey: string) => void;
    createError: string | null;
    createdProject: CreateAdminProjectResponse | null;
}) {
    const activeApiKey = createdProject?.apiKey ?? 'set_your_generated_api_key';

    useEffect(() => {
        if (!open) return;

        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="enterprise-panel relative z-10 max-h-[92vh] w-full max-w-[1280px] overflow-y-auto rounded-[30px] border border-[var(--enterprise-border)]">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--enterprise-border)] bg-[#0a0909]/95 px-6 py-5 backdrop-blur-md">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">
                            Create Project
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold text-white">
                            Project setup and SDK integration
                        </h2>
                        <p className="mt-2 text-[15px] leading-7 text-[var(--enterprise-text-muted)]">
                            Generate a project key on the left, then copy the SDK snippet on the right.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-[var(--enterprise-border)] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[var(--enterprise-text-muted)] transition-colors hover:text-white"
                    >
                        Close
                    </button>
                </div>

                <div className="grid gap-0 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="border-b border-[var(--enterprise-border)] p-6 xl:border-b-0 xl:border-r">
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-xl font-semibold text-white">Project details</h3>
                                <p className="mt-2 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Create a project and receive the API key your SDK will use.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-white" htmlFor="project-name">
                                    Project name
                                </label>
                                <input
                                    id="project-name"
                                    type="text"
                                    value={projectName}
                                    onChange={(event) => setProjectName(event.target.value)}
                                    placeholder="checkout-web"
                                    className="w-full rounded-2xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-3.5 text-[15px] text-white outline-none placeholder:text-[var(--enterprise-text-dim)] focus:border-orange-500/35"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-white" htmlFor="key-label">
                                    Initial key label
                                </label>
                                <input
                                    id="key-label"
                                    type="text"
                                    value={keyLabel}
                                    onChange={(event) => setKeyLabel(event.target.value)}
                                    placeholder="production"
                                    className="w-full rounded-2xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-3.5 text-[15px] text-white outline-none placeholder:text-[var(--enterprise-text-dim)] focus:border-orange-500/35"
                                />
                            </div>

                            {!hasAdminConsoleAccess ? (
                                <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-[15px] leading-7 text-amber-100">
                                    Real project creation is enabled when `VITE_ADMIN_TOKEN`
                                    is configured for local admin access. You can still review the
                                    integration snippet on the right.
                                </div>
                            ) : null}

                            {createError ? (
                                <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-[15px] leading-7 text-red-100">
                                    {createError}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap gap-3">
                                <PrimaryButton
                                    label={submitting ? 'Creating...' : 'Create Project'}
                                    onClick={onSubmit}
                                    disabled={submitting}
                                />
                            </div>

                            {createdProject?.project && createdProject.apiKey ? (
                                <div className="enterprise-panel-soft rounded-[24px] border border-orange-400/15 p-5">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">
                                        Ready to integrate
                                    </div>
                                    <h3 className="mt-3 text-2xl font-semibold text-white">
                                        {createdProject.project.name}
                                    </h3>
                                    <p className="mt-3 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                        Save the API key now. It is intended to be shown once and then used by the SDK.
                                    </p>

                                    <div className="mt-5 grid gap-4">
                                        <div className="rounded-[18px] border border-white/8 bg-black/35 p-4">
                                            <div className="text-xs uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                                Project key
                                            </div>
                                            <div className="mt-2 break-all font-mono text-[14px] text-white">
                                                {createdProject.project.key}
                                            </div>
                                            <div className="mt-3">
                                                <CopyButton label="project key" value={createdProject.project.key} />
                                            </div>
                                        </div>

                                        <div className="rounded-[18px] border border-orange-400/15 bg-orange-500/10 p-4">
                                            <div className="text-xs uppercase tracking-[0.18em] text-orange-200">
                                                API key
                                            </div>
                                            <div className="mt-2 break-all font-mono text-[14px] text-orange-50">
                                                {createdProject.apiKey}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-3">
                                                <CopyButton label="api key" value={createdProject.apiKey} />
                                                <SecondaryButton
                                                    label="Use In Dashboard"
                                                    onClick={() =>
                                                        onUseDashboardApiKey(createdProject.apiKey)
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-xl font-semibold text-white">SDK integration</h3>
                                <p className="mt-2 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Choose the runtime you use and start from the generated starter snippet.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {INTEGRATIONS.map((integration) => {
                                    const isActive = integration.key === selectedIntegration.key;

                                    return (
                                        <button
                                            key={integration.key}
                                            type="button"
                                            onClick={() => onSelectIntegration(integration.key)}
                                            className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                                                isActive
                                                    ? 'border-orange-400/25 bg-orange-500/14 text-orange-100'
                                                    : 'border-[var(--enterprise-border)] bg-white/[0.03] text-[var(--enterprise-text-muted)] hover:text-white'
                                            }`}
                                        >
                                            {integration.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="enterprise-panel-soft rounded-[24px] border border-[var(--enterprise-border)] p-5">
                                <div className="text-lg font-semibold text-white">
                                    {selectedIntegration.label}
                                </div>
                                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                    {selectedIntegration.runtime}
                                </div>
                                <p className="mt-4 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    {selectedIntegration.summary}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {selectedIntegration.bullets.map((item) => (
                                        <span
                                            key={item}
                                            className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-[var(--enterprise-text-muted)]"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-black/30 p-5">
                                <div className="text-sm font-semibold text-white">Install</div>
                                <div className="mt-3 rounded-[16px] border border-white/8 bg-black/40 p-4 font-mono text-[13px] leading-7 text-orange-200">
                                    {selectedIntegration.installCommand}
                                </div>
                            </div>

                            <div className="rounded-[22px] border border-white/8 bg-black/30 p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-white">Starter snippet</div>
                                    <CopyButton
                                        label="snippet"
                                        value={selectedIntegration.snippet(activeApiKey)}
                                    />
                                </div>
                                <div className="mt-3 rounded-[16px] border border-white/8 bg-black/40 p-4 font-mono text-[13px] leading-7 text-orange-200 whitespace-pre-wrap">
                                    {selectedIntegration.snippet(activeApiKey)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OverviewPage() {
    const navigate = useNavigate();
    const { projects, loading: projectsLoading, error: projectsError, refresh: refreshProjects } =
        useAdminProjects();
    const {
        project: connectedProject,
        loading: workspaceLoading,
        error: workspaceError,
        hasApiKey,
        apiKeySource,
        refresh: refreshWorkspace,
    } = useDashboardProjectContext();
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationKey>('nextjs');
    const [setupOpen, setSetupOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [keyLabel, setKeyLabel] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createdProject, setCreatedProject] = useState<CreateAdminProjectResponse | null>(null);
    const [connectApiKeyInput, setConnectApiKeyInput] = useState('');
    const [connectError, setConnectError] = useState<string | null>(null);
    const [connectSuccess, setConnectSuccess] = useState<string | null>(null);

    const activeIntegration = useMemo(
        () => INTEGRATIONS.find((item) => item.key === selectedIntegration) ?? INTEGRATIONS[0],
        [selectedIntegration],
    );

    const openSetup = (integration?: IntegrationKey) => {
        if (integration) setSelectedIntegration(integration);
        setSetupOpen(true);
    };

    const closeSetup = () => {
        setSetupOpen(false);
    };

    const handleConnectApiKey = async (apiKey?: string) => {
        const normalizedApiKey = (apiKey ?? connectApiKeyInput).trim();
        if (!normalizedApiKey) {
            setConnectSuccess(null);
            setConnectError('API key is required.');
            return;
        }

        const previousOverride = getDashboardApiKeyOverride();
        setConnectError(null);
        setConnectSuccess(null);
        setDashboardApiKey(normalizedApiKey);

        const ok = await refreshWorkspace();
        if (!ok) {
            if (previousOverride) {
                setDashboardApiKey(previousOverride);
            } else {
                clearDashboardApiKey();
            }
            await refreshWorkspace();
            setConnectError('Dashboard could not verify that API key.');
            return;
        }

        setConnectApiKeyInput(normalizedApiKey);
        setConnectSuccess('Dashboard workspace connected successfully.');
    };

    const handleClearOverride = async () => {
        clearDashboardApiKey();
        setConnectApiKeyInput('');
        setConnectError(null);
        setConnectSuccess(null);
        await refreshWorkspace();
    };

    const handleCreateProject = async () => {
        const name = projectName.trim();
        const label = keyLabel.trim();

        if (!name) {
            setCreateError('Project name is required.');
            return;
        }

        setSubmitting(true);
        setCreateError(null);

        try {
            const response = await createAdminProject({
                name,
                label: label || undefined,
            });

            if (!response.ok || !response.project || !response.apiKey) {
                setCreateError(response.error ?? 'Project could not be created.');
                setCreatedProject(null);
                return;
            }

            setCreatedProject(response);
            setProjectName('');
            setKeyLabel('');
            setConnectApiKeyInput(response.apiKey);
            await refreshProjects();
        } catch (err: unknown) {
            setCreateError(
                err instanceof Error ? err.message : 'Project could not be created.',
            );
            setCreatedProject(null);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="dashboard" showSearch={false} />

            <main className="mx-auto max-w-[1480px] px-5 py-6 md:px-6 xl:px-8 xl:py-8">
                <section className="enterprise-panel relative overflow-hidden rounded-[32px] border border-[var(--enterprise-border)] px-6 py-8 sm:px-8 sm:py-10">
                    <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_58%)]" />
                    <div className="relative max-w-4xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="enterprise-chip">Smart Error Tracker</span>
                            <span className="text-sm font-medium text-[var(--enterprise-text-dim)]">
                                Project-first error monitoring
                            </span>
                        </div>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-[3.5rem]">
                            Create a project, connect the SDK, and monitor errors like a modern Sentry-style workflow.
                        </h1>

                        <p className="mt-5 max-w-3xl text-[17px] leading-9 text-[var(--enterprise-text-muted)]">
                            This dashboard is now your public product entry. It explains the setup flow,
                            points people toward the right SDK, and opens a guided project creation experience.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <PrimaryButton label="Create Project" onClick={() => openSetup()} />
                            <SecondaryButton
                                label="Open Projects Workspace"
                                onClick={() => navigate('/projects')}
                            />
                            <SecondaryButton
                                label="Open Issues"
                                onClick={() => navigate('/issues')}
                            />
                        </div>
                    </div>
                </section>

                <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    {FEATURE_CARDS.map((item) => (
                        <FeatureCard
                            key={item.title}
                            title={item.title}
                            description={item.description}
                        />
                    ))}
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <DashboardSectionCard
                        title="Current Dashboard Workspace"
                        description="Use the main dashboard to connect a real project before moving into issue tracking."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="space-y-5">
                            <div className="enterprise-panel-soft rounded-[24px] border border-[var(--enterprise-border)] p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">
                                            Connected scope
                                        </div>
                                        <h3 className="mt-2 text-xl font-semibold text-white">
                                            {connectedProject?.name ??
                                                (hasApiKey
                                                    ? 'Validating connected project'
                                                    : 'No project connected yet')}
                                        </h3>
                                    </div>
                                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)]">
                                        {API_KEY_SOURCE_LABELS[apiKeySource]}
                                    </span>
                                </div>

                                <p className="mt-3 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    {connectedProject
                                        ? 'The dashboard is already pointed at a real project. You can jump straight into Issues.'
                                        : 'If someone already has a project API key, they can connect this dashboard from here instead of landing on synthetic data first.'}
                                </p>

                                {connectedProject ? (
                                    <div className="mt-5 rounded-[18px] border border-white/8 bg-black/35 p-4">
                                        <div className="text-xs uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                            Project key
                                        </div>
                                        <div className="mt-2 break-all font-mono text-[13px] text-white">
                                            {connectedProject.key}
                                        </div>
                                    </div>
                                ) : null}

                                {workspaceLoading ? (
                                    <div className="mt-5 text-sm animate-pulse text-[var(--enterprise-text-dim)]">
                                        Verifying dashboard workspace...
                                    </div>
                                ) : null}

                                {workspaceError ? (
                                    <div className="mt-5 rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                        {workspaceError}
                                    </div>
                                ) : null}

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <PrimaryButton
                                        label="Open Issues"
                                        onClick={() => navigate('/issues')}
                                    />
                                    <SecondaryButton
                                        label="Refresh Workspace"
                                        onClick={() => void refreshWorkspace()}
                                    />
                                    {apiKeySource === 'runtime' ? (
                                        <SecondaryButton
                                            label="Clear Browser Override"
                                            onClick={() => void handleClearOverride()}
                                        />
                                    ) : null}
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-[var(--enterprise-border)] bg-black/30 p-5">
                                <div className="text-sm font-semibold text-white">
                                    Connect with an API key
                                </div>
                                <p className="mt-2 text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Paste an existing project API key to point this dashboard at a
                                    real workspace immediately.
                                </p>

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                                    <input
                                        type="text"
                                        value={connectApiKeyInput}
                                        onChange={(event) => setConnectApiKeyInput(event.target.value)}
                                        placeholder="set_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                        className="w-full rounded-2xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-3.5 text-[15px] text-white outline-none placeholder:text-[var(--enterprise-text-dim)] focus:border-orange-500/35"
                                    />
                                    <PrimaryButton
                                        label="Use API Key"
                                        onClick={() => void handleConnectApiKey()}
                                    />
                                </div>

                                {connectError ? (
                                    <div className="mt-4 rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                        {connectError}
                                    </div>
                                ) : null}

                                {connectSuccess ? (
                                    <div className="mt-4 rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                                        {connectSuccess}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Recent Local Projects"
                        description="The dashboard should acknowledge real projects before showing deeper investigation work."
                        contentClassName="p-6"
                        variant="enterprise"
                        action={
                            hasAdminConsoleAccess ? (
                                <button
                                    type="button"
                                    onClick={() => void refreshProjects()}
                                    className="rounded-full border border-[var(--enterprise-border)] bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-muted)] transition-colors hover:text-white"
                                >
                                    Refresh
                                </button>
                            ) : undefined
                        }
                    >
                        {!hasAdminConsoleAccess ? (
                            <div className="enterprise-panel-muted rounded-[22px] px-5 py-10 text-center">
                                <h3 className="text-lg font-semibold text-white">
                                    Admin project listing is disabled
                                </h3>
                                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Set `VITE_ADMIN_TOKEN` for local admin access, or create a project
                                    from the API seed script and connect it with its raw API key.
                                </p>
                            </div>
                        ) : projectsLoading ? (
                            <div className="space-y-4">
                                {[0, 1, 2].map((index) => (
                                    <div
                                        key={index}
                                        className="enterprise-panel-soft rounded-[22px] border border-[var(--enterprise-border)] p-5 animate-pulse"
                                    >
                                        <div className="h-5 w-36 rounded bg-white/7" />
                                        <div className="mt-3 h-4 w-44 rounded bg-white/6" />
                                    </div>
                                ))}
                            </div>
                        ) : projectsError ? (
                            <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                {projectsError}
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="enterprise-panel-muted rounded-[22px] px-5 py-10 text-center">
                                <h3 className="text-lg font-semibold text-white">No projects yet</h3>
                                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Start with project creation from the modal above, then use the
                                    generated API key to connect the dashboard workspace.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {projects.slice(0, 3).map((project) => (
                                    <ProjectPreviewCard key={project.id} project={project} />
                                ))}
                                <div className="pt-2">
                                    <SecondaryButton
                                        label="Open Projects Workspace"
                                        onClick={() => navigate('/projects')}
                                    />
                                </div>
                            </div>
                        )}
                    </DashboardSectionCard>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                    <DashboardSectionCard
                        title="Supported SDK Integrations"
                        description="Choose the stack you use, then open the guided setup flow."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            {INTEGRATIONS.map((integration) => (
                                <IntegrationCard
                                    key={integration.key}
                                    integration={integration}
                                    onSelect={() => openSetup(integration.key)}
                                />
                            ))}
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="How Setup Flows"
                        description="A simpler, more readable product entry that leads people into the real workspaces."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="space-y-4">
                            {FLOW_CARDS.map((item) => (
                                <FlowCard
                                    key={item.step}
                                    step={item.step}
                                    title={item.title}
                                    description={item.description}
                                />
                            ))}
                        </div>
                    </DashboardSectionCard>
                </div>
            </main>

            <SetupModal
                open={setupOpen}
                onClose={closeSetup}
                selectedIntegration={activeIntegration}
                onSelectIntegration={setSelectedIntegration}
                projectName={projectName}
                keyLabel={keyLabel}
                setProjectName={setProjectName}
                setKeyLabel={setKeyLabel}
                submitting={submitting}
                onSubmit={() => void handleCreateProject()}
                onUseDashboardApiKey={(apiKey) => void handleConnectApiKey(apiKey)}
                createError={createError}
                createdProject={createdProject}
            />
        </div>
    );
}
