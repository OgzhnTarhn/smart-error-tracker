import type { ReactNode } from 'react';

interface DashboardSectionCardProps {
    title: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
    headerClassName?: string;
}

export default function DashboardSectionCard({
    title,
    description,
    action,
    children,
    className = '',
    contentClassName = 'p-5',
    headerClassName = '',
}: DashboardSectionCardProps) {
    return (
        <section className={`relative overflow-hidden rounded-[1.6rem] border border-slate-700/60 bg-slate-800/55 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.95)] backdrop-blur-sm ${className}`}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/20 to-transparent" />
            <div className={`px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-700/50 flex items-start justify-between gap-4 ${headerClassName}`}>
                <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight text-slate-100">{title}</h2>
                    {description ? (
                        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
                    ) : null}
                </div>
                {action ? <div className="shrink-0 self-center">{action}</div> : null}
            </div>
            <div className={contentClassName}>{children}</div>
        </section>
    );
}
