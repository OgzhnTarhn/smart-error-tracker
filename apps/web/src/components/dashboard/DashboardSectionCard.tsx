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
    contentClassName = 'p-4',
    headerClassName = '',
    variant = 'default',
}: DashboardSectionCardProps) {
    const isEnterprise = variant === 'enterprise';

    return (
        <section
            className={`flex h-full flex-col overflow-hidden ${
                isEnterprise ? 'enterprise-panel' : 'dash-card'
            } ${className}`}
        >
            <div
                className={`flex justify-between gap-3 ${
                    isEnterprise
                        ? 'items-start border-b border-[var(--enterprise-border)] px-4 py-3.5'
                        : 'items-center px-4 py-3'
                } ${headerClassName}`}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        {icon ? (
                            <span className={isEnterprise ? 'ui-accent-text text-[12px]' : 'text-base'}>
                                {icon}
                            </span>
                        ) : null}
                        <h2
                            className={`truncate font-semibold tracking-tight text-[var(--enterprise-text)] ${
                                isEnterprise ? 'text-base' : 'text-sm'
                            }`}
                        >
                            {title}
                        </h2>
                    </div>
                    {description ? (
                        <p
                            className={`${
                                isEnterprise
                                    ? 'mt-1 text-xs leading-5 text-[var(--enterprise-text-muted)]'
                                    : 'mt-0.5 truncate text-xs text-[var(--dash-text-muted)]'
                            }`}
                        >
                            {description}
                        </p>
                    ) : null}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className={`${isEnterprise ? 'flex-1' : ''} ${contentClassName}`}>{children}</div>
        </section>
    );
}
