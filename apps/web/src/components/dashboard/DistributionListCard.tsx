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

function DonutChart({ items }: { items: DashboardBreakdownItem[] }) {
    const total = items.reduce((s, i) => s + i.count, 0);
    if (total === 0) return null;

    const topItem = items[0];
    const topPct = Math.round((topItem.count / total) * 100);

    const colors = ['#f97316', '#6b7280', '#3b82f6', '#22c55e', '#eab308'];
    const size = 130;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulated = 0;
    const segments = items.map((item, idx) => {
        const pct = item.count / total;
        const dashLength = circumference * pct;
        const dashGap = circumference - dashLength;
        const offset = -circumference * accumulated + circumference * 0.25;
        accumulated += pct;
        return (
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
            />
        );
    });

    return (
        <div className="flex items-center gap-8">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size}>
                    {segments}
                </svg>
                <div className="donut-center">
                    <span className="text-2xl font-bold text-white">{topPct}%</span>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--dash-text-dim)] font-semibold">
                        PROD
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
                        <span className="text-sm text-[var(--dash-text-muted)]">{item.name}</span>
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
}: DistributionListCardProps) {
    const total = items.reduce((s, i) => s + i.count, 0);

    return (
        <DashboardSectionCard title={title} icon={icon} description={description} contentClassName="p-5">
            {loading ? (
                <DistributionSkeleton />
            ) : items.length === 0 ? (
                <div className="py-8 text-center text-sm text-[var(--dash-text-dim)]">
                    {emptyMessage}
                </div>
            ) : mode === 'donut' ? (
                <DonutChart items={items} />
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
                                        className={`text-sm text-[var(--dash-text)] ${monospaceLabels ? 'font-mono' : ''}`}
                                    >
                                        {item.name}
                                    </span>
                                    <span className="text-sm font-semibold text-white tabular-nums">
                                        {showPercentage ? pctLabel : item.count.toLocaleString()}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
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
