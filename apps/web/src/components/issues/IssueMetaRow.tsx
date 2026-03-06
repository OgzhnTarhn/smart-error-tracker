interface IssueMetaRowProps {
    firstSeenAt: string;
    lastSeenAt: string;
    formatDate: (value: string) => string;
    formatRelativeTime: (value: string) => string;
}

export default function IssueMetaRow({
    firstSeenAt,
    lastSeenAt,
    formatDate,
    formatRelativeTime,
}: IssueMetaRowProps) {
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
