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
            className="ui-primary-button h-9 px-3 text-sm font-semibold"
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
            className="ui-secondary-button h-9 px-3 text-sm font-semibold"
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
        <div className="mb-4">
            <div className="ui-accent-text text-[10px] font-semibold uppercase tracking-[0.18em]">
                {step}
            </div>
            <h2 className="mt-1.5 text-lg font-semibold text-[var(--enterprise-text)]">
                {title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                {description}
            </p>
        </div>
    );
}

function KeyHistoryRow({ item }: { item: AdminProjectApiKeyListItem }) {
    return (
        <div className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--enterprise-text)]">
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
            <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
                <EnterpriseTopNavigation activeItem="projects" showSearch={false} />
                <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
                    <div className="enterprise-panel-soft h-64 animate-pulse rounded-md" />
                </main>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
                <EnterpriseTopNavigation activeItem="projects" showSearch={false} />
                <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
                    <DashboardSectionCard
                        title="Project Not Found"
                        description="This project is no longer available in the current browser session."
                        className="mx-auto w-full max-w-2xl"
                        contentClassName="p-4"
                        variant="enterprise"
                    >
                        <div className="space-y-3">
                            {projectsError ? (
                                <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm">
                                    {projectsError}
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
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

    const handleOpenProject = async () => {
        if (projectApiKey) {
            setDashboardApiKey(projectApiKey);
            await refreshWorkspace();
        }

        navigate(`/projects/${id}`);
    };

    return (
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <EnterpriseTopNavigation
                activeItem="projects"
                projectName={connectedProject?.name}
                showSearch={false}
            />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="enterprise-chip">Project Setup</span>
                                <span className="ui-accent-badge rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                                    {getPlatformLabel(project.platform)}
                                </span>
                                <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)]">
                                    {getRuntimeTypeLabel(project.runtimeType)}
                                </span>
                                {project.isDraft ? (
                                    <span className="ui-warning-badge rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                                        Draft
                                    </span>
                                ) : null}
                            </div>
                            <h1 className="mt-3 max-w-4xl text-xl font-semibold tracking-tight text-[var(--enterprise-text)] sm:text-2xl">
                                {project.name}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Use this page as the onboarding guide: install the SDK, initialize
                                the project, add the API key, and send one test event before opening
                                the issues workspace.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <SecondaryButton
                                label="Back to Projects"
                                onClick={() => navigate('/projects')}
                            />
                            <PrimaryButton
                                label="Open Project"
                                onClick={() => void handleOpenProject()}
                            />
                        </div>
                    </div>
                </section>

                {projectsError ? (
                    <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm">
                        {projectsError}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,340px)]">
                    <div className="space-y-6">
                        <DashboardSectionCard
                            title="Step 1: Install SDK"
                            description="Start with the package that matches this platform."
                            contentClassName="p-4"
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
                            contentClassName="p-4"
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
                            contentClassName="p-4"
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

                            <div className="mt-4 rounded-md border border-[var(--enterprise-border)] bg-[#16181b] p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="ui-accent-text text-[10px] font-semibold uppercase tracking-[0.16em]">
                                            Current API key
                                        </div>
                                        <div className="mt-1.5 break-all font-mono text-xs text-[var(--enterprise-text)]">
                                            {projectApiKey || 'YOUR_PROJECT_KEY'}
                                        </div>
                                    </div>
                                    <CopyButton
                                        label="api key"
                                        value={projectApiKey || 'YOUR_PROJECT_KEY'}
                                    />
                                </div>

                                <p className="mt-3 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    {projectApiKey
                                        ? 'A real API key is saved in this browser session and can be used by the dashboard immediately.'
                                        : project.isDraft
                                            ? 'This draft has no backend key yet. Complete the real project creation path to replace the placeholder.'
                                            : hasAdminConsoleAccess
                                                ? 'Generate a fresh API key below if you need a real value for this project.'
                                                : 'Key generation requires local admin access, so the placeholder remains visible for now.'}
                                </p>

                                {!project.isDraft && hasAdminConsoleAccess ? (
                                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                        <input
                                            type="text"
                                            value={keyLabel}
                                            onChange={(event) => setKeyLabel(event.target.value)}
                                            placeholder="production"
                                            className="ui-input h-9 w-full px-3 text-sm"
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

                                <div className="mt-4 flex flex-wrap gap-2">
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
                                    <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-100">
                                        {actionError}
                                    </div>
                                ) : null}

                                {actionSuccess ? (
                                    <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-200">
                                        {actionSuccess}
                                    </div>
                                ) : null}
                            </div>
                        </DashboardSectionCard>

                        <DashboardSectionCard
                            title="Step 4: Send test event"
                            description="Confirm the end-to-end path before handing off to the issues workspace."
                            contentClassName="p-4"
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
                            contentClassName="p-4"
                            variant="enterprise"
                        >
                            <div className="space-y-3">
                                <div className="enterprise-panel-soft rounded-md p-3.5">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        Project
                                    </div>
                                    <div className="mt-1.5 text-sm font-semibold text-[var(--enterprise-text)]">
                                        {project.name}
                                    </div>
                                </div>
                                <div className="enterprise-panel-soft rounded-md p-3.5">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        Created
                                    </div>
                                    <div className="mt-1.5 text-sm text-[var(--enterprise-text)]">
                                        {formatDateTime(project.createdAt)}
                                    </div>
                                </div>
                                <div className="enterprise-panel-soft rounded-md p-3.5">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        Connection status
                                    </div>
                                    <div className="mt-1.5 text-sm text-[var(--enterprise-text)]">
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
                            contentClassName="p-4"
                            variant="enterprise"
                        >
                            <div className="space-y-2">
                                {setupGuide.notes.map((note) => (
                                    <div
                                        key={note}
                                        className="enterprise-panel-soft rounded-md px-3.5 py-3 text-sm leading-6 text-[var(--enterprise-text-muted)]"
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
                                contentClassName="p-4"
                                variant="enterprise"
                            >
                                {keyHistoryLoading ? (
                                    <div className="space-y-2 animate-pulse">
                                        {[0, 1].map((index) => (
                                            <div
                                                key={index}
                                                className="enterprise-panel-soft h-16 rounded-md"
                                            />
                                        ))}
                                    </div>
                                ) : keyHistoryError ? (
                                    <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-100">
                                        {keyHistoryError}
                                    </div>
                                ) : apiKeys.length === 0 ? (
                                    <div className="rounded-md border border-[var(--enterprise-border)] bg-[#16181b] px-3.5 py-3 text-sm text-[var(--enterprise-text-muted)]">
                                        No stored key metadata yet.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[var(--enterprise-border)]">
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
