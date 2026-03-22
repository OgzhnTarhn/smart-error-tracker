import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useAdminProjects } from '../hooks/useAdminProjects';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import { hasAdminConsoleAccess } from '../lib/api';
import {
    buildProjectCatalog,
    getPlatformLabel,
    getRuntimeTypeLabel,
    type ProjectCatalogItem,
} from '../lib/projectRecords';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

function formatCreatedAt(value: string | null, isDraft: boolean) {
    if (isDraft) return 'Local draft';
    if (!value) return 'Date unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return DATE_FORMATTER.format(date);
}

function PrimaryButton({
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
            className="rounded-full border border-orange-400/20 bg-orange-500/15 px-5 py-3 text-sm font-semibold text-orange-100 transition-colors hover:border-orange-400/30 hover:bg-orange-500/20"
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

function ProjectCard({
    project,
    onOpenSetup,
    onOpenIssues,
}: {
    project: ProjectCatalogItem;
    onOpenSetup: () => void;
    onOpenIssues: () => void;
}) {
    return (
        <div className="enterprise-panel-soft rounded-[24px] border border-[var(--enterprise-border)] p-5">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-xl font-semibold text-white">
                            {project.name}
                        </h2>
                        {project.isConnected ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                                Connected
                            </span>
                        ) : null}
                        {project.isDraft ? (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                                Draft
                            </span>
                        ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-blue-100">
                            {getPlatformLabel(project.platform)}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[var(--enterprise-text-muted)]">
                            {getRuntimeTypeLabel(project.runtimeType)}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[var(--enterprise-text-muted)]">
                            Created {formatCreatedAt(project.createdAt, project.isDraft)}
                        </span>
                    </div>
                </div>

                <div className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)]">
                    {project.apiKeyCount} key{project.apiKeyCount === 1 ? '' : 's'}
                </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-[var(--enterprise-border)] bg-black/30 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                    Project key
                </div>
                <div className="mt-2 break-all font-mono text-sm text-white">
                    {project.key ?? 'Will be generated after creating a real project'}
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
                <PrimaryButton label="Open Setup" onClick={onOpenSetup} />
                <SecondaryButton label="Open Issues" onClick={onOpenIssues} />
            </div>
        </div>
    );
}

export default function ProjectsPage() {
    const navigate = useNavigate();
    const {
        projects: adminProjects,
        loading,
        error,
        refresh,
    } = useAdminProjects();
    const { project: connectedProject } = useDashboardProjectContext();

    const catalog = useMemo(
        () =>
            buildProjectCatalog({
                adminProjects,
                connectedProject,
            }),
        [adminProjects, connectedProject],
    );

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation
                activeItem="projects"
                projectName={connectedProject?.name}
            />

            <main className="mx-auto max-w-[1480px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="enterprise-chip">Projects</span>
                                <span className="text-xs text-[var(--enterprise-text-muted)]">
                                    {'Dashboard -> Create Project -> Project Setup -> Issues'}
                                </span>
                            </div>
                            <h1 className="mt-4 max-w-5xl text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                                Project workspace
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                Keep project creation and setup clear. Existing issue investigation
                                stays available through the dedicated issues routes.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            {hasAdminConsoleAccess ? (
                                <SecondaryButton
                                    label={loading ? 'Refreshing...' : 'Refresh'}
                                    onClick={() => void refresh()}
                                />
                            ) : null}
                            <PrimaryButton
                                label="New Project"
                                onClick={() => navigate('/projects/new')}
                            />
                        </div>
                    </div>
                </section>

                {error ? (
                    <div className="mt-6 rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                        {error}
                    </div>
                ) : null}

                <div className="mt-6">
                    <DashboardSectionCard
                        title="Project List"
                        description={
                            hasAdminConsoleAccess
                                ? 'Projects are read from the local admin endpoints and enriched with browser-side onboarding metadata.'
                                : 'Admin listing is unavailable, so this view falls back to connected projects and local drafts.'
                        }
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        {loading && catalog.length === 0 ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {[0, 1].map((index) => (
                                    <div
                                        key={index}
                                        className="enterprise-panel-soft h-64 animate-pulse rounded-[24px] border border-[var(--enterprise-border)]"
                                    />
                                ))}
                            </div>
                        ) : catalog.length === 0 ? (
                            <div className="enterprise-panel-muted rounded-[22px] px-5 py-14 text-center">
                                <h3 className="text-xl font-semibold text-white">No projects yet</h3>
                                <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Create your first project to unlock the guided setup page and
                                    connect the dashboard to a real issues stream.
                                </p>
                                <div className="mt-6">
                                    <PrimaryButton
                                        label="Create Project"
                                        onClick={() => navigate('/projects/new')}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {catalog.map((project) => (
                                    <ProjectCard
                                        key={project.id}
                                        project={project}
                                        onOpenSetup={() =>
                                            navigate(`/projects/${project.id}/setup`)
                                        }
                                        onOpenIssues={() =>
                                            navigate(`/projects/${project.id}/issues`)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </DashboardSectionCard>
                </div>
            </main>
        </div>
    );
}
