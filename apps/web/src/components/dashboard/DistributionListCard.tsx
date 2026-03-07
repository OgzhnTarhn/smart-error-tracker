import type { DashboardBreakdownItem } from '../../lib/api';
import DashboardSectionCard from './DashboardSectionCard';

interface DistributionListCardProps {
    title: string;
    description: string;
    items: DashboardBreakdownItem[];
    emptyMessage: string;
    loading?: boolean;
    monospaceLabels?: boolean;
    barClassName?: string;
}

function DistributionSkeleton() {
    return (
        <div className="space-y-4 animate-pulse">
            {[0, 1, 2, 3].map((index) => (
                <div key={index} className="rounded-2xl border border-slate-800/80 bg-slate-900/35 px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="h-4 w-32 rounded bg-slate-700/50" />
                        <div className="h-7 w-14 rounded-xl bg-slate-700/50" />
                    </div>
                    <div className="h-3 rounded-full bg-slate-900/90 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-slate-700/60"
                            style={{ width: `${70 - index * 12}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function DistributionListCard({
    title,
    description,
    items,
    emptyMessage,
    loading = false,
    monospaceLabels = false,
    barClassName = 'bg-gradient-to-r from-blue-500 to-cyan-400',
}: DistributionListCardProps) {
    const maxCount = items[0]?.count ?? 0;

    return (
        <DashboardSectionCard
            title={title}
            description={description}
            contentClassName="p-5 sm:p-6"
        >
            {loading ? (
                <DistributionSkeleton />
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700/70 bg-slate-900/40 px-4 py-10 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/70 text-slate-500">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 17v-6m3 6V7m3 10v-4m3 8H6a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="mt-4 text-sm font-medium text-slate-200">No analytics yet</div>
                    <div className="mt-1 text-sm text-slate-500">
                        {emptyMessage}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => {
                        const width = maxCount > 0
                            ? Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 0)
                            : 0;

                        return (
                            <div key={item.name} className="rounded-2xl border border-slate-800/80 bg-slate-900/35 px-4 py-4 transition-colors hover:border-slate-700/80 hover:bg-slate-900/55">
                                <div className="flex items-center justify-between gap-3">
                                    <span
                                        title={item.name}
                                        className={`min-w-0 flex-1 truncate text-sm font-medium leading-6 text-slate-200 ${monospaceLabels ? 'font-mono' : ''}`}
                                    >
                                        {item.name}
                                    </span>
                                    <span className="shrink-0 rounded-xl border border-slate-700/70 bg-slate-950/80 px-2.5 py-1 text-sm font-semibold text-slate-200 tabular-nums">
                                        {item.count.toLocaleString()}
                                    </span>
                                </div>
                                <div className="mt-3 h-3 rounded-full bg-slate-900/90 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${barClassName}`}
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
