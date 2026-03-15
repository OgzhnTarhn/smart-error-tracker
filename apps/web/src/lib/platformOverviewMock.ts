import type { DashboardBreakdownItem } from './api';

export type PlatformOverviewRange = '24h' | '7d' | '30d';
export type PlatformOverviewEnvironment =
    | 'all'
    | 'production'
    | 'staging'
    | 'development';

type ScopedEnvironment = Exclude<PlatformOverviewEnvironment, 'all'>;
type PlatformSignalTone = 'critical' | 'high' | 'medium' | 'low' | 'positive';
type PlatformKpiChangeTone = 'positive' | 'negative' | 'neutral';
type ProjectTrendDirection = 'up' | 'down' | 'steady';
type ReleaseHealthStatus = 'stable' | 'watch' | 'degraded';

export interface PlatformKpi {
    label: string;
    value: number | string;
    change: string;
    changeType: PlatformKpiChangeTone;
    supportingText: string;
    accentClass: string;
}

export interface PlatformTrendPoint {
    label: string;
    shortLabel: string;
    count: number;
}

export interface PlatformSignalItem {
    id: string;
    title: string;
    project: string;
    environment: ScopedEnvironment;
    tone: PlatformSignalTone;
    metric: string;
    summary: string;
    timeLabel: string;
    statusLabel: string;
}

export interface PlatformProjectPressure {
    name: string;
    team: string;
    environment: ScopedEnvironment;
    openIssues: number;
    regressions: number;
    pressureScore: number;
    trend: ProjectTrendDirection;
    mttrLabel: string;
}

export interface PlatformReleaseHealth {
    version: string;
    project: string;
    environment: ScopedEnvironment;
    status: ReleaseHealthStatus;
    adoption: string;
    openIssues: number;
    regressions: number;
    summary: string;
}

export interface PlatformAiInsight {
    label: string;
    detail: string;
    tone: PlatformSignalTone | 'neutral';
}

export interface PlatformOverviewData {
    scopeLabel: string;
    subtitle: string;
    kpis: PlatformKpi[];
    trend: {
        points: PlatformTrendPoint[];
        totalEvents: number;
        peakLabel: string;
        peakEvents: number;
        affectedProjects: number;
    };
    operations: {
        activeAlerts: PlatformSignalItem[];
        regressions: PlatformSignalItem[];
        noisyIssues: PlatformSignalItem[];
    };
    health: {
        topProjects: PlatformProjectPressure[];
        severityDistribution: DashboardBreakdownItem[];
        environmentDistribution: DashboardBreakdownItem[];
        releaseHealth: PlatformReleaseHealth[];
    };
    triage: {
        recentCritical: PlatformSignalItem[];
        latestDetected: PlatformSignalItem[];
        recentlyResolved: PlatformSignalItem[];
        investigationQueue: PlatformSignalItem[];
    };
    ai: {
        headline: string;
        summary: string;
        confidenceLabel: string;
        items: PlatformAiInsight[];
    };
}

export const PLATFORM_RANGE_LABELS: Record<PlatformOverviewRange, string> = {
    '24h': '24h',
    '7d': '7d',
    '30d': '30d',
};

export const PLATFORM_ENVIRONMENT_LABELS: Record<PlatformOverviewEnvironment, string> = {
    all: 'All',
    production: 'Production',
    staging: 'Staging',
    development: 'Development',
};

const RANGE_SCALE: Record<PlatformOverviewRange, number> = {
    '24h': 0.82,
    '7d': 1,
    '30d': 1.18,
};

const WINDOW_STAT_BASE = {
    '24h': {
        openIssues: 196,
        criticalIssues: 16,
        activeAlerts: 7,
        regressions: 12,
        mttrMinutes: 178,
    },
    '7d': {
        openIssues: 312,
        criticalIssues: 24,
        activeAlerts: 9,
        regressions: 18,
        mttrMinutes: 191,
    },
    '30d': {
        openIssues: 428,
        criticalIssues: 31,
        activeAlerts: 12,
        regressions: 27,
        mttrMinutes: 214,
    },
} as const;

const ENVIRONMENT_FACTORS: Record<
    PlatformOverviewEnvironment,
    {
        trendFactor: number;
        issueFactor: number;
        criticalFactor: number;
        alertFactor: number;
        regressionFactor: number;
        mttrFactor: number;
        affectedProjects: number;
        subtitle: string;
        scopeLabel: string;
        totalEventsDelta: { value: string; tone: PlatformKpiChangeTone };
        openIssuesDelta: { value: string; tone: PlatformKpiChangeTone };
        criticalIssuesDelta: { value: string; tone: PlatformKpiChangeTone };
        activeAlertsDelta: { value: string; tone: PlatformKpiChangeTone };
        regressionsDelta: { value: string; tone: PlatformKpiChangeTone };
        mttrDelta: { value: string; tone: PlatformKpiChangeTone };
    }
> = {
    all: {
        trendFactor: 1,
        issueFactor: 1,
        criticalFactor: 1,
        alertFactor: 1,
        regressionFactor: 1,
        mttrFactor: 1,
        affectedProjects: 18,
        subtitle:
            'Cross-project operational health across ingestion, issue pressure, alerts, regressions, and release risk.',
        scopeLabel: 'All monitored projects and services',
        totalEventsDelta: { value: '-6.4% vs prior window', tone: 'positive' },
        openIssuesDelta: { value: '+14 unresolved', tone: 'negative' },
        criticalIssuesDelta: { value: '+2 customer-facing', tone: 'negative' },
        activeAlertsDelta: { value: '-3 stabilized', tone: 'positive' },
        regressionsDelta: { value: '+4 reopened', tone: 'negative' },
        mttrDelta: { value: '18m faster', tone: 'positive' },
    },
    production: {
        trendFactor: 0.72,
        issueFactor: 0.69,
        criticalFactor: 0.84,
        alertFactor: 0.78,
        regressionFactor: 0.81,
        mttrFactor: 1.14,
        affectedProjects: 11,
        subtitle:
            'Live production health focused on customer-facing failures, paging conditions, and rollback-sensitive releases.',
        scopeLabel: 'Production traffic and active live releases',
        totalEventsDelta: { value: '+3.1% vs prior window', tone: 'negative' },
        openIssuesDelta: { value: '+9 unresolved', tone: 'negative' },
        criticalIssuesDelta: { value: '+3 paging clusters', tone: 'negative' },
        activeAlertsDelta: { value: '+1 escalated', tone: 'negative' },
        regressionsDelta: { value: '+3 reopened', tone: 'negative' },
        mttrDelta: { value: '14m slower', tone: 'negative' },
    },
    staging: {
        trendFactor: 0.19,
        issueFactor: 0.23,
        criticalFactor: 0.15,
        alertFactor: 0.18,
        regressionFactor: 0.16,
        mttrFactor: 0.86,
        affectedProjects: 5,
        subtitle:
            'Pre-production validation focused on rollout safety, contract changes, and regressions before live promotion.',
        scopeLabel: 'Staging validation and release candidate checks',
        totalEventsDelta: { value: '-11.8% vs prior window', tone: 'positive' },
        openIssuesDelta: { value: '-6 unresolved', tone: 'positive' },
        criticalIssuesDelta: { value: 'flat', tone: 'neutral' },
        activeAlertsDelta: { value: '-2 cleared', tone: 'positive' },
        regressionsDelta: { value: '-1 reopened', tone: 'positive' },
        mttrDelta: { value: '11m faster', tone: 'positive' },
    },
    development: {
        trendFactor: 0.09,
        issueFactor: 0.13,
        criticalFactor: 0.07,
        alertFactor: 0.09,
        regressionFactor: 0.08,
        mttrFactor: 0.78,
        affectedProjects: 4,
        subtitle:
            'Developer and worker environments isolated from live traffic, highlighting noisy experiments and queue failures.',
        scopeLabel: 'Development workflows and internal services',
        totalEventsDelta: { value: '-2.1% vs prior window', tone: 'neutral' },
        openIssuesDelta: { value: '+2 unresolved', tone: 'negative' },
        criticalIssuesDelta: { value: 'none new', tone: 'positive' },
        activeAlertsDelta: { value: 'stable', tone: 'neutral' },
        regressionsDelta: { value: 'flat', tone: 'neutral' },
        mttrDelta: { value: '7m faster', tone: 'positive' },
    },
};

const HOURLY_COUNTS = [
    4210, 3860, 3550, 3380, 3260, 3410, 3880, 4580, 5390, 6120, 6710, 7040, 7420,
    7850, 8180, 8470, 9010, 9540, 9180, 8840, 8090, 7420, 6810, 6040,
];

const WEEKLY_COUNTS = [142300, 151800, 148200, 177400, 169700, 193500, 188900];

const MONTHLY_COUNTS = [
    121400, 126800, 131200, 129900, 136400, 144100, 139700, 146300, 151800, 148600,
    154200, 162500, 159700, 166200, 171300, 168400, 176500, 182700, 178900, 185300,
    191600, 188100, 196400, 201500, 197900, 204400, 210800, 207300, 214200, 219700,
];

const ALERT_ITEMS: PlatformSignalItem[] = [
    {
        id: 'al-201',
        title: 'Payments API 5xx burn rate above SLO',
        project: 'payments-api',
        environment: 'production',
        tone: 'critical',
        metric: '11.8% error rate',
        summary: 'Rollback candidate release 2026.03.14-1 overlaps with checkout timeout growth.',
        timeLabel: '12m ago',
        statusLabel: 'Paging',
    },
    {
        id: 'al-202',
        title: 'Auth refresh failures spiking on mobile sessions',
        project: 'auth-service',
        environment: 'production',
        tone: 'high',
        metric: '3.4k failed refreshes',
        summary: 'Token rotation completed, but stale refresh tokens are still being retried.',
        timeLabel: '19m ago',
        statusLabel: 'Investigating',
    },
    {
        id: 'al-203',
        title: 'Checkout GraphQL contract mismatch on release candidate',
        project: 'checkout-web',
        environment: 'staging',
        tone: 'high',
        metric: '14.2% client failures',
        summary: 'Schema drift between web and API staging deployments is hitting payment method queries.',
        timeLabel: '27m ago',
        statusLabel: 'Watching',
    },
    {
        id: 'al-204',
        title: 'Worker queue retry loop saturating dead-letter backlog',
        project: 'worker-billing',
        environment: 'development',
        tone: 'medium',
        metric: '824 retries / min',
        summary: 'A local queue consumer is reprocessing the same malformed invoice payload.',
        timeLabel: '41m ago',
        statusLabel: 'Muted',
    },
    {
        id: 'al-205',
        title: 'API gateway latency alert breaching edge threshold',
        project: 'api-gateway',
        environment: 'production',
        tone: 'high',
        metric: 'p95 2.4s',
        summary: 'Gateway retries are amplifying backend timeouts from payments and auth.',
        timeLabel: '53m ago',
        statusLabel: 'Investigating',
    },
];

const REGRESSION_ITEMS: PlatformSignalItem[] = [
    {
        id: 'rg-311',
        title: 'Checkout timeout reopened after release candidate deploy',
        project: 'checkout-api',
        environment: 'production',
        tone: 'critical',
        metric: '6 reopenings',
        summary: 'The same timeout fingerprint resurfaced after traffic shifted back to the latest checkout pod set.',
        timeLabel: '34m ago',
        statusLabel: 'Open',
    },
    {
        id: 'rg-312',
        title: 'Auth token verification mismatch resurfaced',
        project: 'auth-service',
        environment: 'production',
        tone: 'high',
        metric: '4 reopenings',
        summary: 'Resolved key mismatch returned after the morning rotation job reran on one region.',
        timeLabel: '48m ago',
        statusLabel: 'Open',
    },
    {
        id: 'rg-313',
        title: 'Upload worker memory spike returned in staging',
        project: 'media-worker',
        environment: 'staging',
        tone: 'medium',
        metric: '2 reopenings',
        summary: 'Retry-heavy fixtures are exercising the same image processing path as last week.',
        timeLabel: '1h ago',
        statusLabel: 'Watching',
    },
    {
        id: 'rg-314',
        title: 'Notification webhook signature parsing failed again',
        project: 'notifications-api',
        environment: 'development',
        tone: 'low',
        metric: '1 reopening',
        summary: 'Local secret rotation reintroduced a mismatch in webhook verification code.',
        timeLabel: '2h ago',
        statusLabel: 'Queued',
    },
];

const NOISY_ISSUE_ITEMS: PlatformSignalItem[] = [
    {
        id: 'ns-401',
        title: 'TypeError in CheckoutSummary hydration path',
        project: 'checkout-web',
        environment: 'production',
        tone: 'high',
        metric: '18.6k events',
        summary: 'Repeated hydration failures are masking smaller payment method regressions in the same release.',
        timeLabel: '8m ago',
        statusLabel: 'Needs owner',
    },
    {
        id: 'ns-402',
        title: 'Prisma timeout in invoice reconciliation worker',
        project: 'worker-billing',
        environment: 'production',
        tone: 'critical',
        metric: '13.2k events',
        summary: 'Backlog growth is amplifying a previously low-volume database timeout cluster.',
        timeLabel: '16m ago',
        statusLabel: 'Investigating',
    },
    {
        id: 'ns-403',
        title: 'ContractError for order summary query variables',
        project: 'checkout-api',
        environment: 'staging',
        tone: 'medium',
        metric: '4.7k events',
        summary: 'Staging still receives a high volume of malformed synthetic requests after schema changes.',
        timeLabel: '26m ago',
        statusLabel: 'Watch list',
    },
    {
        id: 'ns-404',
        title: 'Queue payload parsing failure in local import tool',
        project: 'import-worker',
        environment: 'development',
        tone: 'low',
        metric: '1.1k events',
        summary: 'Internal development noise is isolated but still consuming alert budget if left unchecked.',
        timeLabel: '44m ago',
        statusLabel: 'Muted',
    },
];

const RECENT_CRITICAL_ITEMS: PlatformSignalItem[] = [
    {
        id: 'cr-501',
        title: 'Payment authorization path dropping fallback responses',
        project: 'payments-api',
        environment: 'production',
        tone: 'critical',
        metric: '482 impacted checkouts',
        summary: 'Spike started immediately after the latest payments release hit 63% adoption.',
        timeLabel: '11m ago',
        statusLabel: 'Critical',
    },
    {
        id: 'cr-502',
        title: 'API gateway retry storm pushing p95 latency above target',
        project: 'api-gateway',
        environment: 'production',
        tone: 'critical',
        metric: '2.4s p95',
        summary: 'Correlated with backend errors from payments and auth; customer traffic is affected.',
        timeLabel: '18m ago',
        statusLabel: 'Critical',
    },
    {
        id: 'cr-503',
        title: 'Checkout release candidate breaking schema validation',
        project: 'checkout-web',
        environment: 'staging',
        tone: 'high',
        metric: '14 failed suites',
        summary: 'Staging error volume concentrated in one GraphQL schema mismatch cluster.',
        timeLabel: '37m ago',
        statusLabel: 'High',
    },
];

const LATEST_DETECTED_ITEMS: PlatformSignalItem[] = [
    {
        id: 'lt-601',
        title: 'Notification digest render path started throwing null access',
        project: 'notifications-api',
        environment: 'production',
        tone: 'medium',
        metric: 'New fingerprint',
        summary: 'Detected after a template rollout; ownership still unassigned.',
        timeLabel: '6m ago',
        statusLabel: 'New',
    },
    {
        id: 'lt-602',
        title: 'Upload worker heap pressure warning promoted to issue',
        project: 'media-worker',
        environment: 'staging',
        tone: 'medium',
        metric: 'New fingerprint',
        summary: 'Synthetic media fixtures are hitting a memory-intensive branch more often.',
        timeLabel: '21m ago',
        statusLabel: 'New',
    },
    {
        id: 'lt-603',
        title: 'Local import flow missing optional invoice field guard',
        project: 'import-worker',
        environment: 'development',
        tone: 'low',
        metric: 'New fingerprint',
        summary: 'Single developer workflow, but repeated enough to justify a guardrail fix.',
        timeLabel: '52m ago',
        statusLabel: 'New',
    },
];

const RECENTLY_RESOLVED_ITEMS: PlatformSignalItem[] = [
    {
        id: 'rs-701',
        title: 'Search API timeout during indexing window',
        project: 'search-api',
        environment: 'production',
        tone: 'positive',
        metric: 'Closed 24m ago',
        summary: 'Resolved by reducing concurrent index workers and draining stale jobs.',
        timeLabel: '24m ago',
        statusLabel: 'Resolved',
    },
    {
        id: 'rs-702',
        title: 'Admin audit export file descriptor leak',
        project: 'admin-api',
        environment: 'staging',
        tone: 'positive',
        metric: 'Closed 46m ago',
        summary: 'Patch verified in staging after tightening stream cleanup in export workers.',
        timeLabel: '46m ago',
        statusLabel: 'Resolved',
    },
    {
        id: 'rs-703',
        title: 'Development webhook parser missing null check',
        project: 'notifications-api',
        environment: 'development',
        tone: 'positive',
        metric: 'Closed 1h ago',
        summary: 'Guard clause shipped and local replay no longer reproduces the failure.',
        timeLabel: '1h ago',
        statusLabel: 'Resolved',
    },
];

const INVESTIGATION_QUEUE_ITEMS: PlatformSignalItem[] = [
    {
        id: 'iq-801',
        title: 'Payments release spike overlaps with reopened checkout timeout',
        project: 'payments-api',
        environment: 'production',
        tone: 'critical',
        metric: 'Highest priority',
        summary: 'Inspect release 2026.03.14-1 against the reopened checkout timeout cluster first.',
        timeLabel: 'Now',
        statusLabel: 'Start here',
    },
    {
        id: 'iq-802',
        title: 'Auth refresh failures share region-specific token rotation path',
        project: 'auth-service',
        environment: 'production',
        tone: 'high',
        metric: 'Shared failure mode',
        summary: 'Compare affected region pods and key cache invalidation timing before broad mitigation.',
        timeLabel: 'Next',
        statusLabel: 'Queue',
    },
    {
        id: 'iq-803',
        title: 'Checkout web schema mismatch should block staging promotion',
        project: 'checkout-web',
        environment: 'staging',
        tone: 'medium',
        metric: 'Release blocker',
        summary: 'Contract failures are likely to reappear in production without a coordinated API update.',
        timeLabel: 'Then',
        statusLabel: 'Queue',
    },
];

const PROJECT_PRESSURE_ITEMS: PlatformProjectPressure[] = [
    {
        name: 'payments-api',
        team: 'Checkout Platform',
        environment: 'production',
        openIssues: 42,
        regressions: 5,
        pressureScore: 96,
        trend: 'up',
        mttrLabel: '3h 18m',
    },
    {
        name: 'auth-service',
        team: 'Identity',
        environment: 'production',
        openIssues: 31,
        regressions: 4,
        pressureScore: 89,
        trend: 'up',
        mttrLabel: '2h 52m',
    },
    {
        name: 'checkout-web',
        team: 'Checkout Experience',
        environment: 'production',
        openIssues: 27,
        regressions: 4,
        pressureScore: 83,
        trend: 'up',
        mttrLabel: '2h 25m',
    },
    {
        name: 'worker-billing',
        team: 'Revenue Operations',
        environment: 'production',
        openIssues: 19,
        regressions: 2,
        pressureScore: 74,
        trend: 'steady',
        mttrLabel: '3h 44m',
    },
    {
        name: 'media-worker',
        team: 'Content Pipeline',
        environment: 'staging',
        openIssues: 14,
        regressions: 2,
        pressureScore: 68,
        trend: 'up',
        mttrLabel: '2h 01m',
    },
    {
        name: 'admin-api',
        team: 'Internal Systems',
        environment: 'staging',
        openIssues: 11,
        regressions: 1,
        pressureScore: 57,
        trend: 'down',
        mttrLabel: '1h 48m',
    },
    {
        name: 'import-worker',
        team: 'Developer Tooling',
        environment: 'development',
        openIssues: 8,
        regressions: 1,
        pressureScore: 46,
        trend: 'steady',
        mttrLabel: '1h 37m',
    },
];

const RELEASE_HEALTH_ITEMS: PlatformReleaseHealth[] = [
    {
        version: '2026.03.14-1',
        project: 'payments-api',
        environment: 'production',
        status: 'degraded',
        adoption: '63%',
        openIssues: 12,
        regressions: 4,
        summary: 'Strongest correlation with checkout timeout and authorization failures.',
    },
    {
        version: '2026.03.14-3',
        project: 'auth-service',
        environment: 'production',
        status: 'watch',
        adoption: '52%',
        openIssues: 8,
        regressions: 2,
        summary: 'Refresh token failures cluster on one region after key rotation.',
    },
    {
        version: 'rc-2026.03.15.2',
        project: 'checkout-web',
        environment: 'staging',
        status: 'watch',
        adoption: '100%',
        openIssues: 5,
        regressions: 1,
        summary: 'Schema mismatch is the remaining blocker for promotion.',
    },
    {
        version: 'dev-1142',
        project: 'import-worker',
        environment: 'development',
        status: 'stable',
        adoption: '100%',
        openIssues: 2,
        regressions: 0,
        summary: 'Internal-only noise remains isolated to local replay flows.',
    },
];

function scaleCount(value: number, factor: number) {
    if (value === 0) return 0;
    return Math.max(1, Math.round(value * factor));
}

function sumCounts(points: PlatformTrendPoint[]) {
    return points.reduce((sum, point) => sum + point.count, 0);
}

function formatDuration(minutes: number) {
    const safeMinutes = Math.max(1, Math.round(minutes));
    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours === 0) return `${remainingMinutes}m`;
    return `${hours}h ${remainingMinutes.toString().padStart(2, '0')}m`;
}

function formatHourLabel(value: Date) {
    return value
        .toLocaleTimeString('en-US', {
            hour: 'numeric',
        })
        .replace(' ', '');
}

function formatDayLabel(value: Date) {
    return value.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function buildTrendPoints(
    range: PlatformOverviewRange,
    environment: PlatformOverviewEnvironment,
    now = new Date(),
): PlatformTrendPoint[] {
    const factor = ENVIRONMENT_FACTORS[environment].trendFactor;

    if (range === '24h') {
        return HOURLY_COUNTS.map((value, index) => {
            const pointTime = new Date(now);
            pointTime.setHours(now.getHours() - (HOURLY_COUNTS.length - 1 - index), 0, 0, 0);

            const shortLabel = formatHourLabel(pointTime);
            const fullLabel = pointTime.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
            });

            return {
                label: fullLabel,
                shortLabel,
                count: scaleCount(value, factor),
            };
        });
    }

    const source = range === '7d' ? WEEKLY_COUNTS : MONTHLY_COUNTS;

    return source.map((value, index) => {
        const pointDate = new Date(now);
        const offset = source.length - 1 - index;
        pointDate.setDate(now.getDate() - offset);
        pointDate.setHours(0, 0, 0, 0);

        return {
            label: formatDayLabel(pointDate),
            shortLabel: formatDayLabel(pointDate),
            count: scaleCount(value, factor),
        };
    });
}

function buildSeverityDistribution(
    openIssues: number,
    criticalIssues: number,
    environment: PlatformOverviewEnvironment,
): DashboardBreakdownItem[] {
    const highRatio = environment === 'production' ? 0.29 : environment === 'all' ? 0.24 : 0.2;
    const mediumRatio =
        environment === 'development' ? 0.34 : environment === 'staging' ? 0.37 : 0.39;
    const highIssues = Math.max(1, Math.round(openIssues * highRatio));
    const mediumIssues = Math.max(1, Math.round(openIssues * mediumRatio));
    const lowIssues = Math.max(openIssues - criticalIssues - highIssues - mediumIssues, 0);

    return [
        { name: 'Critical', count: criticalIssues },
        { name: 'High', count: highIssues },
        { name: 'Medium', count: mediumIssues },
        { name: 'Low', count: lowIssues },
    ];
}

function buildEnvironmentDistribution(
    totalEvents: number,
    environment: PlatformOverviewEnvironment,
): DashboardBreakdownItem[] {
    if (environment !== 'all') {
        return [
            {
                name: PLATFORM_ENVIRONMENT_LABELS[environment],
                count: totalEvents,
            },
        ];
    }

    return [
        { name: 'Production', count: scaleCount(totalEvents, 0.71) },
        { name: 'Staging', count: scaleCount(totalEvents, 0.19) },
        { name: 'Development', count: scaleCount(totalEvents, 0.1) },
    ];
}

function filterSignals(
    items: PlatformSignalItem[],
    environment: PlatformOverviewEnvironment,
    limit: number,
) {
    const filtered =
        environment === 'all'
            ? items
            : items.filter((item) => item.environment === environment);

    return filtered.slice(0, limit);
}

function buildProjectPressure(
    range: PlatformOverviewRange,
    environment: PlatformOverviewEnvironment,
) {
    const scale = RANGE_SCALE[range];
    const filtered =
        environment === 'all'
            ? PROJECT_PRESSURE_ITEMS
            : PROJECT_PRESSURE_ITEMS.filter((item) => item.environment === environment);

    return filtered
        .map((item) => ({
            ...item,
            openIssues: scaleCount(item.openIssues, scale),
            regressions: scaleCount(item.regressions, Math.max(scale * 0.92, 0.7)),
            pressureScore: Math.min(99, scaleCount(item.pressureScore, Math.max(scale, 0.85))),
        }))
        .sort((left, right) => right.pressureScore - left.pressureScore)
        .slice(0, 5);
}

function buildReleaseHealth(
    range: PlatformOverviewRange,
    environment: PlatformOverviewEnvironment,
) {
    const scale = RANGE_SCALE[range];
    const filtered =
        environment === 'all'
            ? RELEASE_HEALTH_ITEMS
            : RELEASE_HEALTH_ITEMS.filter((item) => item.environment === environment);

    return filtered.map((item) => ({
        ...item,
        openIssues: scaleCount(item.openIssues, scale),
        regressions: scaleCount(item.regressions, Math.max(scale * 0.9, 0.65)),
    }));
}

function buildAffectedProjects(
    range: PlatformOverviewRange,
    environment: PlatformOverviewEnvironment,
) {
    const base = ENVIRONMENT_FACTORS[environment].affectedProjects;
    const multiplier = range === '24h' ? 0.78 : range === '7d' ? 1 : 1.18;
    return Math.max(1, Math.round(base * multiplier));
}

function buildKpis(
    range: PlatformOverviewRange,
    environment: PlatformOverviewEnvironment,
    totalEvents: number,
    affectedProjects: number,
): PlatformKpi[] {
    const environmentConfig = ENVIRONMENT_FACTORS[environment];
    const base = WINDOW_STAT_BASE[range];
    const openIssues = scaleCount(base.openIssues, environmentConfig.issueFactor);
    const criticalIssues = scaleCount(base.criticalIssues, environmentConfig.criticalFactor);
    const activeAlerts = scaleCount(base.activeAlerts, environmentConfig.alertFactor);
    const regressions = scaleCount(base.regressions, environmentConfig.regressionFactor);
    const mttr = formatDuration(base.mttrMinutes * environmentConfig.mttrFactor);

    return [
        {
            label: 'Total Events',
            value: totalEvents,
            change: environmentConfig.totalEventsDelta.value,
            changeType: environmentConfig.totalEventsDelta.tone,
            supportingText: `${affectedProjects} projects emitted errors in this window.`,
            accentClass: 'enterprise-metric-accent-blue',
        },
        {
            label: 'Open Issues',
            value: openIssues,
            change: environmentConfig.openIssuesDelta.value,
            changeType: environmentConfig.openIssuesDelta.tone,
            supportingText: 'Issue groups that still require triage or mitigation.',
            accentClass: 'enterprise-metric-accent-orange',
        },
        {
            label: 'Critical Issues',
            value: criticalIssues,
            change: environmentConfig.criticalIssuesDelta.value,
            changeType: environmentConfig.criticalIssuesDelta.tone,
            supportingText: 'Customer-visible or release-blocking failures currently active.',
            accentClass: 'enterprise-metric-accent-red',
        },
        {
            label: 'Active Alerts',
            value: activeAlerts,
            change: environmentConfig.activeAlertsDelta.value,
            changeType: environmentConfig.activeAlertsDelta.tone,
            supportingText: 'Policies currently routing to PagerDuty, Slack, or mail.',
            accentClass: 'enterprise-metric-accent-blue',
        },
        {
            label: 'Regressions',
            value: regressions,
            change: environmentConfig.regressionsDelta.value,
            changeType: environmentConfig.regressionsDelta.tone,
            supportingText: 'Resolved issues that reopened under fresh traffic or rollout activity.',
            accentClass: 'enterprise-metric-accent-red',
        },
        {
            label: 'MTTR',
            value: mttr,
            change: environmentConfig.mttrDelta.value,
            changeType: environmentConfig.mttrDelta.tone,
            supportingText: 'Median time to resolve incidents in the selected scope.',
            accentClass: 'enterprise-metric-accent-green',
        },
    ];
}

function buildAiSummary(
    environment: PlatformOverviewEnvironment,
    topProjects: PlatformProjectPressure[],
    releases: PlatformReleaseHealth[],
    regressions: PlatformSignalItem[],
): PlatformOverviewData['ai'] {
    const highestPressure = topProjects[0];
    const secondaryPressure = topProjects[1];
    const degradedRelease =
        releases.find((release) => release.status === 'degraded') ?? releases[0];
    const reopenedCount = regressions.length;
    const projectSummary = secondaryPressure
        ? `${highestPressure.name} and ${secondaryPressure.name}`
        : highestPressure?.name ?? 'core services';

    const headline =
        environment === 'production'
            ? 'Production pressure is clustering around checkout and auth-adjacent services.'
            : environment === 'staging'
                ? 'Staging risk is concentrated in rollout validation rather than broad platform instability.'
                : environment === 'development'
                    ? 'Development noise is localized, but repeated queue failures still deserve cleanup.'
                    : 'Platform pressure is concentrated in a small set of customer-facing services.';

    const summary = degradedRelease
        ? `${projectSummary} now account for most of the issue pressure in the selected scope. The strongest release correlation is ${degradedRelease.version} on ${degradedRelease.project}, and ${reopenedCount} reopened issue clusters are keeping active investigation load elevated.`
        : `${projectSummary} account for most of the current issue pressure. Reopened issues are small in count but expensive in attention, so stabilizing the top cluster should reduce alert noise quickly.`;

    return {
        headline,
        summary,
        confidenceLabel:
            environment === 'development'
                ? 'Correlation confidence: medium'
                : 'Correlation confidence: high',
        items: [
            {
                label: 'Issue cluster drift',
                detail: `${highestPressure?.name ?? 'payments-api'} is leading the current issue pressure scoreboard and trending upward.`,
                tone: highestPressure?.trend === 'up' ? 'high' : 'neutral',
            },
            {
                label: 'Release correlation',
                detail: degradedRelease
                    ? `${degradedRelease.version} is the strongest candidate for the current spike on ${degradedRelease.project}.`
                    : 'No single release dominates the current issue pressure.',
                tone: degradedRelease?.status === 'degraded' ? 'critical' : 'neutral',
            },
            {
                label: 'Reopened production risk',
                detail:
                    reopenedCount > 0
                        ? `${reopenedCount} reopened issue groups share timeout and retry-heavy failure modes.`
                        : 'No reopened issue cluster is currently dominating the selected scope.',
                tone: reopenedCount >= 3 ? 'high' : 'neutral',
            },
            {
                label: 'Cross-service coupling',
                detail:
                    environment === 'production' || environment === 'all'
                        ? 'Gateway, payments, and auth failures are reinforcing each other through retries and token refresh paths.'
                        : 'Most failures stay inside a single service boundary, which should keep remediation localized.',
                tone:
                    environment === 'production' || environment === 'all'
                        ? 'medium'
                        : 'positive',
            },
        ],
    };
}

export function getPlatformOverviewSnapshot(
    range: PlatformOverviewRange,
    environment: PlatformOverviewEnvironment,
): PlatformOverviewData {
    const trendPoints = buildTrendPoints(range, environment);
    const totalEvents = sumCounts(trendPoints);
    const affectedProjects = buildAffectedProjects(range, environment);
    const peakPoint = trendPoints.reduce((highest, point) => {
        if (!highest || point.count > highest.count) return point;
        return highest;
    }, null as PlatformTrendPoint | null);

    const kpis = buildKpis(range, environment, totalEvents, affectedProjects);
    const openIssuesKpi = kpis.find((kpi) => kpi.label === 'Open Issues');
    const criticalIssuesKpi = kpis.find((kpi) => kpi.label === 'Critical Issues');
    const openIssuesValue =
        typeof openIssuesKpi?.value === 'number'
            ? openIssuesKpi.value
            : WINDOW_STAT_BASE[range].openIssues;
    const criticalIssuesValue =
        typeof criticalIssuesKpi?.value === 'number'
            ? criticalIssuesKpi.value
            : WINDOW_STAT_BASE[range].criticalIssues;

    const topProjects = buildProjectPressure(range, environment);
    const releaseHealth = buildReleaseHealth(range, environment);
    const regressions = filterSignals(REGRESSION_ITEMS, environment, 4);

    return {
        scopeLabel: ENVIRONMENT_FACTORS[environment].scopeLabel,
        subtitle: ENVIRONMENT_FACTORS[environment].subtitle,
        kpis,
        trend: {
            points: trendPoints,
            totalEvents,
            peakLabel: peakPoint?.label ?? '-',
            peakEvents: peakPoint?.count ?? 0,
            affectedProjects,
        },
        operations: {
            activeAlerts: filterSignals(ALERT_ITEMS, environment, 4),
            regressions,
            noisyIssues: filterSignals(NOISY_ISSUE_ITEMS, environment, 4),
        },
        health: {
            topProjects,
            severityDistribution: buildSeverityDistribution(
                openIssuesValue,
                criticalIssuesValue,
                environment,
            ),
            environmentDistribution: buildEnvironmentDistribution(totalEvents, environment),
            releaseHealth,
        },
        triage: {
            recentCritical: filterSignals(RECENT_CRITICAL_ITEMS, environment, 3),
            latestDetected: filterSignals(LATEST_DETECTED_ITEMS, environment, 3),
            recentlyResolved: filterSignals(RECENTLY_RESOLVED_ITEMS, environment, 3),
            investigationQueue: filterSignals(INVESTIGATION_QUEUE_ITEMS, environment, 3),
        },
        ai: buildAiSummary(environment, topProjects, releaseHealth, regressions),
    };
}
