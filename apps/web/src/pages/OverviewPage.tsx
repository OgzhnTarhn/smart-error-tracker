import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import OverviewMetricCard from '../components/dashboard/OverviewMetricCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useAdminProjects } from '../hooks/useAdminProjects';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { hasAdminConsoleAccess } from '../lib/api';
import {
    buildProjectCatalog,
    getPlatformLabel,
    getRuntimeTypeLabel,
} from '../lib/projectRecords';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
});

function formatRelativeTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'recently';

    const diffMs = date.getTime() - Date.now();
    const absDiff = Math.abs(diffMs);
    const units: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
        { unit: 'day', ms: 86_400_000 },
        { unit: 'hour', ms: 3_600_000 },
        { unit: 'minute', ms: 60_000 },
    ];

    for (const { unit, ms } of units) {
        if (absDiff >= ms || unit === 'minute') {
            return RELATIVE_FORMATTER.format(Math.round(diffMs / ms), unit);
        }
    }

    return 'just now';
}

function formatDate(value: string | null) {
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

function ChecklistItem({
    title,
    description,
    complete,
}: {
    title: string;
    description: string;
    complete: boolean;
}) {
    return (
        <div className="enterprise-panel-soft flex items-start gap-4 rounded-[22px] border border-[var(--enterprise-border)] p-4">
            <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                    complete
                        ? 'border-emerald-500/25 bg-emerald-500/12 text-emerald-200'
                        : 'border-white/10 bg-white/[0.03] text-[var(--enterprise-text-dim)]'
                }`}
            >
                {complete ? '✓' : '•'}
            </div>
            <div className="min-w-0">
                <div className="text-sm font-semibold text-white">{title}</div>
                <p className="mt-1 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                    {description}
                </p>
            </div>
        </div>
    );
}

function RecentProjectItem({
    name,
    platform,
    runtimeType,
    createdAt,
    onOpen,
}: {
    name: string;
    platform: string;
    runtimeType: string;
    createdAt: string | null;
    onOpen: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="enterprise-panel-soft w-full rounded-[22px] border border-[var(--enterprise-border)] p-4 text-left transition-colors hover:border-orange-500/25 hover:bg-[#18110d]"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{name}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-blue-100">
                            {platform}
                        </span>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[var(--enterprise-text-muted)]">
                            {runtimeType}
                        </span>
                    </div>
                </div>
                <span className="text-xs text-[var(--enterprise-text-dim)]">
                    {formatDate(createdAt)}
                </span>
            </div>
        </button>
    );
}

function RecentIssuePreview({
    title,
    status,
    eventCount,
    lastSeenAt,
    onOpen,
}: {
    title: string;
    status: string;
    eventCount: number;
    lastSeenAt: string;
    onOpen: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="enterprise-panel-soft flex w-full items-center justify-between gap-4 rounded-[22px] border border-[var(--enterprise-border)] p-4 text-left transition-colors hover:border-orange-500/25 hover:bg-[#18110d]"
        >
            <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">{title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-orange-100">
                        {status}
                    </span>
                    <span className="text-[var(--enterprise-text-muted)]">
                        {eventCount.toLocaleString()} events
                    </span>
                </div>
            </div>
            <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-white">
                    {formatRelativeTime(lastSeenAt)}
                </div>
                <div className="mt-1 text-xs text-[var(--enterprise-text-dim)]">
                    {formatDate(lastSeenAt)}
                </div>
            </div>
        </button>
    );
}

export default function OverviewPage() {
    const navigate = useNavigate();
    const {
        projects: adminProjects,
        loading: projectsLoading,
        error: projectsError,
    } = useAdminProjects();
    const { project: connectedProject, hasApiKey } = useDashboardProjectContext();
    const { stats, loading: statsLoading, error: statsError } = useDashboardStats('7d', hasApiKey);

    const catalog = useMemo(
        () =>
            buildProjectCatalog({
                adminProjects,
                connectedProject,
            }),
        [adminProjects, connectedProject],
    );

    const latestIssue = useMemo(() => {
        const items = [...(stats?.topIssues ?? [])];
        items.sort(
            (left, right) =>
                Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt),
        );
        return items[0] ?? null;
    }, [stats?.topIssues]);

    const checklistItems = [
        {
            title: 'Create project',
            description: 'Start with a named project for each application or service.',
            complete: catalog.length > 0,
        },
        {
            title: 'Get API key',
            description: 'Generate or save the raw API key used by the SDK.',
            complete: Boolean(catalog.find((item) => item.apiKey) || hasApiKey),
        },
        {
            title: 'Integrate SDK',
            description: 'Copy the setup snippet that matches your runtime.',
            complete: Boolean(connectedProject),
        },
        {
            title: 'Send test event',
            description: 'Trigger one test exception to confirm the pipeline works.',
            complete: (stats?.totals.totalEvents ?? 0) > 0,
        },
    ];

    const dashboardAlerts = [projectsError, statsError].filter(Boolean);

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="dashboard" showSearch={false} />

            <main className="mx-auto max-w-[1480px] px-5 py-6 md:px-6 xl:px-8 xl:py-8">
                <section className="enterprise-panel relative overflow-hidden rounded-[32px] border border-[var(--enterprise-border)] px-6 py-8 sm:px-8 sm:py-10">
                    <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_58%)]" />
                    <div className="relative max-w-4xl">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="enterprise-chip">Dashboard</span>
                            <span className="text-sm font-medium text-[var(--enterprise-text-dim)]">
                                Smart Error Tracker onboarding
                            </span>
                        </div>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-[3.4rem]">
                            Create your first project, wire the SDK, then move straight into issue investigation.
                        </h1>

                        <p className="mt-5 max-w-3xl text-[17px] leading-9 text-[var(--enterprise-text-muted)]">
                            Keep the product entry simple: start from project creation, finish setup,
                            and open a focused issues workspace once events begin to arrive.
                        </p>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <PrimaryButton
                                label="Create Project"
                                onClick={() => navigate('/projects/new')}
                            />
                            <SecondaryButton
                                label="Browse Projects"
                                onClick={() => navigate('/projects')}
                            />
                        </div>
                    </div>
                </section>

                {dashboardAlerts.length > 0 ? (
                    <div className="mt-6 space-y-3">
                        {dashboardAlerts.map((alert) => (
                            <div
                                key={alert}
                                className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100"
                            >
                                {alert}
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <OverviewMetricCard
                        label="Total Projects"
                        value={catalog.length}
                        accentClass="enterprise-metric-accent-orange"
                        loading={projectsLoading && catalog.length === 0}
                        supportingText={
                            hasAdminConsoleAccess
                                ? 'Visible in the local admin workspace.'
                                : 'Counting drafts and connected projects stored in this browser.'
                        }
                        variant="enterprise"
                    />
                    <OverviewMetricCard
                        label="Open Issues"
                        value={stats?.totals.openIssues ?? 0}
                        accentClass="enterprise-metric-accent-red"
                        loading={hasApiKey && statsLoading && !stats}
                        supportingText={
                            connectedProject
                                ? `Live count for ${connectedProject.name}.`
                                : 'Connect a project API key to load live issue counts.'
                        }
                        variant="enterprise"
                    />
                    <OverviewMetricCard
                        label="Last Event"
                        value={latestIssue ? formatRelativeTime(latestIssue.lastSeenAt) : 'Awaiting traffic'}
                        accentClass="enterprise-metric-accent-blue"
                        loading={hasApiKey && statsLoading && !stats}
                        supportingText={
                            latestIssue
                                ? latestIssue.title
                                : 'No event has reached the active workspace yet.'
                        }
                        variant="enterprise"
                    />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                    <DashboardSectionCard
                        title="Onboarding"
                        description="Move through the product in the same order new users should see it."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="space-y-4">
                            {checklistItems.map((item) => (
                                <ChecklistItem
                                    key={item.title}
                                    title={item.title}
                                    description={item.description}
                                    complete={item.complete}
                                />
                            ))}
                        </div>

                        <div className="mt-5 rounded-[22px] border border-[var(--enterprise-border)] bg-black/30 p-5">
                            <div className="text-sm font-semibold text-white">Workspace note</div>
                            <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                {connectedProject
                                    ? `The dashboard is currently connected to ${connectedProject.name}. You can continue into issues as soon as setup is complete.`
                                    : 'No live project is connected yet. Create a project or paste a real API key during setup.'}
                            </p>
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Recent Projects"
                        description="Latest projects visible to this dashboard session."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        {catalog.length === 0 ? (
                            <div className="enterprise-panel-muted rounded-[22px] px-5 py-10 text-center">
                                <h3 className="text-lg font-semibold text-white">No projects yet</h3>
                                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Start by creating a project. The setup route will take over from there.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {catalog.slice(0, 3).map((project) => (
                                    <RecentProjectItem
                                        key={project.id}
                                        name={project.name}
                                        platform={getPlatformLabel(project.platform)}
                                        runtimeType={getRuntimeTypeLabel(project.runtimeType)}
                                        createdAt={project.createdAt}
                                        onOpen={() => navigate(`/projects/${project.id}/setup`)}
                                    />
                                ))}
                            </div>
                        )}
                    </DashboardSectionCard>
                </div>

                <div className="mt-6">
                    <DashboardSectionCard
                        title="Recent Issues Preview"
                        description="Stay focused on the onboarding path while keeping the latest issue pressure visible."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        {!hasApiKey ? (
                            <div className="enterprise-panel-muted rounded-[22px] px-5 py-12 text-center">
                                <h3 className="text-lg font-semibold text-white">
                                    Live issue preview unlocks after project setup
                                </h3>
                                <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    Create a project, save a real API key, then send one test event to
                                    turn this preview into the live issues stream.
                                </p>
                            </div>
                        ) : statsLoading && !stats ? (
                            <div className="space-y-3 animate-pulse">
                                {[0, 1, 2].map((index) => (
                                    <div
                                        key={index}
                                        className="enterprise-panel-soft h-24 rounded-[22px] border border-[var(--enterprise-border)]"
                                    />
                                ))}
                            </div>
                        ) : (stats?.topIssues?.length ?? 0) === 0 ? (
                            <div className="enterprise-panel-muted rounded-[22px] px-5 py-12 text-center">
                                <h3 className="text-lg font-semibold text-white">No issues yet</h3>
                                <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-8 text-[var(--enterprise-text-muted)]">
                                    The project is connected, but there is no issue traffic yet. Use the
                                    setup guide to send a test event and verify the end-to-end flow.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(stats?.topIssues ?? []).slice(0, 4).map((issue) => (
                                    <RecentIssuePreview
                                        key={issue.id}
                                        title={issue.title}
                                        status={issue.status}
                                        eventCount={issue.eventCount}
                                        lastSeenAt={issue.lastSeenAt}
                                        onOpen={() => navigate(`/issues/${issue.id}`)}
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
