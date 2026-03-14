import type { IssueStatus } from './types';

const STATUS_STYLES: Record<IssueStatus, string> = {
    open: 'text-red-400 bg-red-500/10 border-red-500/30',
    resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    ignored: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
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
            ? `rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                normalizedStatus === 'resolved'
                    ? 'bg-emerald-500/18 text-emerald-300'
                    : normalizedStatus === 'ignored'
                        ? 'bg-amber-500/18 text-amber-300'
                        : 'bg-red-500/18 text-red-300'
            }`
            : `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[normalizedStatus]}`;

    return (
        <span className={className}>
            {STATUS_LABELS[normalizedStatus]}
        </span>
    );
}
