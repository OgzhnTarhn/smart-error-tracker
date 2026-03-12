import type { ReactNode } from 'react';

interface OverviewMetricCardProps {
    label: string;
    value: number;
    accentClass: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    loading?: boolean;
    icon?: ReactNode;
}

export default function OverviewMetricCard({
    label,
    value,
    accentClass,
    change,
    changeType = 'neutral',
    loading = false,
}: OverviewMetricCardProps) {
    const changeColor =
        changeType === 'positive'
            ? 'text-emerald-400'
            : changeType === 'negative'
                ? 'text-red-400'
                : 'text-slate-500';

    function formatValue(val: number): string {
        if (val >= 100_000) {
            const k = val / 1000;
            return `${k.toFixed(1)}k`;
        }
        return val.toLocaleString();
    }

    return (
        <div className={`dash-card ${accentClass} px-5 py-4 flex flex-col gap-1.5`}>
            {loading ? (
                <div className="animate-pulse space-y-2">
                    <div className="h-3 w-20 rounded bg-white/5" />
                    <div className="h-8 w-16 rounded bg-white/5" />
                </div>
            ) : (
                <>
                    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--dash-text-dim)]">
                        {label}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold tracking-tight text-white tabular-nums">
                            {formatValue(value)}
                        </span>
                        {change && (
                            <span className={`text-xs font-semibold ${changeColor}`}>
                                {change}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
