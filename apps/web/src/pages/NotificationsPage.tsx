import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useWorkspaceNotifications } from '../hooks/useWorkspaceNotifications';
import {
    NOTIFICATION_CATEGORY_LABELS,
    NOTIFICATION_SEVERITY_BADGES,
    NOTIFICATION_SEVERITY_LABELS,
    type NotificationSeverity,
    type WorkspaceNotification,
} from '../lib/workspaceNotifications';

type NotificationFilter = 'all' | NotificationSeverity;

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
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${NOTIFICATION_SEVERITY_BADGES[item.severity]}`}
                        >
                            {NOTIFICATION_SEVERITY_LABELS[item.severity]}
                        </span>
                        <span className="rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                            {NOTIFICATION_CATEGORY_LABELS[item.category]}
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
        error,
        hasApiKey,
        apiKeySource,
        loading,
        stats,
        notifications,
        counts,
    } = useWorkspaceNotifications();
    const [filter, setFilter] = useState<NotificationFilter>('all');

    const visibleNotifications = useMemo(
        () =>
            notifications.filter((item) =>
                filter === 'all' ? true : item.severity === filter,
            ),
        [filter, notifications],
    );

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

                {error ? (
                    <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm">
                        {error}
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
                                    label={`All (${counts.total})`}
                                    active={filter === 'all'}
                                    onClick={() => setFilter('all')}
                                />
                                <FilterButton
                                    label={`Critical (${counts.critical})`}
                                    active={filter === 'critical'}
                                    onClick={() => setFilter('critical')}
                                />
                                <FilterButton
                                    label={`High (${counts.high})`}
                                    active={filter === 'high'}
                                    onClick={() => setFilter('high')}
                                />
                                <FilterButton
                                    label={`Medium (${counts.medium})`}
                                    active={filter === 'medium'}
                                    onClick={() => setFilter('medium')}
                                />
                                <FilterButton
                                    label={`Info (${counts.info})`}
                                    active={filter === 'info'}
                                    onClick={() => setFilter('info')}
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
                                    value={counts.total.toLocaleString()}
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
                                        : counts.critical > 0
                                            ? 'Review critical regressions first'
                                            : counts.high > 0
                                                ? 'Triage the highest-volume issues'
                                                : 'Stay in the dashboard and monitor trend movement'}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    {!hasApiKey
                                        ? 'Without an active dashboard API key, the workspace cannot translate project activity into alerts.'
                                        : counts.critical > 0
                                            ? 'Critical items usually mean a regression or a high-volume issue is already active again.'
                                            : counts.high > 0
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
