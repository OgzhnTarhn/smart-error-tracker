import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import DistributionListCard from '../components/dashboard/DistributionListCard';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import OverviewMetricCard from '../components/dashboard/OverviewMetricCard';
import TopIssuesCard from '../components/dashboard/TopIssuesCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useDashboardStats } from '../hooks/useDashboardStats';
import type { DashboardStatsData } from '../lib/api';

const PROJECT_NAME = 'production-api-cluster';
const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

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

const EMPTY_STATS: DashboardStatsData = {
    totals: {
        totalEvents: 0,
        totalIssues: 0,
        openIssues: 0,
        resolvedIssues: 0,
        ignoredIssues: 0,
    },
    trend7d: [],
    errorsByLevel: [],
    errorsByEnvironment: [],
    errorsByRelease: [],
    topRoutes: [],
    topIssues: [],
};

type TimeRange = '7d' | '30d';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
    '7d': 'Son 7 Gun',
    '30d': 'Son 30 Gun',
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface TrendTooltipProps {
    active?: boolean;
    label?: string | number;
    payload?: Array<{ value?: number | string }>;
}

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
    if (!active || !payload?.length) return null;

    const value =
        typeof payload[0]?.value === 'number'
            ? payload[0].value
            : Number(payload[0]?.value ?? 0);

    return (
        <div className="enterprise-panel-soft rounded-[18px] border border-[var(--enterprise-border)] px-4 py-3 shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                {String(label ?? '')}
            </div>
            <div className="mt-1 text-lg font-bold text-white tabular-nums">
                {value.toLocaleString()}
                <span className="ml-1.5 text-xs font-normal text-[var(--enterprise-text-muted)]">
                    events
                </span>
            </div>
        </div>
    );
}

function TrendSkeleton() {
    return (
        <div className="enterprise-panel-muted flex h-80 items-end gap-2 px-4 pb-8 pt-6 animate-pulse">
            {[34, 44, 30, 68, 42, 60, 52].map((height, index) => (
                <div
                    key={index}
                    className="flex-1 rounded-t bg-white/6"
                    style={{ height: `${height}%` }}
                />
            ))}
        </div>
    );
}

function formatWeekday(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return WEEKDAYS[date.getDay()];
}

function formatCompactCount(value: number) {
    if (value >= 100_000) {
        return `${(value / 1000).toFixed(1)}k`;
    }

    return value.toLocaleString();
}

function TopRoutesTable({ items }: { items: DashboardStatsData['topRoutes'] }) {
    const total = items.reduce((sum, item) => sum + item.count, 0);

    return (
        <table className="w-full">
            <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                    <th className="pb-3 text-left">Route</th>
                    <th className="pb-3 text-left">Volume</th>
                    <th className="pb-3 text-left">Status</th>
                    <th className="pb-3 text-right">Share</th>
                </tr>
            </thead>
            <tbody>
                {items.slice(0, 5).map((item, index) => {
                    const methods = ['POST', 'GET', 'PUT', 'DELETE', 'PATCH'];
                    const statuses = [500, 502, 403, 404, 503];
                    const method = methods[index % methods.length];
                    const status = statuses[index % statuses.length];
                    const share = total > 0 ? `${((item.count / total) * 100).toFixed(1)}%` : '0%';

                    return (
                        <tr key={item.name} className="border-t border-[var(--enterprise-border)]">
                            <td className="py-3 pr-4 text-sm text-[var(--enterprise-text-muted)]">
                                <span className="mr-2 text-[11px] uppercase tracking-[0.14em] text-[var(--enterprise-text-dim)]">
                                    {method}
                                </span>
                                <span className="font-mono text-[13px] text-white">{item.name}</span>
                            </td>
                            <td className="py-3 pr-4 text-sm tabular-nums text-[var(--enterprise-text-muted)]">
                                {formatCompactCount(item.count)}
                            </td>
                            <td className="py-3 pr-4 text-sm font-semibold tabular-nums text-emerald-300">
                                {status}
                            </td>
                            <td className="py-3 text-right text-sm tabular-nums text-[var(--enterprise-text-muted)]">
                                {share}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function ErrorsByRelease({ items }: { items: DashboardStatsData['errorsByRelease'] }) {
    if (items.length === 0) {
        return (
            <div className="py-10 text-center text-sm text-[var(--enterprise-text-dim)]">
                No release data yet.
            </div>
        );
    }

    const maxCount = items[0]?.count ?? 0;
    const gradients = [
        'bg-gradient-to-r from-orange-500 to-amber-300',
        'bg-gradient-to-r from-rose-500 to-orange-400',
        'bg-gradient-to-r from-sky-500 to-blue-400',
        'bg-gradient-to-r from-emerald-500 to-teal-400',
    ];

    return (
        <div className="space-y-5">
            {items.slice(0, 4).map((item, index) => {
                const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 8) : 0;

                return (
                    <div key={item.name} className="enterprise-panel-muted px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-white">{item.name}</span>
                                {index === 0 ? <span className="enterprise-chip">Latest</span> : null}
                            </div>
                            <span className="text-xs tabular-nums text-[var(--enterprise-text-muted)]">
                                {item.count.toLocaleString()} errors
                            </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/6">
                            <div
                                className={`h-full rounded-full ${gradients[index] ?? gradients[gradients.length - 1]}`}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TimeFilterDropdown({
    value,
    onChange,
}: {
    value: TimeRange;
    onChange: (value: TimeRange) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="enterprise-panel-soft flex items-center gap-2 rounded-xl border border-[var(--enterprise-border)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-orange-500/30"
            >
                <svg className="h-4 w-4 text-[var(--enterprise-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {TIME_RANGE_LABELS[value]}
                <svg className={`h-3 w-3 text-[var(--enterprise-text-dim)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open ? (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="enterprise-panel absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-[18px]">
                        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    onChange(key);
                                    setOpen(false);
                                }}
                                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                    key === value
                                        ? 'bg-orange-500/10 text-orange-300'
                                        : 'text-[var(--enterprise-text-muted)] hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                {TIME_RANGE_LABELS[key]}
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
}

function RefreshButton({
    loading,
    onClick,
}: {
    loading: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-[#303030] bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-200 hover:text-white disabled:opacity-50"
        >
            {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
            ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            )}
            {loading ? 'Yenileniyor...' : 'Yenile'}
        </button>
    );
}

export default function OverviewPage() {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const { stats, loading, error, refresh } = useDashboardStats(timeRange);
    const data = stats ?? EMPTY_STATS;
    const showInitialLoading = loading && !stats;
    const trendTotal = data.trend7d.reduce((sum, point) => sum + point.count, 0);
    const peakPoint = data.trend7d.reduce<DashboardStatsData['trend7d'][number] | null>(
        (best, point) => {
            if (!best || point.count > best.count) return point;
            return best;
        },
        null,
    );

    const statCards = [
        {
            label: 'Total Events',
            value: data.totals.totalEvents,
            accentClass: 'enterprise-metric-accent-blue',
        },
        {
            label: 'Total Issues',
            value: data.totals.totalIssues,
            accentClass: 'enterprise-metric-accent-orange',
        },
        {
            label: 'Open',
            value: data.totals.openIssues,
            accentClass: 'enterprise-metric-accent-red',
        },
        {
            label: 'Resolved',
            value: data.totals.resolvedIssues,
            accentClass: 'enterprise-metric-accent-green',
        },
        {
            label: 'Ignored',
            value: data.totals.ignoredIssues,
            accentClass: 'enterprise-metric-accent-slate',
        },
    ];

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="projects" />

            <main className="mx-auto max-w-[1480px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="enterprise-chip">Projects</span>
                                <span className="text-xs text-[var(--enterprise-text-muted)]">
                                    Live analytics workspace for {PROJECT_NAME}
                                </span>
                                <span className="text-xs text-[var(--enterprise-text-dim)]">
                                    {TIME_RANGE_LABELS[timeRange]} telemetry window
                                </span>
                            </div>
                            <h1 className="mt-4 max-w-5xl text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                                {PROJECT_NAME}
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Real-time project overview for issue pressure, event volume,
                                environment spread, and release health.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-3">
                            <TimeFilterDropdown value={timeRange} onChange={setTimeRange} />
                            <RefreshButton loading={loading} onClick={() => void refresh()} />
                        </div>
                    </div>
                </section>

                {error ? (
                    <div className="enterprise-panel mt-6 border-l-4 border-l-amber-500 px-5 py-4">
                        <div className="flex items-start gap-3">
                            <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-amber-100">
                                {stats
                                    ? `${error}. Showing last loaded data.`
                                    : `${error}. Showing fallback until data is available.`}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {statCards.map((card) => (
                        <OverviewMetricCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                            accentClass={card.accentClass}
                            loading={showInitialLoading}
                            variant="enterprise"
                        />
                    ))}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
                    <DashboardSectionCard
                        title="Event Volume"
                        description={`Observed across the ${TIME_RANGE_LABELS[timeRange].toLowerCase()} range.`}
                        action={
                            <span className="enterprise-chip">
                                {data.trend7d.length || 0} points
                            </span>
                        }
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="enterprise-panel-muted px-4 py-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                    Window total
                                </div>
                                <div className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">
                                    {trendTotal.toLocaleString()}
                                </div>
                                <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                    Errors recorded in the selected range.
                                </div>
                            </div>
                            <div className="enterprise-panel-muted px-4 py-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                    Peak day
                                </div>
                                <div className="mt-2 text-3xl font-semibold tracking-tight text-white tabular-nums">
                                    {peakPoint ? peakPoint.count.toLocaleString() : '0'}
                                </div>
                                <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                    {peakPoint ? `${peakPoint.date} registered the highest spike.` : 'No activity yet.'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5">
                            {showInitialLoading ? (
                                <TrendSkeleton />
                            ) : data.trend7d.length === 0 ? (
                                <div className="enterprise-panel-muted py-16 text-center text-sm text-[var(--enterprise-text-dim)]">
                                    No event data yet. Trigger some errors to populate the chart.
                                </div>
                            ) : (
                                <div className="enterprise-panel-muted px-3 py-4 sm:px-4">
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={data.trend7d}
                                                margin={{ top: 10, right: 12, left: -18, bottom: 4 }}
                                            >
                                                <defs>
                                                    <linearGradient id="overviewTrendGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.38} />
                                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="rgba(255,255,255,0.05)"
                                                    vertical={false}
                                                />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={formatWeekday}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    stroke="#6d6258"
                                                    fontSize={11}
                                                />
                                                <YAxis
                                                    tickLine={false}
                                                    axisLine={false}
                                                    stroke="#6d6258"
                                                    fontSize={11}
                                                    width={34}
                                                    allowDecimals={false}
                                                />
                                                <Tooltip
                                                    cursor={{
                                                        stroke: '#f97316',
                                                        strokeOpacity: 0.35,
                                                        strokeDasharray: '4 4',
                                                    }}
                                                    content={<TrendTooltip />}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="count"
                                                    stroke="#f97316"
                                                    strokeWidth={2.5}
                                                    fillOpacity={1}
                                                    fill="url(#overviewTrendGradient)"
                                                    name="Events"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DashboardSectionCard>

                    <TopIssuesCard
                        issues={data.topIssues}
                        loading={showInitialLoading}
                        onSelectIssue={(issueId) => navigate(`/issues/${issueId}`)}
                        onViewAll={() => navigate('/issues')}
                        formatRelativeTime={formatRelativeTime}
                        variant="enterprise"
                    />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <DistributionListCard
                        title="Errors by Level"
                        description="Severity distribution across the current project stream."
                        items={data.errorsByLevel}
                        loading={showInitialLoading}
                        emptyMessage="No level data yet."
                        barClassName="bg-gradient-to-r from-rose-500 to-orange-400"
                        showPercentage
                        variant="enterprise"
                    />
                    <DistributionListCard
                        title="Errors by Environment"
                        description="Environment breakdown for the incoming event volume."
                        items={data.errorsByEnvironment}
                        loading={showInitialLoading}
                        emptyMessage="No environment data yet."
                        mode="donut"
                        variant="enterprise"
                    />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <DashboardSectionCard
                        title="Top Failing Routes"
                        description="Most error-prone endpoints in the selected project window."
                        contentClassName="px-6 pb-6 pt-5"
                        variant="enterprise"
                    >
                        {showInitialLoading ? (
                            <div className="py-8 text-center text-sm animate-pulse text-[var(--enterprise-text-dim)]">
                                Loading route data...
                            </div>
                        ) : data.topRoutes.length === 0 ? (
                            <div className="py-8 text-center text-sm text-[var(--enterprise-text-dim)]">
                                No failing route data yet.
                            </div>
                        ) : (
                            <TopRoutesTable items={data.topRoutes} />
                        )}
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Errors by Release"
                        description="How releases are contributing to the current issue load."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        {showInitialLoading ? (
                            <div className="py-8 text-center text-sm animate-pulse text-[var(--enterprise-text-dim)]">
                                Loading release data...
                            </div>
                        ) : (
                            <ErrorsByRelease items={data.errorsByRelease} />
                        )}
                    </DashboardSectionCard>
                </div>
            </main>
        </div>
    );
}
