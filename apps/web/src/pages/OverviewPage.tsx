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
        <div className="h-72 flex items-end gap-3 animate-pulse">
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
            <header className="border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            Smart Error Tracker
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Dashboard Overview</p>
                    </div>
                    <nav className="flex gap-2 flex-wrap justify-end">
                        <span className="px-4 py-2 text-sm font-medium text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                            Overview
                        </span>
                        <button
                            type="button"
                            onClick={() => navigate('/issues')}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Issues
                        </button>
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {error ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
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
                            <div className="font-semibold">Dashboard analytics unavailable</div>
                            <div className="text-amber-100/80">
                                {stats
                                    ? `${error}. Showing the last loaded dashboard data.`
                                    : `${error}. Showing empty fallback sections until data is available.`}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] gap-6">
                    <DashboardSectionCard
                        title="Events - Last 7 Days"
                        description="Daily event volume across the most recent seven-day window."
                        contentClassName="p-5"
                    >
                        {showInitialLoading ? (
                            <TrendSkeleton />
                        ) : data.trend7d.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-900/40 px-4 py-16 text-center text-sm text-slate-500">
                                No recent event trend yet. Trigger some errors to populate the chart.
                            </div>
                        ) : (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.trend7d}>
                                        <defs>
                                            <linearGradient id="overviewEventsGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatTrendDate}
                                            stroke="#64748b"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={12}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                border: '1px solid #334155',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                            }}
                                            labelFormatter={(value) =>
                                                typeof value === 'string'
                                                    ? formatTrendDate(value)
                                                    : String(value)
                                            }
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#overviewEventsGradient)"
                                            name="Events"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
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

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
