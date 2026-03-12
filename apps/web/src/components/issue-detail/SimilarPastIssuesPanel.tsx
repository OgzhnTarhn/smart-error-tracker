import { Link } from 'react-router-dom';
import type { SimilarIssue } from '../../lib/api';

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

function HistoryBadge({
    label,
    className,
}: {
    label: string;
    className: string;
}) {
    return (
        <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${className}`}>
            {label}
        </span>
    );
}

function EmptyState() {
    return (
        <div className="guidance-panel rounded-[24px] border border-[#2a2a2a] px-5 py-10 text-center ring-1 ring-white/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-black/50 text-slate-500">
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
                This issue does not have a strong historical match yet.
            </p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-4">
            {[0, 1].map((placeholder) => (
                <div
                    key={placeholder}
                    className="guidance-panel-soft animate-pulse rounded-[24px] border border-[#2a2a2a] p-6 ring-1 ring-white/5"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <div className="flex gap-2">
                                <div className="h-5 w-[4.5rem] rounded bg-[#202020]" />
                                <div className="h-5 w-[5rem] rounded bg-[#202020]" />
                                <div className="h-5 w-[4.5rem] rounded bg-[#202020]" />
                            </div>
                            <div className="mt-5 h-7 w-3/4 rounded bg-[#1a1a1a]" />
                            <div className="mt-3 h-4 w-2/3 rounded bg-[#181818]" />
                        </div>
                        <div className="h-4 w-[7rem] rounded bg-[#181818]" />
                    </div>
                    <div className="mt-6 h-16 rounded-2xl border border-[#222] bg-black/40" />
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
                Reload the page to retry this panel.
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
        <section className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h2 className="text-[2rem] font-semibold tracking-tight text-white">
                        Similar Past Issues
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                        Heuristic matches within this repository
                    </p>
                </div>
                <Link
                    to="/issues"
                    className="inline-flex items-center gap-2 self-start text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-300 transition-colors hover:text-orange-200"
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
                <ul className="space-y-4">
                    {items.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={`/issues/${item.id}`}
                                className="guidance-panel group block overflow-hidden rounded-[24px] border border-[#2a2a2a] px-5 py-5 ring-1 ring-white/5 transition-colors duration-200 hover:border-orange-500/40"
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <HistoryBadge
                                                label={item.status}
                                                className={item.status === 'resolved'
                                                    ? 'bg-emerald-500/18 text-emerald-300'
                                                    : item.status === 'ignored'
                                                        ? 'bg-amber-500/18 text-amber-300'
                                                        : 'bg-red-500/18 text-red-300'}
                                            />
                                            <HistoryBadge
                                                label={formatMatchScore(item.score)}
                                                className="bg-white/[0.07] text-slate-300"
                                            />
                                            {item.isRegression && (
                                                <HistoryBadge
                                                    label="Regression"
                                                    className="bg-orange-500/18 text-orange-300"
                                                />
                                            )}
                                            {item.resolutionNote && (
                                                <HistoryBadge
                                                    label="Has Note"
                                                    className="bg-cyan-500/18 text-cyan-300"
                                                />
                                            )}
                                        </div>

                                        <h3 className="mt-5 text-[1.05rem] font-semibold leading-8 text-white transition-colors group-hover:text-orange-50">
                                            {truncateText(item.title, 160)}
                                        </h3>
                                        <p className="mt-2 text-sm leading-7 text-slate-400">
                                            {truncateText(item.similarityReason, 180)}
                                        </p>
                                    </div>

                                    <div className="shrink-0 text-left lg:text-right">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                            Last Seen
                                        </div>
                                        <div className="mt-1 text-xs font-medium text-slate-300">
                                            {formatDate(item.lastSeenAt)}
                                        </div>
                                    </div>
                                </div>

                                {item.resolutionNote && (
                                    <div className="mt-5 border-t border-[#242424] pt-4">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                            Resolution Artifact
                                        </div>
                                        <p className="mt-3 font-mono text-[13px] leading-6 text-emerald-300">
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
