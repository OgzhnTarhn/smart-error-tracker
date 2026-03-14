interface IssueMetaRowProps {
    firstSeenAt: string;
    lastSeenAt: string;
    formatDate: (value: string) => string;
    formatRelativeTime: (value: string) => string;
    variant?: 'default' | 'enterprise';
}

export default function IssueMetaRow({
    firstSeenAt,
    lastSeenAt,
    formatDate,
    formatRelativeTime,
    variant = 'default',
}: IssueMetaRowProps) {
    if (variant === 'enterprise') {
        return (
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="enterprise-panel-muted px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                        Last seen
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                        {formatRelativeTime(lastSeenAt)}
                    </div>
                    <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                        {formatDate(lastSeenAt)}
                    </div>
                </div>
                <div className="enterprise-panel-muted px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                        First seen
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                        {formatDate(firstSeenAt)}
                    </div>
                    <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                        Event group started tracking here.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-2 text-sm text-slate-400">
            <div className="font-medium text-slate-200">
                Last seen {formatRelativeTime(lastSeenAt)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
                First seen {formatDate(firstSeenAt)} | Last seen {formatDate(lastSeenAt)}
            </div>
        </div>
    );
}
