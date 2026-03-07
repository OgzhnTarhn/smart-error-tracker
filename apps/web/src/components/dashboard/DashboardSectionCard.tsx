import type { ReactNode } from 'react';

interface DashboardSectionCardProps {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}

export default function DashboardSectionCard({
    title,
    description,
    action,
    children,
    className = '',
    contentClassName = 'p-5',
}: DashboardSectionCardProps) {
    return (
        <section className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden ${className}`}>
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
                    {description ? (
                        <p className="mt-1 text-sm text-slate-400">{description}</p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0">{action}</div> : null}
            </div>
            <div className={contentClassName}>{children}</div>
        </section>
    );
}
