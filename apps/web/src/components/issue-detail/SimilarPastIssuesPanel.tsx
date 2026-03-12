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

function formatMatchScore(score: number) {
    const percentage = score <= 1 ? Math.round(score * 100) : Math.round(score);
    return `${percentage}% match`;
}

function EmptyState() {
    return (
        <div className="rounded-[24px] border border-slate-800/80 bg-slate-950/55 px-5 py-10 text-center ring-1 ring-white/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900/80 text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                    />
                </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-100">
                No similar past issues found
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
                This issue does not have a strong match from recent project history yet.
            </p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-3">
            {[0, 1].map((placeholder) => (
                <div
                    key={placeholder}
                    className="guidance-panel-soft animate-pulse rounded-[24px] border border-slate-800/80 p-5 ring-1 ring-white/5"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="h-4 w-32 rounded bg-slate-700/70" />
                            <div className="mt-4 h-5 w-3/4 rounded bg-slate-800/80" />
                            <div className="mt-3 h-3 w-2/3 rounded bg-slate-800/70" />
                        </div>
                        <div className="h-8 w-20 rounded-full bg-slate-800/80" />
                    </div>
                    <div className="mt-5 h-16 rounded-2xl bg-slate-950/70" />
                </div>
            ))}
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <div className="rounded-[24px] border border-red-500/25 bg-red-500/10 px-5 py-5 ring-1 ring-red-500/15">
            <h3 className="text-sm font-semibold text-red-100">
                Similar issue history is unavailable
            </h3>
            <p className="mt-2 text-sm leading-6 text-red-100/80">
                {error}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
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
        <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-[1.7rem] font-semibold tracking-tight text-white">
                        Similar Past Issues
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                        Heuristic matches within this repository
                    </p>
                </div>
                <Link
                    to="/issues"
                    className="inline-flex items-center gap-2 self-start text-xs font-semibold uppercase tracking-[0.28em] text-indigo-300 transition-colors hover:text-indigo-200"
                >
                    View All Matches
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                    </svg>
                </Link>
            </div>

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState error={error} />
            ) : items.length === 0 ? (
                <EmptyState />
            ) : (
                <ul className="space-y-3.5">
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={`/issues/${item.id}`}
                                className="guidance-panel group block overflow-hidden rounded-[24px] border border-slate-800/80 p-5 ring-1 ring-white/5 transition-transform duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30 hover:ring-indigo-500/10"
                            >
                                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <IssueStatusBadge status={item.status} />
                                            <span className="rounded-full border border-slate-700/80 bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                                                {formatMatchScore(item.score)}
                                            </span>
                                            {item.isRegression && (
                                                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                                                    Regression
                                                </span>
                                            )}
                                            {item.resolutionNote && (
                                                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                                                    Has note
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="mt-4 text-lg font-semibold leading-7 text-white transition-colors group-hover:text-indigo-100">
                                            {truncateText(item.title, 160)}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-400">
                                            {truncateText(item.similarityReason, 180)}
                                        </p>
                                    </div>

                                    <div className="shrink-0 text-left xl:text-right">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                            Last Seen
                                        </div>
                                        <div className="mt-1 text-sm font-medium text-slate-200">
                                            {formatDate(item.lastSeenAt)}
                                        </div>
                                    </div>
                                </div>

                                {item.resolutionNote && (
                                    <div className="mt-5 rounded-[20px] border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-4 ring-1 ring-emerald-500/10">
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-300">
                                            Resolution Artifact
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-emerald-50/90">
                                            {truncateText(item.resolutionNote, 280)}
                                        </p>
                                    </div>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
