import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import type { DashboardStatsData } from '../lib/api';

type NotificationSeverity = 'critical' | 'high' | 'medium' | 'info';
type NotificationCategory =
    | 'setup'
    | 'triage'
    | 'regression'
    | 'volume'
    | 'release'
    | 'environment'
    | 'status';
type NotificationFilter = 'all' | NotificationSeverity;

interface WorkspaceNotification {
    id: string;
    severity: NotificationSeverity;
    category: NotificationCategory;
    title: string;
    description: string;
    timestamp: string;
    actionLabel: string;
    actionPath: string;
    metric?: string;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
});

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    info: 3,
};

const SEVERITY_LABELS: Record<NotificationSeverity, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    info: 'Info',
};

const SEVERITY_BADGES: Record<NotificationSeverity, string> = {
    critical: 'border border-red-500/20 bg-red-500/10 text-red-100',
    high: 'border border-amber-500/20 bg-amber-500/10 text-amber-200',
    medium: 'border border-sky-500/20 bg-sky-500/10 text-sky-200',
    info: 'border border-[var(--enterprise-border)] bg-[#16181b] text-[var(--enterprise-text-muted)]',
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
    setup: 'Setup',
    triage: 'Triage',
    regression: 'Regression',
    volume: 'Volume',
    release: 'Release',
    environment: 'Environment',
    status: 'Status',
};

const API_KEY_SOURCE_LABELS: Record<'runtime' | 'env' | 'none', string> = {
    runtime: 'Runtime override',
    env: 'Environment variable',
    none: 'Not connected',
};

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';
    return DATE_FORMATTER.format(date);
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

function buildIssuePath(params: Record<string, string>) {
    const query = new URLSearchParams(params);
    return `/issues${query.toString() ? `?${query.toString()}` : ''}`;
}

function buildNotifications(
    stats: DashboardStatsData | null,
    hasApiKey: boolean,
    projectName: string | null,
): WorkspaceNotification[] {
    const notifications: WorkspaceNotification[] = [];
    const now = new Date().toISOString();

    if (!hasApiKey) {
        return [
            {
                id: 'setup-required',
                severity: 'critical',
                category: 'setup',
                title: 'No dashboard project is connected',
                description:
                    'Connect a live API key from Project Setup so this workspace can produce real alerts.',
                timestamp: now,
                actionLabel: 'Open Projects',
                actionPath: '/projects',
                metric: 'Connection required',
            },
        ];
    }

    if (!stats) {
        return [];
    }

    const usedIssueIds = new Set<string>();
    const latestIssueTimestamp = stats.topIssues[0]?.lastSeenAt ?? now;
    const projectLabel = projectName ? `${projectName} has` : 'This workspace has';

    if (stats.totals.openIssues > 0) {
        notifications.push({
            id: 'open-issues',
            severity: stats.totals.openIssues >= 12 ? 'high' : 'medium',
            category: 'triage',
            title: `${stats.totals.openIssues} open issues need triage`,
            description: `${projectLabel} unresolved issue groups in the current 7 day window.`,
            timestamp: latestIssueTimestamp,
            actionLabel: 'Review Open Issues',
            actionPath: buildIssuePath({ status: 'open' }),
            metric: `${stats.totals.openIssues.toLocaleString()} open`,
        });
    }

    for (const issue of stats.topIssues.filter((item) => item.isRegression).slice(0, 2)) {
        usedIssueIds.add(issue.id);
        notifications.push({
            id: `regression-${issue.id}`,
            severity: issue.regressionCount >= 2 ? 'critical' : 'high',
            category: 'regression',
            title: issue.title,
            description: `This issue reopened ${issue.regressionCount.toLocaleString()} times and is active again.`,
            timestamp: issue.lastSeenAt,
            actionLabel: 'Open Issue',
            actionPath: `/issues/${issue.id}`,
            metric: `${issue.eventCount.toLocaleString()} events`,
        });
    }

    const highVolumeIssue = stats.topIssues.find(
        (item) => !usedIssueIds.has(item.id) && item.eventCount >= 25,
    );
    if (highVolumeIssue) {
        notifications.push({
            id: `volume-${highVolumeIssue.id}`,
            severity: highVolumeIssue.eventCount >= 100 ? 'critical' : 'high',
            category: 'volume',
            title: `${highVolumeIssue.title}`,
            description: 'This issue is generating the highest recent event volume in the workspace.',
            timestamp: highVolumeIssue.lastSeenAt,
            actionLabel: 'Inspect Issue',
            actionPath: `/issues/${highVolumeIssue.id}`,
            metric: `${highVolumeIssue.eventCount.toLocaleString()} events`,
        });
    }

    const topRelease = stats.errorsByRelease[0];
    if (topRelease && topRelease.count > 0) {
        notifications.push({
            id: `release-${topRelease.name}`,
            severity: 'info',
            category: 'release',
            title: `${topRelease.name} is the noisiest release`,
            description: 'Recent errors are clustering around this release version.',
            timestamp: latestIssueTimestamp,
            actionLabel: 'Filter By Release',
            actionPath: buildIssuePath({ release: topRelease.name }),
            metric: `${topRelease.count.toLocaleString()} events`,
        });
    }

    const topEnvironment = stats.errorsByEnvironment[0];
    if (topEnvironment && topEnvironment.count > 0) {
        notifications.push({
            id: `environment-${topEnvironment.name}`,
            severity: 'info',
            category: 'environment',
            title: `${topEnvironment.name} is carrying the highest error load`,
            description: 'Use the environment filter to isolate the current hotspot.',
            timestamp: latestIssueTimestamp,
            actionLabel: 'Filter By Environment',
            actionPath: buildIssuePath({ environment: topEnvironment.name }),
            metric: `${topEnvironment.count.toLocaleString()} events`,
        });
    }

    if (notifications.length === 0) {
        notifications.push({
            id: 'all-clear',
            severity: 'info',
            category: 'status',
            title: 'No urgent notification signals right now',
            description:
                'The current 7 day workspace view does not show regressions, high-volume spikes, or open issue pressure.',
            timestamp: now,
            actionLabel: 'Open Dashboard',
            actionPath: '/dashboard',
            metric: 'All clear',
        });
    }

    return notifications.sort((left, right) => {
        const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
        if (severityDelta !== 0) return severityDelta;
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });
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

function FilterButton({
    label,
    active = false,
    onClick,
}: {
    label: string;
    active?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                active
                    ? 'ui-accent-panel border-transparent text-white'
                    : 'border-[var(--enterprise-border)] bg-[#16181b] text-[var(--enterprise-text-muted)] hover:text-[var(--enterprise-text)]'
            }`}
        >
            {label}
        </button>
    );
}

function SummaryMetric({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: string;
    tone?: 'default' | 'accent';
}) {
    return (
        <div className="enterprise-panel-soft rounded-md p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                {label}
            </div>
            <div
                className={`mt-1.5 text-sm font-semibold ${
                    tone === 'accent'
                        ? 'text-[var(--enterprise-accent-strong)]'
                        : 'text-[var(--enterprise-text)]'
                }`}
            >
                {value}
            </div>
        </div>
    );
}

function NotificationRow({
    item,
    onOpen,
}: {
    item: WorkspaceNotification;
    onOpen: () => void;
}) {
    return (
        <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${SEVERITY_BADGES[item.severity]}`}
                        >
                            {SEVERITY_LABELS[item.severity]}
                        </span>
                        <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                            {CATEGORY_LABELS[item.category]}
                        </span>
                        {item.metric ? (
                            <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)]">
                                {item.metric}
                            </span>
                        ) : null}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-[var(--enterprise-text)]">
                        {item.title}
                    </h3>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                        {item.description}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <div className="text-sm font-medium text-[var(--enterprise-text)]">
                        {formatRelativeTime(item.timestamp)}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--enterprise-text-dim)]">
                        {formatDateTime(item.timestamp)}
                    </div>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <PrimaryButton label={item.actionLabel} onClick={onOpen} />
            </div>
        </div>
    );
}

export default function NotificationsPage() {
    const navigate = useNavigate();
    const {
        project,
        error: projectContextError,
        hasApiKey,
        apiKeySource,
    } = useDashboardProjectContext();
    const {
        stats,
        loading,
        error: statsError,
    } = useDashboardStats('7d', hasApiKey);
    const [filter, setFilter] = useState<NotificationFilter>('all');

    const notifications = useMemo(
        () => buildNotifications(stats, hasApiKey, project?.name ?? null),
        [hasApiKey, project?.name, stats],
    );

    const visibleNotifications = useMemo(
        () =>
            notifications.filter((item) =>
                filter === 'all' ? true : item.severity === filter,
            ),
        [filter, notifications],
    );

    const countsBySeverity = useMemo(
        () => ({
            critical: notifications.filter((item) => item.severity === 'critical').length,
            high: notifications.filter((item) => item.severity === 'high').length,
            medium: notifications.filter((item) => item.severity === 'medium').length,
            info: notifications.filter((item) => item.severity === 'info').length,
        }),
        [notifications],
    );

    const hasError = projectContextError || statsError;

    return (
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <EnterpriseTopNavigation
                activeItem="notifications"
                projectName={project?.name}
            />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="enterprise-chip">Notifications</span>
                                <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)]">
                                    {project?.name ?? 'No project connected'}
                                </span>
                            </div>
                            <h1 className="mt-3 text-xl font-semibold tracking-tight text-[var(--enterprise-text)] sm:text-2xl">
                                Workspace alert feed
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                This view turns your current workspace analytics into a notification
                                queue so regressions, open-issue pressure, and release hotspots are
                                easier to review quickly.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <SecondaryButton
                                label="Open Dashboard"
                                onClick={() => navigate('/dashboard')}
                            />
                            <PrimaryButton
                                label="Review Issues"
                                onClick={() => navigate('/issues')}
                            />
                        </div>
                    </div>
                </section>

                {hasError ? (
                    <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm">
                        {projectContextError ?? statsError}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,340px)]">
                    <DashboardSectionCard
                        title="Alert Feed"
                        description="Actionable signals derived from the current 7 day workspace window."
                        contentClassName="p-4"
                        variant="enterprise"
                        action={
                            <div className="flex flex-wrap justify-end gap-2">
                                <FilterButton
                                    label={`All (${notifications.length})`}
                                    active={filter === 'all'}
                                    onClick={() => setFilter('all')}
                                />
                                <FilterButton
                                    label={`Critical (${countsBySeverity.critical})`}
                                    active={filter === 'critical'}
                                    onClick={() => setFilter('critical')}
                                />
                                <FilterButton
                                    label={`High (${countsBySeverity.high})`}
                                    active={filter === 'high'}
                                    onClick={() => setFilter('high')}
                                />
                                <FilterButton
                                    label={`Medium (${countsBySeverity.medium})`}
                                    active={filter === 'medium'}
                                    onClick={() => setFilter('medium')}
                                />
                            </div>
                        }
                    >
                        {hasApiKey && loading ? (
                            <div className="space-y-3 animate-pulse">
                                {[0, 1, 2].map((index) => (
                                    <div
                                        key={index}
                                        className="enterprise-panel-soft h-32 rounded-md"
                                    />
                                ))}
                            </div>
                        ) : visibleNotifications.length === 0 ? (
                            <div className="rounded-md border border-[var(--enterprise-border)] bg-[#16181b] px-4 py-6 text-sm text-[var(--enterprise-text-muted)]">
                                No notifications matched the current severity filter.
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--enterprise-border)]">
                                {visibleNotifications.map((item) => (
                                    <NotificationRow
                                        key={item.id}
                                        item={item}
                                        onOpen={() => navigate(item.actionPath)}
                                    />
                                ))}
                            </div>
                        )}
                    </DashboardSectionCard>

                    <div className="space-y-6">
                        <DashboardSectionCard
                            title="Summary"
                            description="Current workspace context behind this feed."
                            contentClassName="p-4"
                            variant="enterprise"
                        >
                            <div className="space-y-3">
                                <SummaryMetric
                                    label="Project"
                                    value={project?.name ?? 'Not connected'}
                                    tone={project ? 'accent' : 'default'}
                                />
                                <SummaryMetric
                                    label="API key source"
                                    value={API_KEY_SOURCE_LABELS[apiKeySource]}
                                />
                                <SummaryMetric
                                    label="Notifications"
                                    value={notifications.length.toLocaleString()}
                                />
                                <SummaryMetric
                                    label="Open issues"
                                    value={stats?.totals.openIssues.toLocaleString() ?? '0'}
                                />
                                <SummaryMetric
                                    label="Total events"
                                    value={stats?.totals.totalEvents.toLocaleString() ?? '0'}
                                />
                            </div>
                        </DashboardSectionCard>

                        <DashboardSectionCard
                            title="Recommended Next Step"
                            description="The fastest follow-up based on current workspace state."
                            contentClassName="p-4"
                            variant="enterprise"
                        >
                            <div className="rounded-md border border-[var(--enterprise-border)] bg-[#16181b] p-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                    Suggested action
                                </div>
                                <div className="mt-2 text-sm font-semibold text-[var(--enterprise-text)]">
                                    {!hasApiKey
                                        ? 'Connect a project first'
                                        : countsBySeverity.critical > 0
                                            ? 'Review critical regressions first'
                                            : countsBySeverity.high > 0
                                                ? 'Triage the highest-volume issues'
                                                : 'Stay in the dashboard and monitor trend movement'}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    {!hasApiKey
                                        ? 'Without an active dashboard API key, the workspace cannot translate project activity into alerts.'
                                        : countsBySeverity.critical > 0
                                            ? 'Critical items usually mean a regression or a high-volume issue is already active again.'
                                            : countsBySeverity.high > 0
                                                ? 'High-severity items are the fastest way to reduce visible issue pressure.'
                                                : 'There is no urgent signal right now, so this is a good moment to watch trend and release distribution.'}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <PrimaryButton
                                        label={!hasApiKey ? 'Open Projects' : 'Open Issues'}
                                        onClick={() =>
                                            navigate(!hasApiKey ? '/projects' : '/issues')
                                        }
                                    />
                                    <SecondaryButton
                                        label="Open Dashboard"
                                        onClick={() => navigate('/dashboard')}
                                    />
                                </div>
                            </div>
                        </DashboardSectionCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
