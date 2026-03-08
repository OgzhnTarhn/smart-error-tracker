import { Link } from 'react-router-dom';
import type { SimilarIssue } from '../../lib/api';
import IssueStatusBadge from '../issues/IssueStatusBadge';

interface SimilarPastIssuesPanelProps {
    items: SimilarIssue[];
    loading: boolean;
    error: string | null;
    formatDate: (value: string) => string;
}

function truncateText(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function EmptyState() {
    return (
        <div className="py-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80">
                <svg
                    className="h-5 w-5 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                    />
                </svg>
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-200">
                No similar past issues found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
                This issue does not have a strong match from recent project history yet.
            </p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-3">
            {[0, 1, 2].map((placeholder) => (
                <div
                    key={placeholder}
                    className="animate-pulse rounded-xl border border-slate-700/70 bg-slate-900/40 p-4"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="h-4 w-28 rounded bg-slate-700/70" />
                            <div className="mt-3 h-4 w-4/5 rounded bg-slate-700/60" />
                            <div className="mt-2 h-3 w-2/3 rounded bg-slate-800/90" />
                        </div>
                        <div className="h-3 w-20 rounded bg-slate-800/90" />
                    </div>
                    <div className="mt-4 h-14 rounded-lg bg-slate-800/80" />
                </div>
            ))}
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-4">
            <h3 className="text-sm font-medium text-red-200">
                Similar issue history is unavailable
            </h3>
            <p className="mt-1 text-sm text-red-200/80">
                {error}
            </p>
            <p className="mt-2 text-xs text-slate-400">
                Issue details are still available. Reload the page to retry this panel.
            </p>
        </div>
    );
}

export default function SimilarPastIssuesPanel({
    items,
    loading,
    error,
    formatDate,
}: SimilarPastIssuesPanelProps) {
    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex flex-col gap-1 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent">
                <h2 className="text-sm font-bold text-slate-200">
                    Similar Past Issues
                </h2>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Lightweight heuristic matches from this project
                </p>
            </div>

            <div className="p-5">
                {loading ? (
                    <LoadingState />
                ) : error ? (
                    <ErrorState error={error} />
                ) : items.length === 0 ? (
                    <EmptyState />
                ) : (
                    <ul className="space-y-3">
                        {items.map((item) => (
                            <li key={item.id}>
                                <Link
                                    to={`/issues/${item.id}`}
                                    className="group block rounded-xl border border-slate-700/70 bg-slate-900/45 p-4 transition-colors hover:border-violet-500/40 hover:bg-slate-900/80"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <IssueStatusBadge status={item.status} />
                                                {item.resolutionNote && (
                                                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                                        Has note
                                                    </span>
                                                )}
                                                {item.isRegression && (
                                                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                                                        Regression
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="mt-3 text-sm font-semibold leading-5 text-slate-100 transition-colors group-hover:text-violet-200">
                                                {truncateText(item.title, 140)}
                                            </h3>
                                            <p className="mt-1 text-sm leading-5 text-slate-400">
                                                {truncateText(item.similarityReason, 120)}
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-left sm:text-right">
                                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                                Last Seen
                                            </div>
                                            <div className="mt-1 text-sm text-slate-200">
                                                {formatDate(item.lastSeenAt)}
                                            </div>
                                        </div>
                                    </div>

                                    {item.resolutionNote && (
                                        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-3">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                                                Resolution Note
                                            </div>
                                            <p className="mt-1 text-sm leading-5 text-emerald-100/90">
                                                {truncateText(item.resolutionNote, 220)}
                                            </p>
                                        </div>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
