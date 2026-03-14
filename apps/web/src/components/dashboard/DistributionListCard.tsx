import type { DashboardBreakdownItem } from '../../lib/api';
import DashboardSectionCard from './DashboardSectionCard';
import type { ReactNode } from 'react';

interface DistributionListCardProps {
    title: string;
    icon?: ReactNode;
    description: string;
    items: DashboardBreakdownItem[];
    emptyMessage: string;
    loading?: boolean;
    monospaceLabels?: boolean;
    barClassName?: string;
    mode?: 'bar' | 'donut';
    showPercentage?: boolean;
    variant?: 'default' | 'enterprise';
}

function DistributionSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-24 rounded bg-white/5" />
                    <div className="flex-1 h-3 rounded bg-white/5" />
                    <div className="h-3 w-8 rounded bg-white/5" />
                </div>
            ))}
        </div>
    );
}

function DonutChart({
    items,
    variant,
}: {
    items: DashboardBreakdownItem[];
    variant: 'default' | 'enterprise';
}) {
    const total = items.reduce((s, i) => s + i.count, 0);
    if (total === 0) return null;

    const topItem = items[0];
    const topPct = Math.round((topItem.count / total) * 100);

    const colors =
        variant === 'enterprise'
            ? ['#f97316', '#3b82f6', '#22c55e', '#f43f5e', '#94a3b8']
            : ['#f97316', '#6b7280', '#3b82f6', '#22c55e', '#eab308'];
    const size = variant === 'enterprise' ? 156 : 130;
    const strokeWidth = variant === 'enterprise' ? 16 : 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const segments = items.reduce<{
        elements: ReactNode[];
        accumulated: number;
    }>(
        (state, item, idx) => {
            const pct = item.count / total;
            const dashLength = circumference * pct;
            const dashGap = circumference - dashLength;
            const offset = -circumference * state.accumulated + circumference * 0.25;

            state.elements.push(
                <circle
                    key={item.name}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={colors[idx % colors.length]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${dashGap}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />,
            );

            return {
                elements: state.elements,
                accumulated: state.accumulated + pct,
            };
        },
        { elements: [], accumulated: 0 },
    ).elements;

    return (
        <div className={`flex items-center ${variant === 'enterprise' ? 'gap-6' : 'gap-8'}`}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size}>
                    {variant === 'enterprise' ? (
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth={strokeWidth}
                        />
                    ) : null}
                    {segments}
                </svg>
                <div className="donut-center">
                    <span className="text-2xl font-bold text-white">{topPct}%</span>
                    <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                            variant === 'enterprise'
                                ? 'text-[var(--enterprise-text-dim)]'
                                : 'text-[var(--dash-text-dim)]'
                        }`}
                    >
                        {topItem.name}
                    </span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                {items.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: colors[idx % colors.length] }}
                        />
                        <span
                            className={`text-sm ${
                                variant === 'enterprise'
                                    ? 'text-[var(--enterprise-text-muted)]'
                                    : 'text-[var(--dash-text-muted)]'
                            }`}
                        >
                            {item.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DistributionListCard({
    title,
    icon,
    description,
    items,
    emptyMessage,
    loading = false,
    monospaceLabels = false,
    barClassName = 'bg-gradient-to-r from-red-500 to-rose-400',
    mode = 'bar',
    showPercentage = false,
    variant = 'default',
}: DistributionListCardProps) {
    const total = items.reduce((s, i) => s + i.count, 0);
    const isEnterprise = variant === 'enterprise';

    return (
        <DashboardSectionCard
            title={title}
            icon={icon}
            description={description}
            contentClassName={isEnterprise ? 'p-6' : 'p-5'}
            variant={variant}
        >
            {loading ? (
                <DistributionSkeleton />
            ) : items.length === 0 ? (
                <div
                    className={`py-8 text-center text-sm ${
                        isEnterprise
                            ? 'text-[var(--enterprise-text-dim)]'
                            : 'text-[var(--dash-text-dim)]'
                    }`}
                >
                    {emptyMessage}
                </div>
            ) : mode === 'donut' ? (
                <DonutChart items={items} variant={variant} />
            ) : (
                <div className="space-y-4">
                    {items.map((item) => {
                        const maxCount = items[0]?.count ?? 0;
                        const width = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 8) : 0;
                        const pctLabel = total > 0 ? `${Math.round((item.count / total) * 100)}%` : '0%';

                        return (
                            <div key={item.name} className="space-y-1.5">
                                <div className="flex items-center justify-between gap-3">
                                    <span
                                        className={`text-sm ${
                                            isEnterprise
                                                ? 'text-white'
                                                : 'text-[var(--dash-text)]'
                                        } ${monospaceLabels ? 'font-mono' : ''}`}
                                    >
                                        {item.name}
                                    </span>
                                    <span className="text-sm font-semibold text-white tabular-nums">
                                        {showPercentage ? pctLabel : item.count.toLocaleString()}
                                    </span>
                                </div>
                                <div
                                    className={`overflow-hidden rounded-full ${
                                        isEnterprise ? 'h-2.5 bg-white/6' : 'h-2 bg-white/5'
                                    }`}
                                >
                                    <div
                                        className={`h-full rounded-full transition-all ${barClassName}`}
                                        style={{ width: `${width}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardSectionCard>
    );
}
