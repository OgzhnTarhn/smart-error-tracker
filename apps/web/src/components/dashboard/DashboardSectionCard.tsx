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
    variant?: 'default' | 'enterprise';
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
    variant = 'default',
}: DashboardSectionCardProps) {
    const isEnterprise = variant === 'enterprise';

    return (
        <section
            className={`overflow-hidden ${
                isEnterprise ? 'enterprise-panel' : 'dash-card'
            } ${className}`}
        >
            <div
                className={`flex justify-between gap-4 ${
                    isEnterprise
                        ? 'items-start border-b border-[var(--enterprise-border)] px-6 py-5'
                        : 'items-center px-5 py-4'
                } ${headerClassName}`}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        {icon ? (
                            <span className={isEnterprise ? 'text-[13px] text-orange-300' : 'text-lg'}>
                                {icon}
                            </span>
                        ) : null}
                        <h2
                            className={`truncate font-semibold tracking-tight text-white ${
                                isEnterprise ? 'text-lg' : 'text-sm'
                            }`}
                        >
                            {title}
                        </h2>
                    </div>
                    {description ? (
                        <p
                            className={`${
                                isEnterprise
                                    ? 'mt-1.5 text-sm leading-6 text-[var(--enterprise-text-muted)]'
                                    : 'mt-0.5 truncate text-xs text-[var(--dash-text-muted)]'
                            }`}
                        >
                            {description}
                        </p>
                    ) : null}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className={contentClassName}>{children}</div>
        </section>
    );
}
