import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import DistributionListCard from '../components/dashboard/DistributionListCard';
import OverviewMetricCard from '../components/dashboard/OverviewMetricCard';
import TopIssuesCard from '../components/dashboard/TopIssuesCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useAdminProjects } from '../hooks/useAdminProjects';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import {
    createAdminProjectApiKey,
    hasAdminConsoleAccess,
    setDashboardApiKey,
    type DashboardStatsData,
    type DashboardRange,
    type DashboardTrendPoint,
} from '../lib/api';
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
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
});

function formatDate(value: string | null) {
    if (!value) return 'Date unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return DATE_FORMATTER.format(date);
}

function formatEventCountLabel(count: number) {
    return `${count.toLocaleString()} event${count === 1 ? '' : 's'}`;
}

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

function RangeToggleButton({
    label,
    active,
    onClick,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`h-9 rounded-md border px-3 text-sm font-semibold transition-colors ${
                active
                    ? 'ui-accent-badge text-white'
                    : 'border-[var(--enterprise-border)] bg-[#16181b] text-[var(--enterprise-text-muted)] hover:bg-[#1a1d20] hover:text-[var(--enterprise-text)]'
            }`}
        >
            {label}
        </button>
    );
}

function computePeakTrendPoint(trend: DashboardTrendPoint[]) {
    return trend.reduce<DashboardTrendPoint | null>((best, point) => {
        if (!best || point.count > best.count) return point;
        return best;
    }, null);
}

function hasProjectActivity(stats: DashboardStatsData | null) {
    if (!stats) return false;

    return (
        stats.totals.totalEvents > 0 ||
        stats.totals.totalIssues > 0 ||
        stats.topIssues.length > 0 ||
        stats.errorsByLevel.length > 0 ||
        stats.errorsByEnvironment.length > 0 ||
        stats.errorsByRelease.length > 0 ||
        stats.topRoutes.length > 0
    );
}

function EventVolumeCard({
    trend,
    loading,
    rangeLabel,
}: {
    trend: DashboardTrendPoint[];
    loading: boolean;
    rangeLabel: string;
}) {
    const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
    const total = trend.reduce((sum, point) => sum + point.count, 0);
    const peak = computePeakTrendPoint(trend);
    const maxCount = Math.max(...trend.map((point) => point.count), 0);
    const chartHeight = 180;
    const chartWidth = 620;
    const axisStep = trend.length > 7 ? Math.ceil(trend.length / 6) : 1;
    const axisLabels = trend.filter(
        (_point, index) =>
            index === 0 ||
            index === trend.length - 1 ||
            index % axisStep === 0,
    );

    const points = trend.map((point, index) => {
        const x = trend.length === 1 ? 0 : (index / Math.max(trend.length - 1, 1)) * chartWidth;
        const normalized = maxCount > 0 ? point.count / maxCount : 0;
        const y = chartHeight - normalized * (chartHeight - 20) - 10;
        return { ...point, x, y };
    });

    const path = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ');
    const areaPath = points.length
        ? `${path} L ${points[points.length - 1].x} ${chartHeight} L 0 ${chartHeight} Z`
        : '';
    const activePoint = activePointIndex === null ? null : points[activePointIndex] ?? null;
    const tooltipLeftPercent = activePoint ? (activePoint.x / chartWidth) * 100 : 0;
    const tooltipTransform = tooltipLeftPercent < 14
        ? 'translateX(0)'
        : tooltipLeftPercent > 86
            ? 'translateX(-100%)'
            : 'translateX(-50%)';

    return (
        <DashboardSectionCard
            title="Event Volume"
            description={`Observed across the selected ${rangeLabel} project window.`}
            action={<span className="enterprise-chip">{trend.length || 0} points</span>}
            contentClassName="p-4"
            variant="enterprise"
        >
            {loading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="enterprise-panel-soft h-20 rounded-md" />
                        <div className="enterprise-panel-soft h-20 rounded-md" />
                    </div>
                    <div className="enterprise-panel-soft h-[220px] rounded-md" />
                </div>
            ) : trend.length === 0 ? (
                <div className="enterprise-panel-muted flex min-h-[260px] items-center justify-center rounded-md px-4 py-8 text-center">
                    <div>
                        <h3 className="text-base font-semibold text-[var(--enterprise-text)]">
                            No event traffic yet
                        </h3>
                        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                            Send a test event from this project to populate the time series window.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="enterprise-panel-soft rounded-md px-4 py-3.5">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                Window total
                            </div>
                            <div className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--enterprise-text)]">
                                {total.toLocaleString()}
                            </div>
                            <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                Events recorded in the selected range.
                            </div>
                        </div>
                        <div className="enterprise-panel-soft rounded-md px-4 py-3.5">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                Peak day
                            </div>
                            <div className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--enterprise-text)]">
                                {peak?.count.toLocaleString() ?? 0}
                            </div>
                            <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                {peak ? `${peak.date} registered the highest spike.` : 'No peak yet.'}
                            </div>
                        </div>
                    </div>

                    <div className="enterprise-panel-soft rounded-md px-4 py-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-[11px] font-medium text-[var(--enterprise-text-dim)]">
                                Hover over the line to inspect daily event counts.
                            </div>
                            {activePoint ? (
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cbd7ff]">
                                    {formatDate(activePoint.date)} · {formatEventCountLabel(activePoint.count)}
                                </div>
                            ) : null}
                        </div>

                        <div
                            className="relative h-[220px]"
                            onMouseLeave={() => setActivePointIndex(null)}
                        >
                            {activePoint ? (
                                <div
                                    className="pointer-events-none absolute left-0 top-2 z-10 rounded-xl border border-[rgba(107,130,255,0.28)] bg-[#0f1622]/96 px-3 py-2 shadow-[0_14px_30px_rgba(2,6,23,0.35)]"
                                    style={{
                                        left: `${tooltipLeftPercent}%`,
                                        transform: tooltipTransform,
                                    }}
                                >
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        {formatDate(activePoint.date)}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-white">
                                        {formatEventCountLabel(activePoint.count)}
                                    </div>
                                </div>
                            ) : null}

                            <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                className="h-full w-full"
                                preserveAspectRatio="none"
                            >
                                {[0, 1, 2, 3].map((index) => {
                                    const y = 16 + index * ((chartHeight - 32) / 3);
                                    return (
                                        <line
                                            key={index}
                                            x1="0"
                                            x2={chartWidth}
                                            y1={y}
                                            y2={y}
                                            stroke="rgba(255,255,255,0.06)"
                                            strokeWidth="1"
                                        />
                                    );
                                })}

                                {activePoint ? (
                                    <line
                                        x1={activePoint.x}
                                        x2={activePoint.x}
                                        y1="10"
                                        y2={chartHeight}
                                        stroke="rgba(107,130,255,0.35)"
                                        strokeDasharray="5 5"
                                        strokeWidth="1.5"
                                    />
                                ) : null}

                                {areaPath ? (
                                    <path
                                        d={areaPath}
                                        fill="url(#project-volume-fill)"
                                        opacity="0.95"
                                    />
                                ) : null}
                                {path ? (
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke="#6b82ff"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                ) : null}

                                {points.map((point, index) => {
                                    const previousX = index === 0 ? 0 : (points[index - 1].x + point.x) / 2;
                                    const nextX = index === points.length - 1
                                        ? chartWidth
                                        : (point.x + points[index + 1].x) / 2;

                                    return (
                                        <rect
                                            key={`${point.date}-hitbox`}
                                            x={previousX}
                                            y="0"
                                            width={Math.max(nextX - previousX, 12)}
                                            height={chartHeight}
                                            fill="transparent"
                                            onMouseEnter={() => setActivePointIndex(index)}
                                        />
                                    );
                                })}

                                {activePoint ? (
                                    <>
                                        <circle
                                            cx={activePoint.x}
                                            cy={activePoint.y}
                                            r="6"
                                            fill="rgba(107,130,255,0.18)"
                                        />
                                        <circle
                                            cx={activePoint.x}
                                            cy={activePoint.y}
                                            r="3.5"
                                            fill="#8ea0ff"
                                            stroke="#f6f8ff"
                                            strokeWidth="1.5"
                                        />
                                    </>
                                ) : null}

                                <defs>
                                    <linearGradient id="project-volume-fill" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(107,130,255,0.35)" />
                                        <stop offset="100%" stopColor="rgba(107,130,255,0.02)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text-dim)]">
                            {axisLabels.map((point) => (
                                <div key={point.date} className="truncate">
                                    {point.date}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </DashboardSectionCard>
    );
}

export default function ProjectIssuesPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        projects: adminProjects,
        loading: projectsLoading,
    } = useAdminProjects();
    const {
        project: connectedProject,
        loading: workspaceLoading,
        refresh: refreshWorkspace,
        hasApiKey,
    } = useDashboardProjectContext();
    const [storedProject, setStoredProject] = useState(() =>
        id ? getStoredProjectRecord(id) : null,
    );
    const [selectedRange, setSelectedRange] = useState<DashboardRange>('7d');
    const [attemptedAutoConnect, setAttemptedAutoConnect] = useState(false);
    const [connectionLoading, setConnectionLoading] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);

    useEffect(() => {
        setStoredProject(id ? getStoredProjectRecord(id) : null);
    }, [id]);

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

    useEffect(() => {
        if (!id || connectedProject?.id === id || attemptedAutoConnect) {
            return;
        }

        const connectWithApiKey = async (apiKey: string) => {
            setDashboardApiKey(apiKey);
            const ok = await refreshWorkspace();
            if (!ok) {
                throw new Error('Project workspace could not be connected.');
            }
        };

        let active = true;
        setAttemptedAutoConnect(true);
        setConnectionLoading(true);
        setConnectError(null);

        void (async () => {
            try {
                if (storedProject?.apiKey) {
                    await connectWithApiKey(storedProject.apiKey);
                    return;
                }

                if (project && !project.isDraft && hasAdminConsoleAccess) {
                    const response = await createAdminProjectApiKey(id, {
                        label: project.keyLabel ?? 'dashboard',
                    });

                    if (!response.ok || !response.apiKey) {
                        throw new Error(
                            response.error ?? 'Project API key could not be generated.',
                        );
                    }

                    const nextStoredProject = upsertStoredProjectRecord(id, {
                        name: project.name,
                        key: project.key,
                        platform: project.platform,
                        runtimeType: project.runtimeType,
                        createdAt: project.createdAt ?? new Date().toISOString(),
                        apiKey: response.apiKey,
                        keyLabel: project.keyLabel ?? 'dashboard',
                        isDraft: false,
                    });

                    if (active) {
                        setStoredProject(nextStoredProject);
                    }

                    await connectWithApiKey(response.apiKey);
                    return;
                }
            } catch (err: unknown) {
                if (!active) return;
                setConnectError(
                    err instanceof Error
                        ? err.message
                        : 'Project workspace could not be connected.',
                );
            } finally {
                if (active) {
                    setConnectionLoading(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [
        attemptedAutoConnect,
        connectedProject?.id,
        id,
        project,
        refreshWorkspace,
        storedProject?.apiKey,
    ]);

    const projectConnected = connectedProject?.id === id;
    const {
        stats: activeStats,
        loading: activeStatsLoading,
        error: activeStatsError,
        refresh: refreshStats,
    } = useDashboardStats(selectedRange, projectConnected && hasApiKey);

    const activeRangeLabel = selectedRange === '30d' ? '30 day' : '7 day';
    const isEmptySelectedRange =
        !activeStatsLoading && !hasProjectActivity(activeStats);

    if (!id) {
        return <Navigate to="/projects" replace />;
    }

    if ((connectionLoading || (workspaceLoading && attemptedAutoConnect)) || (!project && projectsLoading)) {
        return (
            <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
                <EnterpriseTopNavigation activeItem="projects" showSearch={false} />
                <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
                    <div className="enterprise-panel-soft h-64 animate-pulse rounded-md" />
                </main>
            </div>
        );
    }

    if (!projectConnected) {
        return (
            <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
                <EnterpriseTopNavigation activeItem="projects" showSearch={false} />

                <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
                    <DashboardSectionCard
                        title="Project Workspace"
                        description="This route should connect the dashboard to the selected project before loading analytics."
                        className="mx-auto w-full max-w-2xl"
                        contentClassName="p-4"
                        variant="enterprise"
                    >
                        <div className="space-y-3">
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--enterprise-text)]">
                                    {project?.name ?? 'Project workspace'}
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    {project?.isDraft
                                        ? 'This is a local draft. Create the backend project and attach a real API key before loading analytics.'
                                        : storedProject?.apiKey
                                            ? 'A saved API key exists for this project, but the dashboard could not reconnect with it.'
                                            : hasAdminConsoleAccess
                                                ? 'A new API key should have been generated automatically for this project, but the workspace still could not connect.'
                                                : 'No saved API key was found for this project yet. Open setup to generate one or connect an existing key before entering the workspace.'}
                                </p>
                            </div>

                            {connectError ? (
                                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-100">
                                    {connectError}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                                <PrimaryButton
                                    label="Open Setup"
                                    onClick={() => navigate(`/projects/${id}/setup`)}
                                />
                                <SecondaryButton
                                    label="Back to Projects"
                                    onClick={() => navigate('/projects')}
                                />
                            </div>
                        </div>
                    </DashboardSectionCard>
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
                        title="Project Metadata Unavailable"
                        description="The dashboard is connected, but this project could not be reconstructed from local project records."
                        className="mx-auto w-full max-w-2xl"
                        contentClassName="p-4"
                        variant="enterprise"
                    >
                        <div className="space-y-3">
                            <p className="text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Open setup to restore local project metadata, or return to the
                                projects list and re-enter the workspace from there.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <PrimaryButton
                                    label="Open Setup"
                                    onClick={() => navigate(`/projects/${id}/setup`)}
                                />
                                <SecondaryButton
                                    label="Back to Projects"
                                    onClick={() => navigate('/projects')}
                                />
                            </div>
                        </div>
                    </DashboardSectionCard>
                </main>
            </div>
        );
    }

    return (
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <EnterpriseTopNavigation
                activeItem="projects"
                projectName={connectedProject?.name}
            />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 max-w-4xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="enterprise-chip">Project</span>
                                <span className="ui-accent-badge rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                                    {getPlatformLabel(project.platform)}
                                </span>
                                <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)]">
                                    {getRuntimeTypeLabel(project.runtimeType)}
                                </span>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text-dim)]">
                                    Last {activeRangeLabel} telemetry window
                                </span>
                            </div>

                            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--enterprise-text)] sm:text-[2rem]">
                                {project.name}
                            </h1>

                            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Real-time project overview for issue pressure, event volume,
                                environment spread, and release health.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2">
                                <RangeToggleButton
                                    label="7d"
                                    active={selectedRange === '7d'}
                                    onClick={() => setSelectedRange('7d')}
                                />
                                <RangeToggleButton
                                    label="30d"
                                    active={selectedRange === '30d'}
                                    onClick={() => setSelectedRange('30d')}
                                />
                            </div>
                            <SecondaryButton
                                label="Project Setup"
                                onClick={() => navigate(`/projects/${id}/setup`)}
                            />
                            <SecondaryButton
                                label="Issue Stream"
                                onClick={() => navigate('/issues')}
                            />
                            <PrimaryButton
                                label={activeStatsLoading ? 'Refreshing...' : 'Refresh'}
                                onClick={() => void refreshStats()}
                            />
                        </div>
                    </div>
                </section>

                {selectedRange === '7d' && isEmptySelectedRange ? (
                    <div className="ui-info-banner rounded-md px-3.5 py-3 text-sm">
                        No activity was found in the last 7 days for this project. Switch to
                        `30d` to inspect older project telemetry.
                    </div>
                ) : null}

                {activeStatsError ? (
                    <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm">
                        {activeStatsError}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                    <OverviewMetricCard
                        label="Total Events"
                        value={activeStats?.totals.totalEvents ?? 0}
                        accentClass="enterprise-metric-accent-blue"
                        loading={activeStatsLoading && !activeStats}
                        variant="enterprise"
                    />
                    <OverviewMetricCard
                        label="Total Issues"
                        value={activeStats?.totals.totalIssues ?? 0}
                        accentClass="enterprise-metric-accent-orange"
                        loading={activeStatsLoading && !activeStats}
                        variant="enterprise"
                    />
                    <OverviewMetricCard
                        label="Open"
                        value={activeStats?.totals.openIssues ?? 0}
                        accentClass="enterprise-metric-accent-red"
                        loading={activeStatsLoading && !activeStats}
                        variant="enterprise"
                    />
                    <OverviewMetricCard
                        label="Resolved"
                        value={activeStats?.totals.resolvedIssues ?? 0}
                        accentClass="enterprise-metric-accent-green"
                        loading={activeStatsLoading && !activeStats}
                        variant="enterprise"
                    />
                    <OverviewMetricCard
                        label="Ignored"
                        value={activeStats?.totals.ignoredIssues ?? 0}
                        accentClass="enterprise-metric-accent-slate"
                        loading={activeStatsLoading && !activeStats}
                        variant="enterprise"
                    />
                </div>

                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
                    <EventVolumeCard
                        trend={activeStats?.trend7d ?? []}
                        loading={activeStatsLoading && !activeStats}
                        rangeLabel={activeRangeLabel}
                    />

                    <TopIssuesCard
                        issues={activeStats?.topIssues ?? []}
                        loading={activeStatsLoading && !activeStats}
                        onSelectIssue={(issueId) => navigate(`/issues/${issueId}`)}
                        onViewAll={() => navigate('/issues')}
                        formatRelativeTime={formatRelativeTime}
                        variant="enterprise"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <DistributionListCard
                        title="Errors by Level"
                        description="Severity distribution across the current project stream."
                        items={activeStats?.errorsByLevel ?? []}
                        emptyMessage="No level distribution available yet."
                        loading={activeStatsLoading && !activeStats}
                        showPercentage
                        variant="enterprise"
                    />

                    <DistributionListCard
                        title="Errors by Environment"
                        description="Environment breakdown for the incoming event volume."
                        items={activeStats?.errorsByEnvironment ?? []}
                        emptyMessage="No environment data has been captured yet."
                        loading={activeStatsLoading && !activeStats}
                        mode="donut"
                        variant="enterprise"
                    />

                    <DistributionListCard
                        title="Top Failing Routes"
                        description="Most error-prone endpoints in the selected project window."
                        items={activeStats?.topRoutes ?? []}
                        emptyMessage="No route metadata has been captured yet."
                        loading={activeStatsLoading && !activeStats}
                        monospaceLabels
                        barClassName="bg-gradient-to-r from-sky-500 to-indigo-400"
                        variant="enterprise"
                    />

                    <DistributionListCard
                        title="Errors by Release"
                        description="How releases are contributing to the current issue load."
                        items={activeStats?.errorsByRelease ?? []}
                        emptyMessage="No release metadata has been captured yet."
                        loading={activeStatsLoading && !activeStats}
                        monospaceLabels
                        barClassName="bg-gradient-to-r from-cyan-500 to-sky-400"
                        variant="enterprise"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <DashboardSectionCard
                        title="Workspace"
                        description="Connected project context for this dashboard session."
                        contentClassName="p-4"
                        variant="enterprise"
                    >
                        <div className="space-y-3">
                            <div className="enterprise-panel-soft rounded-md px-4 py-3.5">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                    Project key
                                </div>
                                <div className="mt-1.5 break-all font-mono text-xs text-[var(--enterprise-text)]">
                                    {project.key ?? 'Unavailable'}
                                </div>
                            </div>
                            <div className="enterprise-panel-soft rounded-md px-4 py-3.5">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                    Created
                                </div>
                                <div className="mt-1.5 text-sm text-[var(--enterprise-text)]">
                                    {formatDate(project.createdAt)}
                                </div>
                            </div>
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Issue Pressure"
                        description="Current summary of active issue activity."
                        contentClassName="p-4"
                        variant="enterprise"
                    >
                        <div className="space-y-3">
                            {(activeStats?.topIssues ?? []).slice(0, 3).map((issue) => (
                                <button
                                    key={issue.id}
                                    type="button"
                                    onClick={() => navigate(`/issues/${issue.id}`)}
                                    className="enterprise-panel-soft flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left transition-colors hover:border-[var(--enterprise-border-strong)] hover:bg-[#1f2226]"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-[var(--enterprise-text)]">
                                            {issue.title}
                                        </div>
                                        <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                            Last seen {formatRelativeTime(issue.lastSeenAt)}
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-[var(--enterprise-text)]">
                                        {issue.eventCount.toLocaleString()}
                                    </div>
                                </button>
                            ))}
                            {(activeStats?.topIssues?.length ?? 0) === 0 && !activeStatsLoading ? (
                                <div className="rounded-md border border-[var(--enterprise-border)] bg-[#16181b] px-4 py-4 text-sm text-[var(--enterprise-text-muted)]">
                                    No issue pressure to report yet.
                                </div>
                            ) : null}
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Next Step"
                        description="Fast path back into detailed triage."
                        contentClassName="p-4"
                        variant="enterprise"
                    >
                        <div className="space-y-3">
                            <p className="text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Use the project workspace for high-level monitoring, then switch to the
                                shared issue stream when you need filtering, paging, or deeper
                                investigation.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <PrimaryButton
                                    label="Open Issue Stream"
                                    onClick={() => navigate('/issues')}
                                />
                                <SecondaryButton
                                    label="Back to Projects"
                                    onClick={() => navigate('/projects')}
                                />
                            </div>
                        </div>
                    </DashboardSectionCard>
                </div>
            </main>
        </div>
    );
}
