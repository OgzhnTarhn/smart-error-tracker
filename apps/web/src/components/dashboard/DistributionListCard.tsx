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
                <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                        <div className="h-4 w-32 rounded bg-slate-700/50" />
                        <div className="h-4 w-10 rounded bg-slate-700/50" />
                    </div>
                    <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
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
            contentClassName="p-5"
        >
            {loading ? (
                <DistributionSkeleton />
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700/70 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-500">
                    {emptyMessage}
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => {
                        const width = maxCount > 0
                            ? Math.max((item.count / maxCount) * 100, item.count > 0 ? 8 : 0)
                            : 0;

                        return (
                            <div key={item.name} className="space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <span
                                        title={item.name}
                                        className={`min-w-0 flex-1 truncate text-sm text-slate-200 ${monospaceLabels ? 'font-mono' : ''}`}
                                    >
                                        {item.name}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400">
                                        {item.count.toLocaleString()}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-900/80 overflow-hidden">
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
