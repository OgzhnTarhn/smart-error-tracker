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
            className="ui-primary-button h-9 px-3 text-sm font-semibold"
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
            className="ui-secondary-button h-9 px-3 text-sm font-semibold"
        >
            {label}
        </button>
    );
}

function ProjectCard({
    project,
    onOpenProject,
    onOpenSetup,
}: {
    project: ProjectCatalogItem;
    onOpenProject: () => void;
    onOpenSetup: () => void;
}) {
    return (
        <div className="px-4 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
                    <div className="min-w-0 xl:w-[220px]">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-sm font-medium text-[var(--enterprise-text)]">
                                {project.name}
                            </h2>
                            {project.isConnected ? (
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                                    Connected
                                </span>
                            ) : null}
                            {project.isDraft ? (
                                <span className="rounded-full border border-amber-600/20 bg-amber-600/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                                    Draft
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-blue-200">
                            {getPlatformLabel(project.platform)}
                        </span>
                        <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[var(--enterprise-text-muted)]">
                            {getRuntimeTypeLabel(project.runtimeType)}
                        </span>
                        <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[var(--enterprise-text-muted)]">
                            {formatCreatedAt(project.createdAt, project.isDraft)}
                        </span>
                        <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[var(--enterprise-text-muted)]">
                            {project.apiKeyCount} key{project.apiKeyCount === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PrimaryButton label="Open Project" onClick={onOpenProject} />
                    <SecondaryButton label="Open Setup" onClick={onOpenSetup} />
                </div>
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
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <EnterpriseTopNavigation
                activeItem="projects"
                projectName={connectedProject?.name}
            />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="enterprise-chip">Projects</span>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text-muted)]">
                                    {'Dashboard -> Create Project -> Project Setup -> Issues'}
                                </span>
                            </div>
                            <h1 className="mt-3 text-xl font-semibold tracking-tight text-[var(--enterprise-text)] sm:text-2xl">
                                Project workspace
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Keep project creation and setup clear. Existing issue investigation
                                stays available through the dedicated issues routes.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                    <div className="rounded-md border border-amber-600/20 bg-amber-600/10 px-3.5 py-3 text-sm text-amber-200">
                        {error}
                    </div>
                ) : null}

                <DashboardSectionCard
                    title="Project List"
                    description={
                        hasAdminConsoleAccess
                            ? 'Projects are read from the local admin endpoints and enriched with browser-side onboarding metadata.'
                            : 'Admin listing is unavailable, so this view falls back to connected projects and local drafts.'
                    }
                    contentClassName="p-0"
                    variant="enterprise"
                >
                    {loading && catalog.length === 0 ? (
                        <div className="p-4">
                            <div className="space-y-3">
                                {[0, 1, 2].map((index) => (
                                    <div
                                        key={index}
                                        className="enterprise-panel-soft h-20 rounded-md"
                                    />
                                ))}
                            </div>
                        </div>
                    ) : catalog.length === 0 ? (
                        <div className="p-4">
                            <div className="enterprise-panel-muted flex min-h-[220px] items-center justify-center rounded-md px-4 py-8 text-center">
                                <div>
                                    <h3 className="text-base font-semibold text-[var(--enterprise-text)]">
                                        No projects yet
                                    </h3>
                                    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                        Create your first project to unlock the guided setup page and
                                        connect the dashboard to a real issues stream.
                                    </p>
                                    <div className="mt-5">
                                        <PrimaryButton
                                            label="Create Project"
                                            onClick={() => navigate('/projects/new')}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--enterprise-border)]">
                            {catalog.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    onOpenProject={() => navigate(`/projects/${project.id}`)}
                                    onOpenSetup={() =>
                                        navigate(`/projects/${project.id}/setup`)
                                    }
                                />
                            ))}
                        </div>
                    )}
                </DashboardSectionCard>
            </main>
        </div>
    );
}
