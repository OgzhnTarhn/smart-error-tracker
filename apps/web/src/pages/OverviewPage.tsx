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
import { useDashboardStats } from '../hooks/useDashboardStats';
import type { DashboardStatsData } from '../lib/api';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
});
const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
});

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

interface TrendTooltipProps {
    active?: boolean;
    label?: string | number;
    payload?: Array<{
        value?: number | string;
    }>;
}

function formatTrendDate(value: string) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
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

function TrendSkeleton() {
    return (
        <div className="rounded-[1.35rem] border border-slate-800/80 bg-slate-950/35 p-4 animate-pulse">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="h-4 w-28 rounded-full bg-slate-700/50" />
                <div className="h-4 w-16 rounded-full bg-slate-800/70" />
            </div>
            <div className="h-64 flex items-end gap-3">
                {[36, 52, 28, 64, 40, 58, 72].map((height, index) => (
                    <div key={index} className="flex-1 flex flex-col justify-end gap-3">
                        <div
                            className="rounded-t-xl bg-slate-700/50"
                            style={{ height: `${height}%` }}
                        />
                        <div className="h-3 rounded bg-slate-700/40" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
    if (!active || !payload?.length) return null;

    const value = typeof payload[0]?.value === 'number'
        ? payload[0].value
        : Number(payload[0]?.value ?? 0);

    return (
        <div className="min-w-36 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-4 py-3 shadow-[0_22px_40px_-24px_rgba(15,23,42,1)] backdrop-blur">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {typeof label === 'string' ? formatTrendDate(label) : String(label ?? '')}
            </div>
            <div className="mt-2 flex items-end justify-between gap-4">
                <div className="text-2xl font-semibold tracking-tight text-slate-50 tabular-nums">
                    {value.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">
                    {value === 1 ? 'event' : 'events'}
                </div>
            </div>
        </div>
    );
}

export default function OverviewPage() {
    const navigate = useNavigate();
    const { stats, loading, error, refresh } = useDashboardStats();
    const data = stats ?? EMPTY_STATS;
    const showInitialLoading = loading && !stats;

    const statCards = [
        {
            label: 'Total Events',
            value: data.totals.totalEvents,
            color: 'text-blue-400',
            bgBorder: 'bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/20',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                </svg>
            ),
        },
        {
            label: 'Total Issues',
            value: data.totals.totalIssues,
            color: 'text-violet-400',
            bgBorder: 'bg-gradient-to-br from-violet-500/20 to-violet-600/5 border-violet-500/20',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                </svg>
            ),
        },
        {
            label: 'Open',
            value: data.totals.openIssues,
            color: 'text-red-400',
            bgBorder: 'bg-gradient-to-br from-red-500/20 to-red-600/5 border-red-500/20',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
        },
        {
            label: 'Resolved',
            value: data.totals.resolvedIssues,
            color: 'text-emerald-400',
            bgBorder: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            ),
        },
        {
            label: 'Ignored',
            value: data.totals.ignoredIssues,
            color: 'text-amber-400',
            bgBorder: 'bg-gradient-to-br from-amber-500/20 to-amber-600/5 border-amber-500/20',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                </svg>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <header className="border-b border-slate-800/90 px-4 py-4 sm:px-6">
                <div className="max-w-7xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            Smart Error Tracker
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">Dashboard Overview</p>
                    </div>
                    <nav className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span className="inline-flex min-w-[104px] justify-center px-4 py-2.5 text-sm font-medium text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                            Overview
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/issues')}
                            className="inline-flex min-w-[104px] justify-center px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-800/80 border border-slate-700/70 hover:bg-slate-800 rounded-xl transition-colors"
                        >
                            Issues
                        </button>
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            disabled={loading}
                            className="inline-flex min-w-[104px] justify-center px-4 py-2.5 text-sm font-medium text-slate-200 bg-slate-800 border border-slate-700/80 rounded-xl hover:bg-slate-700/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 sm:space-y-8">
                {error ? (
                    <div className="flex items-start gap-3 rounded-[1.4rem] border border-amber-500/30 bg-amber-500/10 px-4 py-4 shadow-[0_18px_40px_-30px_rgba(245,158,11,0.7)]">
                        <svg
                            className="w-5 h-5 mt-0.5 shrink-0 text-amber-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div>
                            <div className="font-semibold text-amber-50">Dashboard analytics unavailable</div>
                            <div className="mt-1 text-sm leading-6 text-amber-100/80">
                                {stats
                                    ? `${error}. Showing the last loaded dashboard data.`
                                    : `${error}. Showing empty fallback sections until data is available.`}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-5">
                    {statCards.map((card) => (
                        <OverviewMetricCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                            colorClassName={card.color}
                            bgClassName={card.bgBorder}
                            icon={card.icon}
                            loading={showInitialLoading}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)] gap-6">
                    <DashboardSectionCard
                        title="Events - Last 7 Days"
                        description="Daily event volume across the most recent seven-day window."
                        action={(
                            <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Daily buckets
                            </span>
                        )}
                        contentClassName="p-5 sm:p-6"
                    >
                        {showInitialLoading ? (
                            <TrendSkeleton />
                        ) : data.trend7d.length === 0 ? (
                            <div className="rounded-[1.35rem] border border-dashed border-slate-700/70 bg-slate-900/40 px-4 py-16 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/70 text-slate-500">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-6m3 6V7m3 10v-4m3 8H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="mt-4 text-sm font-medium text-slate-200">No recent event trend yet</div>
                                <div className="mt-1 text-sm text-slate-500">
                                    Trigger some errors to populate the chart.
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-[1.35rem] border border-slate-800/80 bg-slate-950/35 p-3 sm:p-4">
                                <div className="h-64 sm:h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={data.trend7d}
                                        margin={{ top: 12, right: 12, left: -18, bottom: 4 }}
                                    >
                                        <defs>
                                            <linearGradient id="overviewEventsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.42} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#1e293b"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatTrendDate}
                                            tickLine={false}
                                            axisLine={false}
                                            stroke="#94a3b8"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            stroke="#94a3b8"
                                            fontSize={12}
                                            width={34}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            cursor={{
                                                stroke: '#8b5cf6',
                                                strokeOpacity: 0.3,
                                                strokeDasharray: '4 4',
                                            }}
                                            content={<TrendTooltip />}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#8b5cf6"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#overviewEventsGradient)"
                                            name="Events"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            </div>
                        )}
                    </DashboardSectionCard>

                    <TopIssuesCard
                        issues={data.topIssues}
                        loading={showInitialLoading}
                        onSelectIssue={(issueId) => navigate(`/issues/${issueId}`)}
                        formatRelativeTime={formatRelativeTime}
                    />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
                    <DistributionListCard
                        title="Errors by Level"
                        description="How incoming events are distributed across severity levels."
                        items={data.errorsByLevel}
                        loading={showInitialLoading}
                        emptyMessage="No level data yet."
                        barClassName="bg-gradient-to-r from-red-500 to-rose-400"
                    />
                    <DistributionListCard
                        title="Errors by Environment"
                        description="Where the current event volume is coming from."
                        items={data.errorsByEnvironment}
                        loading={showInitialLoading}
                        emptyMessage="No environment data yet."
                        barClassName="bg-gradient-to-r from-emerald-500 to-teal-400"
                    />
                    <DistributionListCard
                        title="Errors by Release"
                        description="Release versions contributing to the current error volume."
                        items={data.errorsByRelease}
                        loading={showInitialLoading}
                        emptyMessage="No release data yet."
                        monospaceLabels
                        barClassName="bg-gradient-to-r from-blue-500 to-cyan-400"
                    />
                    <DistributionListCard
                        title="Top Failing Routes / Endpoints"
                        description="Most error-prone frontend routes and backend endpoints."
                        items={data.topRoutes}
                        loading={showInitialLoading}
                        emptyMessage="No failing route data yet."
                        monospaceLabels
                        barClassName="bg-gradient-to-r from-violet-500 to-fuchsia-400"
                    />
                </div>
            </main>
        </div>
    );
}
