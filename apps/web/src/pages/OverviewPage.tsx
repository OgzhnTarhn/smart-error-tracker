import { type ReactNode, useState } from 'react';
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
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { usePlatformOverview } from '../hooks/usePlatformOverview';
import {
    PLATFORM_ENVIRONMENT_LABELS,
    PLATFORM_RANGE_LABELS,
    type PlatformAiInsight,
    type PlatformOverviewEnvironment,
    type PlatformOverviewRange,
    type PlatformProjectPressure,
    type PlatformReleaseHealth,
    type PlatformSignalItem,
    type PlatformTrendPoint,
} from '../lib/platformOverviewMock';

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

const RANGE_OPTIONS: Array<{ value: PlatformOverviewRange; label: string }> = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
];

const ENVIRONMENT_OPTIONS: Array<{
    value: PlatformOverviewEnvironment;
    label: string;
}> = [
    { value: 'all', label: 'All' },
    { value: 'production', label: 'Production' },
    { value: 'staging', label: 'Staging' },
    { value: 'development', label: 'Development' },
];

interface TrendTooltipProps {
    active?: boolean;
    payload?: Array<{
        value?: number | string;
        payload?: PlatformTrendPoint;
    }>;
}

function formatRelativeTime(value: Date) {
    const diffMs = value.getTime() - Date.now();
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

function formatCompactCount(value: number) {
    if (value >= 1_000_000) {
        const millions = value / 1_000_000;
        return millions >= 10 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
    }

    if (value >= 10_000) {
        const thousands = value / 1_000;
        return thousands >= 100 ? `${Math.round(thousands)}k` : `${thousands.toFixed(1)}k`;
    }

    return value.toLocaleString();
}

function capitalizeLabel(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function getSignalToneClasses(
    tone: PlatformSignalItem['tone'] | PlatformAiInsight['tone'],
) {
    switch (tone) {
        case 'critical':
            return 'border-red-500/20 bg-red-500/10 text-red-200';
        case 'high':
            return 'border-orange-500/20 bg-orange-500/10 text-orange-200';
        case 'medium':
            return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
        case 'low':
            return 'border-slate-500/20 bg-slate-500/10 text-slate-200';
        case 'positive':
            return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
        default:
            return 'border-white/10 bg-white/[0.04] text-[var(--enterprise-text-muted)]';
    }
}

function getProjectTrendClasses(trend: PlatformProjectPressure['trend']) {
    switch (trend) {
        case 'up':
            return 'border-orange-500/20 bg-orange-500/10 text-orange-200';
        case 'down':
            return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
        default:
            return 'border-white/10 bg-white/[0.04] text-[var(--enterprise-text-muted)]';
    }
}

function getProjectTrendLabel(trend: PlatformProjectPressure['trend']) {
    switch (trend) {
        case 'up':
            return 'Rising';
        case 'down':
            return 'Cooling';
        default:
            return 'Stable';
    }
}

function getReleaseStatusClasses(status: PlatformReleaseHealth['status']) {
    switch (status) {
        case 'degraded':
            return 'border-red-500/20 bg-red-500/10 text-red-200';
        case 'watch':
            return 'border-amber-500/20 bg-amber-500/10 text-amber-100';
        default:
            return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
    }
}

function getKpiIcon(label: string) {
    switch (label) {
        case 'Total Events':
            return (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 12h4m3-6h7m-7 6h7m-7 6h7M5 6h4v12H5z" />
                </svg>
            );
        case 'Open Issues':
            return (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 6h8M8 12h8M8 18h5M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
                </svg>
            );
        case 'Critical Issues':
            return (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
            );
        case 'Active Alerts':
            return (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.44V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.16c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0" />
                </svg>
            );
        case 'Regressions':
            return (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 15l-6 6m0 0v-4m0 4h4M9 9l6-6m0 0v4m0-4h-4" />
                </svg>
            );
        default:
            return (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            );
    }
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload;
    const value =
        typeof payload[0]?.value === 'number'
            ? payload[0].value
            : Number(payload[0]?.value ?? 0);

    return (
        <div className="enterprise-panel-soft rounded-[18px] border border-[var(--enterprise-border)] px-4 py-3 shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                {point?.label ?? ''}
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
            className="flex items-center gap-2 rounded-xl border border-[var(--enterprise-border)] bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-orange-500/30 disabled:opacity-50"
        >
            {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
            ) : (
                <svg className="h-4 w-4 text-[var(--enterprise-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v5h.58m15.36 2A8.001 8.001 0 004.58 9m0 0H9m11 11v-5h-.58m0 0a8.003 8.003 0 01-15.36-2M19.42 15H15" />
                </svg>
            )}
            {loading ? 'Refreshing...' : 'Refresh'}
        </button>
    );
}

function SectionHeading({
    title,
    subtitle,
    action,
}: {
    title: string;
    subtitle: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--enterprise-text-dim)]">
                    {title}
                </div>
                <div className="mt-2 text-sm text-[var(--enterprise-text-muted)]">{subtitle}</div>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    );
}

function SectionActionButton({
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
            className="rounded-full border border-[var(--enterprise-border)] bg-white/[0.03] px-4 py-2 text-sm font-medium text-[var(--enterprise-text-muted)] transition-colors hover:border-orange-500/30 hover:text-white"
        >
            {label}
        </button>
    );
}

function SegmentedControl<T extends string>({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                {label}
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-[var(--enterprise-border)] bg-black/35 p-1">
                {options.map((option) => {
                    const isActive = option.value === value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            aria-pressed={isActive}
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-orange-500/12 text-orange-200'
                                    : 'text-[var(--enterprise-text-muted)] hover:text-white'
                            }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function SignalListCard({
    title,
    description,
    items,
    emptyMessage,
    action,
}: {
    title: string;
    description: string;
    items: PlatformSignalItem[];
    emptyMessage: string;
    action?: ReactNode;
}) {
    return (
        <DashboardSectionCard
            title={title}
            description={description}
            action={action}
            contentClassName="p-4"
            variant="enterprise"
        >
            {items.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--enterprise-text-dim)]">
                    {emptyMessage}
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="enterprise-panel-soft rounded-[20px] border border-[var(--enterprise-border)] p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getSignalToneClasses(item.tone)}`}>
                                        {item.statusLabel}
                                    </span>
                                    <span className="rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        {PLATFORM_ENVIRONMENT_LABELS[item.environment]}
                                    </span>
                                </div>
                                <div className="text-xs text-[var(--enterprise-text-dim)]">
                                    {item.timeLabel}
                                </div>
                            </div>

                            <div className="mt-3 text-sm font-semibold leading-6 text-white">
                                {item.title}
                            </div>
                            <div className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                {item.summary}
                            </div>

                            <div className="mt-4 flex items-end justify-between gap-4">
                                <div className="font-mono text-[12px] text-[var(--enterprise-text-dim)]">
                                    {item.project}
                                </div>
                                <div className="text-sm font-semibold text-white tabular-nums">
                                    {item.metric}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardSectionCard>
    );
}

function TopProjectsPanel({ items }: { items: PlatformProjectPressure[] }) {
    const maxScore = items[0]?.pressureScore ?? 1;

    return (
        <DashboardSectionCard
            title="Top Projects by Issue Pressure"
            description="Projects where open issue load, regressions, and MTTR combine into the highest operational pressure."
            action={<span className="enterprise-chip">{items.length} tracked</span>}
            contentClassName="p-4"
            variant="enterprise"
        >
            <div className="space-y-3">
                {items.map((item) => {
                    const width = Math.max((item.pressureScore / maxScore) * 100, 12);

                    return (
                        <div
                            key={item.name}
                            className="enterprise-panel-muted rounded-[18px] px-4 py-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-white">
                                            {item.name}
                                        </span>
                                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                            {item.team}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                        {PLATFORM_ENVIRONMENT_LABELS[item.environment]} scope
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        Pressure
                                    </div>
                                    <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                                        {item.pressureScore}
                                    </div>
                                    <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getProjectTrendClasses(item.trend)}`}>
                                        {getProjectTrendLabel(item.trend)}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300"
                                    style={{ width: `${width}%` }}
                                />
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        Open Issues
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-white tabular-nums">
                                        {item.openIssues}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        Regressions
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-white tabular-nums">
                                        {item.regressions}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                        MTTR
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-white">
                                        {item.mttrLabel}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </DashboardSectionCard>
    );
}

function ReleaseHealthPanel({ items }: { items: PlatformReleaseHealth[] }) {
    return (
        <DashboardSectionCard
            title="Release Health"
            description="Recent releases ranked by issue correlation, adoption, and reopened issue risk."
            action={<span className="enterprise-chip">{items.length} releases</span>}
            contentClassName="p-4"
            variant="enterprise"
        >
            <div className="space-y-3">
                {items.map((item) => (
                    <div
                        key={`${item.project}-${item.version}`}
                        className="enterprise-panel-muted rounded-[18px] px-4 py-4"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-sm text-white">
                                        {item.version}
                                    </span>
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getReleaseStatusClasses(item.status)}`}>
                                        {capitalizeLabel(item.status)}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                    {item.project} - {PLATFORM_ENVIRONMENT_LABELS[item.environment]}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                    Adoption
                                </div>
                                <div className="mt-1 text-sm font-semibold text-white">
                                    {item.adoption}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                            {item.summary}
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                    Open Issues
                                </div>
                                <div className="mt-1 text-sm font-semibold text-white tabular-nums">
                                    {item.openIssues}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                                    Regressions
                                </div>
                                <div className="mt-1 text-sm font-semibold text-white tabular-nums">
                                    {item.regressions}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardSectionCard>
    );
}

function AiInsightsPanel({
    headline,
    summary,
    confidenceLabel,
    items,
}: {
    headline: string;
    summary: string;
    confidenceLabel: string;
    items: PlatformAiInsight[];
}) {
    return (
        <DashboardSectionCard
            title="AI Operational Summary"
            description="Machine-assisted synthesis of correlated spikes, reopened issues, and release-linked pressure."
            action={<span className="enterprise-chip">{confidenceLabel}</span>}
            contentClassName="p-6"
            variant="enterprise"
        >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                <div className="enterprise-panel-soft rounded-[24px] border border-[var(--enterprise-border)] px-6 py-6">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200">
                        Executive Summary
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                        {headline}
                    </h3>
                    <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                        {summary}
                    </p>
                    <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                        Suggested first move: work the investigation queue from the top, then compare the highest-pressure release against the reopened issue clusters before broadening mitigation.
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {items.map((item) => (
                        <div
                            key={item.label}
                            className="enterprise-panel-muted rounded-[20px] px-4 py-4"
                        >
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getSignalToneClasses(item.tone)}`}>
                                    {item.label}
                                </span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-white">{item.detail}</p>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardSectionCard>
    );
}

export default function OverviewPage() {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState<PlatformOverviewRange>('7d');
    const [environment, setEnvironment] = useState<PlatformOverviewEnvironment>('all');
    const { data, loading, lastUpdated, refresh } = usePlatformOverview(timeRange, environment);
    const lastUpdatedLabel = formatRelativeTime(lastUpdated);

    const trendSummaryCards = [
        {
            label: 'Window total',
            value: data.trend.totalEvents.toLocaleString(),
            supportingText: 'Captured events within the currently selected time window.',
        },
        {
            label: 'Peak interval',
            value: formatCompactCount(data.trend.peakEvents),
            supportingText: `${data.trend.peakLabel} carried the highest event pressure.`,
        },
        {
            label: 'Affected projects',
            value: data.trend.affectedProjects.toString(),
            supportingText: 'Projects with active issue pressure in the selected scope.',
        },
    ];

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="dashboard" />

            <main className="mx-auto max-w-[1480px] px-5 py-6 md:px-6 xl:px-8 xl:py-8">
                <section className="enterprise-panel-soft rounded-[26px] border border-[var(--enterprise-border)] px-5 py-5 sm:px-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="enterprise-chip">Global Dashboard</span>
                                <span className="text-xs text-[var(--enterprise-text-muted)]">
                                    {data.scopeLabel}
                                </span>
                            </div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-[2.4rem]">
                                Platform Overview
                            </h1>
                            <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                {data.subtitle}
                            </p>
                        </div>

                        <div className="flex flex-col gap-4 xl:min-w-[680px] xl:flex-row xl:items-end xl:justify-end">
                            <SegmentedControl
                                label="Time Range"
                                value={timeRange}
                                onChange={setTimeRange}
                                options={RANGE_OPTIONS}
                            />
                            <SegmentedControl
                                label="Environment"
                                value={environment}
                                onChange={setEnvironment}
                                options={ENVIRONMENT_OPTIONS}
                            />
                            <div className="flex items-center gap-3">
                                <RefreshButton loading={loading} onClick={() => void refresh()} />
                                <div className="rounded-xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-2.5 text-sm text-[var(--enterprise-text-muted)]">
                                    Updated {lastUpdatedLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-6">
                    {data.kpis.map((card) => (
                        <OverviewMetricCard
                            key={card.label}
                            label={card.label}
                            value={card.value}
                            accentClass={card.accentClass}
                            change={card.change}
                            changeType={card.changeType}
                            icon={getKpiIcon(card.label)}
                            supportingText={card.supportingText}
                            variant="enterprise"
                        />
                    ))}
                </div>

                <div className="mt-8">
                    <SectionHeading
                        title="Analytics And Operations"
                        subtitle={`System health for ${PLATFORM_RANGE_LABELS[timeRange]} in ${PLATFORM_ENVIRONMENT_LABELS[environment].toLowerCase()} scope.`}
                    />
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.95fr)]">
                        <DashboardSectionCard
                            title="Event Trend"
                            description="Error volume across the selected window with quick context on peak pressure and blast radius."
                            action={<span className="enterprise-chip">{PLATFORM_RANGE_LABELS[timeRange]}</span>}
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <div className="grid gap-3 md:grid-cols-3">
                                {trendSummaryCards.map((item) => (
                                    <div
                                        key={item.label}
                                        className="enterprise-panel-muted rounded-[18px] px-4 py-4"
                                    >
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                            {item.label}
                                        </div>
                                        <div className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                                            {item.value}
                                        </div>
                                        <div className="mt-2 text-xs leading-5 text-[var(--enterprise-text-muted)]">
                                            {item.supportingText}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 enterprise-panel-muted rounded-[20px] px-3 py-4 sm:px-4">
                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={data.trend.points}
                                            margin={{ top: 10, right: 12, left: -14, bottom: 4 }}
                                        >
                                            <defs>
                                                <linearGradient id="platformTrendGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.34} />
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(255,255,255,0.05)"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="shortLabel"
                                                tickLine={false}
                                                axisLine={false}
                                                stroke="#6d6258"
                                                fontSize={11}
                                                interval={timeRange === '30d' ? 4 : timeRange === '24h' ? 2 : 0}
                                                tickMargin={12}
                                            />
                                            <YAxis
                                                tickLine={false}
                                                axisLine={false}
                                                stroke="#6d6258"
                                                fontSize={11}
                                                width={40}
                                                tickFormatter={formatCompactCount}
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
                                                fill="url(#platformTrendGradient)"
                                                name="Events"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </DashboardSectionCard>

                        <div className="flex flex-col gap-6">
                            <SignalListCard
                                title="Active Alerts"
                                description="Alerts currently demanding human attention."
                                items={data.operations.activeAlerts}
                                emptyMessage="No active alerts in the selected scope."
                                action={<span className="enterprise-chip">{data.operations.activeAlerts.length} live</span>}
                            />
                            <SignalListCard
                                title="Regressions"
                                description="Previously resolved issues that reopened in this scope."
                                items={data.operations.regressions}
                                emptyMessage="No regressions are currently active."
                                action={<span className="enterprise-chip">{data.operations.regressions.length} open</span>}
                            />
                            <SignalListCard
                                title="Top Noisy Issues"
                                description="High-volume clusters that are dominating attention and masking other signals."
                                items={data.operations.noisyIssues}
                                emptyMessage="No noisy issue clusters in the selected scope."
                                action={<SectionActionButton label="Issue Stream" onClick={() => navigate('/issues')} />}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <SectionHeading
                        title="Platform Health"
                        subtitle="Service pressure, severity mix, environment spread, and release quality at a glance."
                    />
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <TopProjectsPanel items={data.health.topProjects} />
                        <DistributionListCard
                            title="Severity Distribution"
                            description="How active issue pressure is distributed by severity in the current scope."
                            items={data.health.severityDistribution}
                            emptyMessage="No severity data in the selected scope."
                            barClassName="bg-gradient-to-r from-rose-500 to-orange-400"
                            variant="enterprise"
                        />
                        <DistributionListCard
                            title="Environment Distribution"
                            description="Environment mix of current event volume."
                            items={data.health.environmentDistribution}
                            emptyMessage="No environment data in the selected scope."
                            mode="donut"
                            variant="enterprise"
                        />
                        <ReleaseHealthPanel items={data.health.releaseHealth} />
                    </div>
                </div>

                <div className="mt-8">
                    <SectionHeading
                        title="Investigation And Triage"
                        subtitle="Queues designed to answer what changed, what is newest, what was resolved, and what needs attention first."
                        action={<SectionActionButton label="Open issue stream" onClick={() => navigate('/issues')} />}
                    />
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-4">
                        <SignalListCard
                            title="Recent Critical Issues"
                            description="Customer-facing failures and release blockers detected most recently."
                            items={data.triage.recentCritical}
                            emptyMessage="No critical issues are currently active."
                        />
                        <SignalListCard
                            title="Latest Detected Issues"
                            description="Fresh fingerprints that have not yet been deeply triaged."
                            items={data.triage.latestDetected}
                            emptyMessage="No new issue fingerprints detected."
                        />
                        <SignalListCard
                            title="Recently Resolved"
                            description="Latest issue groups that were closed and are worth validating post-fix."
                            items={data.triage.recentlyResolved}
                            emptyMessage="No recently resolved issues in this scope."
                        />
                        <SignalListCard
                            title="Suggested Investigation Queue"
                            description="Recommended order of operations based on correlation and operational impact."
                            items={data.triage.investigationQueue}
                            emptyMessage="No prioritized investigation queue available."
                        />
                    </div>
                </div>

                <div className="mt-8">
                    <AiInsightsPanel
                        headline={data.ai.headline}
                        summary={data.ai.summary}
                        confidenceLabel={data.ai.confidenceLabel}
                        items={data.ai.items}
                    />
                </div>
            </main>
        </div>
    );
}
