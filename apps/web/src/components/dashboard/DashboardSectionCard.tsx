import type { ReactNode } from 'react';

interface DashboardSectionCardProps {
    title: string;
    icon?: ReactNode;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
    headerClassName?: string;
}

export default function DashboardSectionCard({
    title,
    icon,
    description,
    action,
    children,
    className = '',
    contentClassName = 'p-5',
    headerClassName = '',
}: DashboardSectionCardProps) {
    return (
        <section className={`dash-card overflow-hidden ${className}`}>
            <div className={`px-5 py-4 flex items-center justify-between gap-4 ${headerClassName}`}>
                <div className="flex items-center gap-2 min-w-0">
                    {icon && <span className="text-lg">{icon}</span>}
                    <h2 className="text-sm font-semibold tracking-tight text-white">{title}</h2>
                </div>
                {action && <div className="shrink-0">{action}</div>}
                {description && !action && (
                    <p className="text-xs text-[var(--dash-text-muted)] truncate">{description}</p>
                )}
            </div>
            <div className={contentClassName}>{children}</div>
        </section>
    );
}
