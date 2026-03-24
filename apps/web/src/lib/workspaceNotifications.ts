import type { DashboardStatsData } from './api';

export type NotificationSeverity = 'critical' | 'high' | 'medium' | 'info';
export type NotificationCategory =
    | 'setup'
    | 'triage'
    | 'regression'
    | 'volume'
    | 'release'
    | 'environment'
    | 'status';

export interface WorkspaceNotification {
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

export interface WorkspaceNotificationCounts {
    total: number;
    critical: number;
    high: number;
    medium: number;
    info: number;
}

const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    info: 3,
};

export const NOTIFICATION_SEVERITY_LABELS: Record<NotificationSeverity, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    info: 'Info',
};

export const NOTIFICATION_SEVERITY_BADGES: Record<NotificationSeverity, string> = {
    critical: 'border border-red-500/20 bg-red-500/10 text-red-100',
    high: 'border border-amber-500/20 bg-amber-500/10 text-amber-200',
    medium: 'border border-sky-500/20 bg-sky-500/10 text-sky-200',
    info: 'border border-[var(--enterprise-border)] bg-[#16181b] text-[var(--enterprise-text-muted)]',
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
    setup: 'Setup',
    triage: 'Triage',
    regression: 'Regression',
    volume: 'Volume',
    release: 'Release',
    environment: 'Environment',
    status: 'Status',
};

function buildIssuePath(params: Record<string, string>) {
    const query = new URLSearchParams(params);
    return `/issues${query.toString() ? `?${query.toString()}` : ''}`;
}

export function buildWorkspaceNotifications(
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
            title: highVolumeIssue.title,
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

export function getWorkspaceNotificationCounts(
    notifications: WorkspaceNotification[],
): WorkspaceNotificationCounts {
    return notifications.reduce<WorkspaceNotificationCounts>(
        (counts, item) => ({
            total: counts.total + 1,
            critical: counts.critical + (item.severity === 'critical' ? 1 : 0),
            high: counts.high + (item.severity === 'high' ? 1 : 0),
            medium: counts.medium + (item.severity === 'medium' ? 1 : 0),
            info: counts.info + (item.severity === 'info' ? 1 : 0),
        }),
        {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            info: 0,
        },
    );
}

export function getWorkspaceNotificationActionableCount(
    counts: WorkspaceNotificationCounts,
) {
    return counts.critical + counts.high + counts.medium;
}

export function hasWorkspaceSignalIndicator(
    notifications: WorkspaceNotification[],
) {
    return notifications.some((item) => item.id !== 'all-clear');
}
