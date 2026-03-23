import type { IssueStatus } from './types';

const STATUS_STYLES: Record<IssueStatus, string> = {
    open: 'ui-danger-badge',
    resolved: 'ui-success-badge',
    ignored: 'ui-warning-badge',
};

const STATUS_LABELS: Record<IssueStatus, string> = {
    open: 'Open',
    resolved: 'Resolved',
    ignored: 'Ignored',
};

function normalizeStatus(status: string): IssueStatus {
    if (status === 'resolved') return 'resolved';
    if (status === 'ignored') return 'ignored';
    return 'open';
}

interface IssueStatusBadgeProps {
    status: string;
    variant?: 'default' | 'enterprise';
}

export default function IssueStatusBadge({
    status,
    variant = 'default',
}: IssueStatusBadgeProps) {
    const normalizedStatus = normalizeStatus(status);
    const className =
        variant === 'enterprise'
            ? `inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[normalizedStatus]}`
            : `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[normalizedStatus]}`;

    return (
        <span className={className}>
            {STATUS_LABELS[normalizedStatus]}
        </span>
    );
}
