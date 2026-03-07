import type { ReactNode } from 'react';

interface OverviewMetricCardProps {
    label: string;
    value: number;
    colorClassName: string;
    bgClassName: string;
    icon: ReactNode;
    loading?: boolean;
}

export default function OverviewMetricCard({
    label,
    value,
    colorClassName,
    bgClassName,
    icon,
    loading = false,
}: OverviewMetricCardProps) {
    return (
        <div className="bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors rounded-2xl p-5 flex flex-col justify-between min-h-36">
            <div className="flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${bgClassName} ${colorClassName}`}>
                    {icon}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {label}
                </div>
            </div>
            <div className="mt-4">
                {loading ? (
                    <div className="h-9 w-24 rounded-lg bg-slate-700/50 animate-pulse" />
                ) : (
                    <div className="text-3xl font-bold text-slate-100">
                        {value.toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}
