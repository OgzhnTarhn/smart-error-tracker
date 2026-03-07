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
        <div className="group relative overflow-hidden rounded-[1.6rem] border border-slate-700/70 bg-slate-800/50 p-5 sm:p-6 min-h-40 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-600/80 hover:bg-slate-800/72 hover:shadow-[0_24px_48px_-28px_rgba(15,23,42,0.95)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.12),transparent_40%)] opacity-70" />
            <div className="relative flex flex-col gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-[0_16px_30px_-22px_rgba(15,23,42,1)] ring-1 ring-white/5 ${bgClassName} ${colorClassName}`}>
                    {icon}
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-[0.22em]">
                    {label}
                </div>
            </div>
            <div className="relative mt-5">
                {loading ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-11 w-28 rounded-xl bg-slate-700/50" />
                        <div className="h-3 w-24 rounded-full bg-slate-800/80" />
                    </div>
                ) : (
                    <>
                        <div className="text-[2.35rem] sm:text-[2.7rem] font-semibold tracking-tight leading-none text-slate-50 tabular-nums">
                            {value.toLocaleString()}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                            Current snapshot
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
