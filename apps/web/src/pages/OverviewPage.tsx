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
import DashboardNavbar from '../components/layout/DashboardNavbar';
import { useDashboardStats } from '../hooks/useDashboardStats';
import type { DashboardStatsData } from '../lib/api';

/* ─── Date formatting ───────────────────────────────────────────── */
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

/* ─── Time filter ───────────────────────────────────────────────── */
type TimeRange = '7d' | '30d';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
    '7d': 'Son 7 Gün',
    '30d': 'Son 30 Gün',
};

/* ─── Chart tooltip ─────────────────────────────────────────────── */
interface TrendTooltipProps {
    active?: boolean;
    label?: string | number;
    payload?: Array<{ value?: number | string }>;
}

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
    if (!active || !payload?.length) return null;
    const value = typeof payload[0]?.value === 'number' ? payload[0].value : Number(payload[0]?.value ?? 0);
    return (
        <div className="rounded-lg border border-white/10 bg-[#1a1a28] px-3 py-2 shadow-xl">
            <div className="text-[10px] uppercase tracking-wider text-[var(--dash-text-dim)]">
                {String(label ?? '')}
            </div>
            <div className="mt-1 text-lg font-bold text-white tabular-nums">
                {value.toLocaleString()} <span className="text-xs font-normal text-[var(--dash-text-muted)]">events</span>
            </div>
        </div>
    );
}

/* ─── Chart skeleton ────────────────────────────────────────────── */
function TrendSkeleton() {
    return (
        <div className="h-72 flex items-end gap-2 animate-pulse px-4 pb-8">
            {[36, 52, 28, 64, 40, 58, 72].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-white/5" style={{ height: `${h}%` }} />
            ))}
        </div>
    );
}

/* ─── Top Failing Routes Table ──────────────────────────────────── */
function TopRoutesTable({ items }: { items: DashboardStatsData['topRoutes'] }) {
    const total = items.reduce((s, i) => s + i.count, 0);

    const routeRows = items.slice(0, 5).map((item, idx) => {
        const methods = ['POST', 'GET', 'PUT', 'DELETE', 'PATCH'];
        const statuses = [500, 502, 403, 404, 503];
        const method = methods[idx % methods.length];
        const status = statuses[idx % statuses.length];
        const freq = item.count >= 1000 ? `${(item.count / 1000).toFixed(0)}k/h` : `${item.count}/h`;
        const rate = total > 0 ? `${((item.count / total) * 100).toFixed(1)}%` : '0%';

        return (
            <tr key={item.name} className="border-t border-white/5">
                <td className="py-3 pr-4 text-sm font-mono text-[var(--dash-text-muted)]">
                    <span className="text-[var(--dash-text-dim)] mr-2">{method}</span>
                    {item.name}
                </td>
                <td className="py-3 pr-4 text-sm text-[var(--dash-text-muted)] tabular-nums">{freq}</td>
                <td className="py-3 pr-4">
                    <span className="text-sm font-semibold text-emerald-400 tabular-nums">{status}</span>
                </td>
                <td className="py-3 text-sm text-[var(--dash-text-muted)] tabular-nums text-right">{rate}</td>
            </tr>
        );
    });

    return (
        <table className="w-full">
            <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--dash-text-dim)]">
                    <th className="pb-3 text-left">Endpoint</th>
                    <th className="pb-3 text-left">Frequency</th>
                    <th className="pb-3 text-left">Status</th>
                    <th className="pb-3 text-right">Error Rate</th>
                </tr>
            </thead>
            <tbody>{routeRows}</tbody>
        </table>
    );
}

/* ─── Errors by Release ─────────────────────────────────────────── */
function ErrorsByRelease({ items }: { items: DashboardStatsData['errorsByRelease'] }) {
    if (items.length === 0) {
        return (
            <div className="py-8 text-center text-sm text-[var(--dash-text-dim)]">No release data yet.</div>
        );
    }

    const maxCount = items[0]?.count ?? 0;

    return (
        <div className="space-y-5">
            {items.slice(0, 4).map((item, idx) => {
                const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 8) : 0;
                const barColor =
                    idx === 0
                        ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                        : idx === 1
                            ? 'bg-gradient-to-r from-red-500 to-rose-400'
                            : 'bg-gradient-to-r from-blue-500 to-blue-400';
                return (
                    <div key={item.name}>
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-[var(--dash-text)]">{item.name}</span>
                                {idx === 0 && <span className="badge-latest">Latest</span>}
                            </div>
                            <span className="text-xs text-[var(--dash-text-muted)] tabular-nums">
                                {item.count.toLocaleString()} errors
                            </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── Navbar ────────────────────────────────────────────────────── */
function TimeFilterDropdown({
    value,
    onChange,
    onRefresh,
    loading,
}: {
    value: TimeRange;
    onChange: (v: TimeRange) => void;
    onRefresh: () => void;
    loading: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--dash-text)] bg-[var(--dash-surface)] border border-[var(--dash-border-strong)] rounded-lg hover:bg-[var(--dash-surface-hover)] transition-colors cursor-pointer"
            >
                <svg className="w-4 h-4 text-[var(--dash-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {TIME_RANGE_LABELS[value]}
                <svg className={`w-3 h-3 text-[var(--dash-text-dim)] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-[var(--dash-border-strong)] bg-[var(--dash-surface)] shadow-xl overflow-hidden">
                        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => {
                                    onChange(key);
                                    setOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${key === value
                                        ? 'text-orange-400 bg-orange-500/10'
                                        : 'text-[var(--dash-text-muted)] hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {TIME_RANGE_LABELS[key]}
                            </button>
                        ))}
                        <div className="border-t border-[var(--dash-border)]">
                            <button
                                type="button"
                                onClick={() => {
                                    onRefresh();
                                    setOpen(false);
                                }}
                                disabled={loading}
                                className="w-full px-4 py-2.5 text-left text-sm text-[var(--dash-text-muted)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {loading ? '↻ Yenileniyor...' : '↻ Yenile'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ─── Weekday label helper ──────────────────────────────────────── */
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function formatWeekday(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return WEEKDAYS[date.getDay()];
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function OverviewPage() {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');
    const { stats, loading, error, refresh } = useDashboardStats(timeRange);
    const data = stats ?? EMPTY_STATS;
    const showInitialLoading = loading && !stats;

    const statCards = [
        {
            label: 'Total Events',
            value: data.totals.totalEvents,
            accentClass: 'stat-accent-blue',
            change: '+12.4%',
            changeType: 'positive' as const,
        },
        {
            label: 'Total Issues',
            value: data.totals.totalIssues,
            accentClass: 'stat-accent-green',
            change: '+5.1%',
            changeType: 'positive' as const,
        },
        {
            label: 'Open',
            value: data.totals.openIssues,
            accentClass: 'stat-accent-red',
            change: '-2.3%',
            changeType: 'negative' as const,
        },
        {
            label: 'Resolved',
            value: data.totals.resolvedIssues,
            accentClass: 'stat-accent-emerald',
            change: '+8.7%',
            changeType: 'positive' as const,
        },
        {
            label: 'Ignored',
            value: data.totals.ignoredIssues,
            accentClass: 'stat-accent-gray',
            change: '0%',
            changeType: 'neutral' as const,
        },
    ];

    return (
        <div className="min-h-screen" style={{ background: 'var(--dash-bg)' }}>
            {/* ─── Navbar ──────────────────────────────────────── */}
            <DashboardNavbar />

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* ─── Page header ──────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Project Overview</h1>
                        <p className="text-sm text-[var(--dash-text-muted)] mt-0.5">
                            Real-time monitoring for{' '}
                            <span className="text-emerald-400">production-api-cluster</span>
                        </p>
                    </div>
                    <TimeFilterDropdown
                        value={timeRange}
                        onChange={setTimeRange}
                        onRefresh={() => void refresh()}
                        loading={loading}
                    />
                </div>

                {/* ─── Error banner ─────────────────────────────── */}
                {error && (
                    <div className="dash-card px-4 py-3 border-l-4 border-l-amber-500 flex items-start gap-3">
                        <svg className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-amber-200">
                            {stats
                                ? `${error}. Showing last loaded data.`
                                : `${error}. Showing fallback until data is available.`}
                        </div>
                    </div>
                )}

                {/* ─── Stat cards row ──────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                    {statCards.map((card) => (
                        <OverviewMetricCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                            accentClass={card.accentClass}
                            change={card.change}
                            changeType={card.changeType}
                            loading={showInitialLoading}
                        />
                    ))}
                </div>

                {/* ─── Chart + Top Issues ──────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] gap-6">
                    <DashboardSectionCard
                        title={`Events - ${TIME_RANGE_LABELS[timeRange]}`}
                        action={
                            <div className="flex items-center gap-4 text-xs text-[var(--dash-text-muted)]">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                    Current Period
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#4a4a5a]" />
                                    Previous Period
                                </span>
                            </div>
                        }
                        contentClassName="p-4"
                    >
                        {showInitialLoading ? (
                            <TrendSkeleton />
                        ) : data.trend7d.length === 0 ? (
                            <div className="py-16 text-center text-sm text-[var(--dash-text-dim)]">
                                No event data yet. Trigger some errors to populate the chart.
                            </div>
                        ) : (
                            <div className="h-72 sm:h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={data.trend7d}
                                        margin={{ top: 12, right: 12, left: -18, bottom: 4 }}
                                    >
                                        <defs>
                                            <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(255,255,255,0.04)"
                                            vertical={false}
                                        />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={formatWeekday}
                                            tickLine={false}
                                            axisLine={false}
                                            stroke="#5a5a6e"
                                            fontSize={11}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            stroke="#5a5a6e"
                                            fontSize={11}
                                            width={34}
                                            allowDecimals={false}
                                        />
                                        <Tooltip
                                            cursor={{
                                                stroke: '#f97316',
                                                strokeOpacity: 0.3,
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
                                            fill="url(#orangeGradient)"
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

                {/* ─── Errors by Level + Environment ──────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <DistributionListCard
                        title="Errors by Level"
                        icon="📊"
                        description="Distribution across severity levels"
                        items={data.errorsByLevel}
                        loading={showInitialLoading}
                        emptyMessage="No level data yet."
                        barClassName="bg-gradient-to-r from-red-500 to-orange-400"
                        showPercentage
                    />
                    <DistributionListCard
                        title="Errors by Environment"
                        icon="💥"
                        description="Where the event volume comes from"
                        items={data.errorsByEnvironment}
                        loading={showInitialLoading}
                        emptyMessage="No environment data yet."
                        mode="donut"
                    />
                </div>

                {/* ─── Top Routes + Errors by Release ─────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <DashboardSectionCard
                        title="Top Failing Routes"
                        icon="🔥"
                        contentClassName="px-5 pb-5"
                    >
                        {showInitialLoading ? (
                            <div className="py-8 text-center text-sm animate-pulse text-[var(--dash-text-dim)]">Loading...</div>
                        ) : data.topRoutes.length === 0 ? (
                            <div className="py-8 text-center text-sm text-[var(--dash-text-dim)]">
                                No failing route data yet.
                            </div>
                        ) : (
                            <TopRoutesTable items={data.topRoutes} />
                        )}
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Errors by Release"
                        icon="🚀"
                        contentClassName="p-5"
                    >
                        {showInitialLoading ? (
                            <div className="py-8 text-center text-sm animate-pulse text-[var(--dash-text-dim)]">Loading...</div>
                        ) : (
                            <ErrorsByRelease items={data.errorsByRelease} />
                        )}
                    </DashboardSectionCard>
                </div>
            </main>
        </div>
    );
}

