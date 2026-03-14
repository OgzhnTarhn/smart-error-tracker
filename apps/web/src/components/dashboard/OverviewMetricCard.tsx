import type { ReactNode } from 'react';

interface OverviewMetricCardProps {
    label: string;
    value: number;
    accentClass: string;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    loading?: boolean;
    icon?: ReactNode;
    variant?: 'default' | 'enterprise';
}

export default function OverviewMetricCard({
    label,
    value,
    accentClass,
    change,
    changeType = 'neutral',
    loading = false,
    variant = 'default',
}: OverviewMetricCardProps) {
    const isEnterprise = variant === 'enterprise';
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
        <div
            className={`flex flex-col ${
                isEnterprise
                    ? `enterprise-metric-card ${accentClass} gap-2 px-5 py-5 sm:px-6`
                    : `dash-card ${accentClass} gap-1.5 px-5 py-4`
            }`}
        >
            {loading ? (
                <div className="animate-pulse space-y-2">
                    <div className={`h-3 rounded ${isEnterprise ? 'w-24 bg-white/6' : 'w-20 bg-white/5'}`} />
                    <div className={`rounded ${isEnterprise ? 'h-9 w-20 bg-white/7' : 'h-8 w-16 bg-white/5'}`} />
                </div>
            ) : (
                <>
                    <div
                        className={`font-bold uppercase ${
                            isEnterprise
                                ? 'text-[11px] tracking-[0.2em] text-[var(--enterprise-text-dim)]'
                                : 'text-[10px] tracking-[0.15em] text-[var(--dash-text-dim)]'
                        }`}
                    >
                        {label}
                    </div>
                    <div className={`flex items-baseline gap-2 ${isEnterprise ? 'justify-between' : ''}`}>
                        <span
                            className={`font-bold tracking-tight text-white tabular-nums ${
                                isEnterprise ? 'text-[2.35rem]' : 'text-3xl'
                            }`}
                        >
                            {formatValue(value)}
                        </span>
                        {change && (
                            <span
                                className={`text-xs font-semibold ${changeColor} ${
                                    isEnterprise ? 'rounded-full bg-white/5 px-2.5 py-1' : ''
                                }`}
                            >
                                {change}
                            </span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
