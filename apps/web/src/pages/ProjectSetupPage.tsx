import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import CodeSnippetCard from '../components/onboarding/CodeSnippetCard';
import CopyButton from '../components/onboarding/CopyButton';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useAdminProjects } from '../hooks/useAdminProjects';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import {
    createAdminProjectApiKey,
    getAdminProjectApiKeys,
    hasAdminConsoleAccess,
    setDashboardApiKey,
    type AdminProjectApiKeyListItem,
} from '../lib/api';
import { getProjectSetupGuide } from '../lib/projectOnboarding';
import {
    buildProjectCatalog,
    getPlatformLabel,
    getRuntimeTypeLabel,
    getStoredProjectRecord,
    upsertStoredProjectRecord,
} from '../lib/projectRecords';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function formatDateTime(value: string | null) {
    if (!value) return 'Date unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return DATE_FORMATTER.format(date);
}

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
            className="rounded-full border border-[var(--enterprise-border)] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[var(--enterprise-text-muted)] transition-colors hover:border-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
            {label}
        </button>
    );
}

function StepHeader({
    step,
    title,
    description,
}: {
    step: string;
    title: string;
    description: string;
}) {
    return (
        <div className="mb-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-200">
                {step}
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                {description}
            </p>
        </div>
    );
}

function KeyHistoryRow({ item }: { item: AdminProjectApiKeyListItem }) {
    return (
        <div className="enterprise-panel-soft flex items-center justify-between gap-4 rounded-[18px] border border-[var(--enterprise-border)] px-4 py-3">
            <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                    {item.label ?? 'Generated key'}
                </div>
                <div className="mt-1 text-xs text-[var(--enterprise-text-dim)]">
                    Created {formatDateTime(item.createdAt)}
                </div>
            </div>
            <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                    item.revokedAt
                        ? 'border border-red-500/20 bg-red-500/10 text-red-100'
                        : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                }`}
            >
                {item.revokedAt ? 'Revoked' : 'Active'}
            </span>
        </div>
    );
}

export default function ProjectSetupPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        projects: adminProjects,
        loading: projectsLoading,
        error: projectsError,
        refresh: refreshProjects,
    } = useAdminProjects();
    const {
        project: connectedProject,
        loading: workspaceLoading,
        refresh: refreshWorkspace,
    } = useDashboardProjectContext();
    const [storedProject, setStoredProject] = useState(() =>
        id ? getStoredProjectRecord(id) : null,
    );
    const [keyLabel, setKeyLabel] = useState(storedProject?.keyLabel ?? 'default');
    const [apiKeys, setApiKeys] = useState<AdminProjectApiKeyListItem[]>([]);
    const [keyHistoryLoading, setKeyHistoryLoading] = useState(false);
    const [keyHistoryError, setKeyHistoryError] = useState<string | null>(null);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    useEffect(() => {
        setStoredProject(id ? getStoredProjectRecord(id) : null);
    }, [id]);

    useEffect(() => {
        setKeyLabel(storedProject?.keyLabel ?? 'default');
    }, [storedProject?.keyLabel]);

    const catalog = useMemo(
        () =>
            buildProjectCatalog({
                adminProjects,
                connectedProject,
            }),
        [adminProjects, connectedProject],
    );

    const project = useMemo(
        () => catalog.find((item) => item.id === id) ?? null,
        [catalog, id],
    );

    const projectApiKey = project?.apiKey ?? storedProject?.apiKey ?? '';
    const setupGuide = getProjectSetupGuide(
        project?.platform ?? storedProject?.platform ?? 'other',
        project?.runtimeType ?? storedProject?.runtimeType ?? 'backend',
        projectApiKey || 'YOUR_PROJECT_KEY',
    );

    useEffect(() => {
        if (!id || !project || project.isDraft || !hasAdminConsoleAccess) {
            setApiKeys([]);
            setKeyHistoryLoading(false);
            setKeyHistoryError(null);
            return;
        }

        let active = true;
        setKeyHistoryLoading(true);
        setKeyHistoryError(null);

        void getAdminProjectApiKeys(id)
            .then((response) => {
                if (!active) return;
                if (!response.ok) {
                    throw new Error(response.error ?? 'Failed to load API key history.');
                }

                setApiKeys(response.keys ?? []);
            })
            .catch((err: unknown) => {
                if (!active) return;
                setKeyHistoryError(
                    err instanceof Error ? err.message : 'Failed to load API key history.',
                );
                setApiKeys([]);
            })
            .finally(() => {
                if (active) setKeyHistoryLoading(false);
            });

        return () => {
            active = false;
        };
    }, [id, project]);

    if (!id) {
        return <Navigate to="/projects" replace />;
    }

    if (!project && (projectsLoading || workspaceLoading)) {
        return (
            <div className="enterprise-shell min-h-screen text-slate-100">
                <EnterpriseTopNavigation activeItem="projects" showSearch={false} />
                <main className="mx-auto max-w-[1480px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                    <div className="enterprise-panel-soft h-80 animate-pulse rounded-[30px] border border-[var(--enterprise-border)]" />
                </main>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="enterprise-shell min-h-screen text-slate-100">
                <EnterpriseTopNavigation activeItem="projects" showSearch={false} />
                <main className="mx-auto max-w-[920px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                    <DashboardSectionCard
                        title="Project Not Found"
                        description="This project is no longer available in the current browser session."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="space-y-4">
                            {projectsError ? (
                                <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                                    {projectsError}
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-3">
                                <PrimaryButton
                                    label="Back to Projects"
                                    onClick={() => navigate('/projects')}
                                />
                                <SecondaryButton
                                    label="Create Project"
                                    onClick={() => navigate('/projects/new')}
                                />
                            </div>
                        </div>
                    </DashboardSectionCard>
                </main>
            </div>
        );
    }

    const handleGenerateKey = async () => {
        if (!id || project.isDraft) return;

        setGeneratingKey(true);
        setActionError(null);
        setActionSuccess(null);

        try {
            const label = keyLabel.trim() || 'default';
            const response = await createAdminProjectApiKey(id, { label });
            if (!response.ok || !response.apiKey) {
                throw new Error(response.error ?? 'API key could not be generated.');
            }

            const nextStoredProject = upsertStoredProjectRecord(id, {
                name: project.name,
                key: project.key,
                platform: project.platform,
                runtimeType: project.runtimeType,
                createdAt: project.createdAt ?? new Date().toISOString(),
                apiKey: response.apiKey,
                keyLabel: label,
                isDraft: false,
            });

            setStoredProject(nextStoredProject);
            await refreshProjects();
            try {
                const keysResponse = await getAdminProjectApiKeys(id);
                if (keysResponse.ok) {
                    setApiKeys(keysResponse.keys ?? []);
                }
            } catch {
                // Keep the newly generated key visible even if history refresh fails.
            }
            setActionSuccess('A new API key was generated and saved to this browser.');
        } catch (err: unknown) {
            setActionError(
                err instanceof Error ? err.message : 'API key could not be generated.',
            );
        } finally {
            setGeneratingKey(false);
        }
    };

    const handleUseInDashboard = async () => {
        if (!projectApiKey) {
            setActionSuccess(null);
            setActionError('Generate or save an API key first.');
            return;
        }

        setConnecting(true);
        setActionError(null);
        setActionSuccess(null);

        try {
            setDashboardApiKey(projectApiKey);
            const ok = await refreshWorkspace();
            if (!ok) {
                throw new Error('Dashboard could not verify this API key.');
            }

            setActionSuccess('Dashboard workspace connected successfully.');
        } catch (err: unknown) {
            setActionError(
                err instanceof Error ? err.message : 'Dashboard connection failed.',
            );
        } finally {
            setConnecting(false);
        }
    };

    const handleOpenIssues = async () => {
        if (projectApiKey) {
            setDashboardApiKey(projectApiKey);
            await refreshWorkspace();
        }

        navigate(`/projects/${id}/issues`);
    };

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation
                activeItem="projects"
                projectName={connectedProject?.name}
                showSearch={false}
            />

            <main className="mx-auto max-w-[1480px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="enterprise-chip">Project Setup</span>
                                <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                                    {getPlatformLabel(project.platform)}
                                </span>
                                <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)]">
                                    {getRuntimeTypeLabel(project.runtimeType)}
                                </span>
                                {project.isDraft ? (
                                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100">
                                        Draft
                                    </span>
                                ) : null}
                            </div>
                            <h1 className="mt-4 max-w-5xl text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                                {project.name}
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                Use this page as the onboarding guide: install the SDK, initialize
                                the project, add the API key, and send one test event before opening
                                the issues workspace.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <SecondaryButton
                                label="Back to Projects"
                                onClick={() => navigate('/projects')}
                            />
                            <PrimaryButton
                                label="Open Issues"
                                onClick={() => void handleOpenIssues()}
                            />
                        </div>
                    </div>
                </section>

                {projectsError ? (
                    <div className="mt-6 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                        {projectsError}
                    </div>
                ) : null}

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                    <div className="space-y-6">
                        <DashboardSectionCard
                            title="Step 1: Install SDK"
                            description="Start with the package that matches this platform."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <StepHeader
                                step="Step 1"
                                title="Install SDK"
                                description="Use the package combination below for this project type."
                            />
                            <CodeSnippetCard
                                title="Install command"
                                description="Run from the workspace or application root."
                                code={setupGuide.installCommand}
                                copyLabel="command"
                            />
                        </DashboardSectionCard>

                        <DashboardSectionCard
                            title="Step 2: Initialize project"
                            description="Bootstrap the SDK early so runtime failures are captured immediately."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <StepHeader
                                step="Step 2"
                                title="Initialize project"
                                description={`Suggested file: ${setupGuide.initFileLabel}`}
                            />
                            <CodeSnippetCard
                                title={setupGuide.initFileLabel}
                                description="This snippet stays close to the current README and SDK docs."
                                code={setupGuide.initializeSnippet}
                            />
                        </DashboardSectionCard>

                        <DashboardSectionCard
                            title="Step 3: Add API key"
                            description="Use a real key when available. Otherwise the setup keeps a placeholder visible."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <StepHeader
                                step="Step 3"
                                title="Add API key"
                                description={`Suggested file: ${setupGuide.envFileLabel}`}
                            />
                            <CodeSnippetCard
                                title={setupGuide.envFileLabel}
                                description="Keep the API key and base URL together for easier onboarding."
                                code={setupGuide.apiKeySnippet}
                            />

                            <div className="mt-5 rounded-[22px] border border-[var(--enterprise-border)] bg-black/30 p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">
                                            Current API key
                                        </div>
                                        <div className="mt-2 break-all font-mono text-sm text-white">
                                            {projectApiKey || 'YOUR_PROJECT_KEY'}
                                        </div>
                                    </div>
                                    <CopyButton
                                        label="api key"
                                        value={projectApiKey || 'YOUR_PROJECT_KEY'}
                                    />
                                </div>

                                <p className="mt-3 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                    {projectApiKey
                                        ? 'A real API key is saved in this browser session and can be used by the dashboard immediately.'
                                        : project.isDraft
                                            ? 'This draft has no backend key yet. Complete the real project creation path to replace the placeholder.'
                                            : hasAdminConsoleAccess
                                                ? 'Generate a fresh API key below if you need a real value for this project.'
                                                : 'Key generation requires local admin access, so the placeholder remains visible for now.'}
                                </p>

                                {!project.isDraft && hasAdminConsoleAccess ? (
                                    <div className="mt-5 flex flex-col gap-3 lg:flex-row">
                                        <input
                                            type="text"
                                            value={keyLabel}
                                            onChange={(event) => setKeyLabel(event.target.value)}
                                            placeholder="production"
                                            className="w-full rounded-2xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-3.5 text-[15px] text-white outline-none placeholder:text-[var(--enterprise-text-dim)] focus:border-orange-500/35"
                                        />
                                        <PrimaryButton
                                            label={
                                                generatingKey
                                                    ? 'Generating...'
                                                    : 'Generate New API Key'
                                            }
                                            onClick={() => void handleGenerateKey()}
                                            disabled={generatingKey}
                                        />
                                    </div>
                                ) : null}

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <SecondaryButton
                                        label={
                                            connecting
                                                ? 'Connecting...'
                                                : 'Use API Key In Dashboard'
                                        }
                                        onClick={() => void handleUseInDashboard()}
                                        disabled={connecting || !projectApiKey}
                                    />
                                </div>

                                {actionError ? (
                                    <div className="mt-4 rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                        {actionError}
                                    </div>
                                ) : null}

                                {actionSuccess ? (
                                    <div className="mt-4 rounded-[18px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                                        {actionSuccess}
                                    </div>
                                ) : null}
                            </div>
                        </DashboardSectionCard>

                        <DashboardSectionCard
                            title="Step 4: Send test event"
                            description="Confirm the end-to-end path before handing off to the issues workspace."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <StepHeader
                                step="Step 4"
                                title="Send test event"
                                description={`Suggested location: ${setupGuide.testFileLabel}`}
                            />
                            <CodeSnippetCard
                                title={setupGuide.testFileLabel}
                                description="A single test exception is enough to validate ingestion and issue grouping."
                                code={setupGuide.testEventSnippet}
                            />
                        </DashboardSectionCard>
                    </div>

                    <div className="space-y-6">
                        <DashboardSectionCard
                            title="Project Summary"
                            description="Keep the important context visible while onboarding."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <div className="space-y-4">
                                <div className="enterprise-panel-soft rounded-[20px] border border-[var(--enterprise-border)] p-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Project
                                    </div>
                                    <div className="mt-2 text-lg font-semibold text-white">
                                        {project.name}
                                    </div>
                                </div>
                                <div className="enterprise-panel-soft rounded-[20px] border border-[var(--enterprise-border)] p-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Created
                                    </div>
                                    <div className="mt-2 text-sm text-white">
                                        {formatDateTime(project.createdAt)}
                                    </div>
                                </div>
                                <div className="enterprise-panel-soft rounded-[20px] border border-[var(--enterprise-border)] p-4">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Connection status
                                    </div>
                                    <div className="mt-2 text-sm text-white">
                                        {connectedProject?.id === id
                                            ? 'Dashboard is already pointed at this project.'
                                            : 'Dashboard is not yet pointed at this project.'}
                                    </div>
                                </div>
                            </div>
                        </DashboardSectionCard>

                        <DashboardSectionCard
                            title="Notes"
                            description="Platform-specific reminders for this setup."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <div className="space-y-3">
                                {setupGuide.notes.map((note) => (
                                    <div
                                        key={note}
                                        className="enterprise-panel-soft rounded-[20px] border border-[var(--enterprise-border)] px-4 py-3 text-sm leading-7 text-[var(--enterprise-text-muted)]"
                                    >
                                        {note}
                                    </div>
                                ))}
                            </div>
                        </DashboardSectionCard>

                        {!project.isDraft && hasAdminConsoleAccess ? (
                            <DashboardSectionCard
                                title="API Key History"
                                description="Recent keys created for this project."
                                contentClassName="p-6"
                                variant="enterprise"
                            >
                                {keyHistoryLoading ? (
                                    <div className="space-y-3 animate-pulse">
                                        {[0, 1].map((index) => (
                                            <div
                                                key={index}
                                                className="enterprise-panel-soft h-20 rounded-[18px] border border-[var(--enterprise-border)]"
                                            />
                                        ))}
                                    </div>
                                ) : keyHistoryError ? (
                                    <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                        {keyHistoryError}
                                    </div>
                                ) : apiKeys.length === 0 ? (
                                    <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-[var(--enterprise-text-muted)]">
                                        No stored key metadata yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {apiKeys.map((item) => (
                                            <KeyHistoryRow key={item.id} item={item} />
                                        ))}
                                    </div>
                                )}
                            </DashboardSectionCard>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}
