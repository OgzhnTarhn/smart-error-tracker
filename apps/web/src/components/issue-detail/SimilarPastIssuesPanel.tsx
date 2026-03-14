import { Link } from 'react-router-dom';
import type { SimilarIssue } from '../../lib/api';

interface SimilarPastIssuesPanelProps {
    items: SimilarIssue[];
    loading: boolean;
    error: string | null;
    formatDate: (value: string) => string;
    compact?: boolean;
}

function truncateText(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function formatMatchScore(score: number) {
    const percentage = score <= 1 ? Math.round(score * 100) : Math.round(score);
    return `${percentage}%`;
}

function HistoryBadge({
    label,
    className,
}: {
    label: string;
    className: string;
}) {
    return (
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${className}`}>
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
                This issue does not yet have a strong historical match in the repository.
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
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1 space-y-4">
                            <div className="flex gap-2">
                                <div className="h-6 w-20 rounded-full bg-[#202020]" />
                                <div className="h-6 w-24 rounded-full bg-[#202020]" />
                                <div className="h-6 w-24 rounded-full bg-[#202020]" />
                            </div>
                            <div className="h-8 w-3/4 rounded bg-[#1a1a1a]" />
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="h-28 rounded-[20px] border border-[#222] bg-black/40" />
                                <div className="h-28 rounded-[20px] border border-[#222] bg-black/40" />
                            </div>
                        </div>
                        <div className="h-24 w-40 rounded-[20px] border border-[#222] bg-black/40" />
                    </div>
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
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200/60">
                Reload to retry this comparison panel.
            </p>
        </div>
    );
}

function SimilarIssueDetailCard({
    label,
    value,
    toneClassName,
    mono = false,
}: {
    label: string;
    value: string;
    toneClassName?: string;
    mono?: boolean;
}) {
    return (
        <div className={`guidance-panel-soft rounded-[20px] border border-[#262626] px-4 py-4 ring-1 ring-white/5 ${toneClassName ?? ''}`}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {label}
            </div>
            <p className={`mt-3 text-sm leading-7 text-slate-200 ${mono ? 'font-mono text-[13px]' : ''}`}>
                {value}
            </p>
        </div>
    );
}

export default function SimilarPastIssuesPanel({
    items,
    loading,
    error,
    formatDate,
    compact = false,
}: SimilarPastIssuesPanelProps) {
    return (
        <section className={compact ? 'space-y-4' : 'space-y-5'}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Historical Comparison
                    </div>
                    <h2 className={`mt-2 font-semibold tracking-tight text-white ${compact ? 'text-[1.45rem]' : 'text-[2rem]'}`}>
                        Similar Past Issues
                    </h2>
                    <p className={`mt-2 ${compact ? 'text-[13px] leading-6' : 'text-sm leading-6'} text-slate-400`}>
                        Fast comparisons showing why a past issue matched and how it was resolved.
                    </p>
                </div>
                <Link
                    to="/issues"
                    className="inline-flex items-center gap-2 self-start text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300 transition-colors hover:text-orange-200"
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
                                className={`guidance-panel group block overflow-hidden rounded-[24px] border border-[#2a2a2a] ring-1 ring-white/5 transition-colors duration-200 hover:border-orange-500/40 ${compact ? 'px-4 py-4' : 'px-5 py-5'}`}
                            >
                                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <HistoryBadge
                                                label={item.status}
                                                className={item.status === 'resolved'
                                                    ? 'border-emerald-500/20 bg-emerald-500/12 text-emerald-300'
                                                    : item.status === 'ignored'
                                                        ? 'border-amber-500/20 bg-amber-500/12 text-amber-300'
                                                        : 'border-red-500/20 bg-red-500/12 text-red-300'}
                                            />
                                            {item.isRegression ? (
                                                <HistoryBadge
                                                    label="Regression"
                                                    className="border-orange-500/20 bg-orange-500/12 text-orange-300"
                                                />
                                            ) : null}
                                            {item.resolutionNote ? (
                                                <HistoryBadge
                                                    label="Has Fix Note"
                                                    className="border-cyan-500/20 bg-cyan-500/12 text-cyan-300"
                                                />
                                            ) : null}
                                        </div>

                                        <h3 className={`mt-5 font-semibold text-white transition-colors group-hover:text-orange-50 ${compact ? 'text-[1rem] leading-7' : 'text-[1.1rem] leading-8'}`}>
                                            {truncateText(item.title, 160)}
                                        </h3>
                                        <p className={`mt-2 ${compact ? 'text-[13px] leading-6' : 'text-sm leading-7'} text-slate-400`}>
                                            Open this issue to inspect the original stack trace, decision context, and saved resolution details.
                                        </p>

                                        <div className={`mt-5 grid gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2'}`}>
                                            <SimilarIssueDetailCard
                                                label="Why It Matched"
                                                value={truncateText(item.similarityReason, 220)}
                                            />
                                            <SimilarIssueDetailCard
                                                label="What Fixed It"
                                                value={item.resolutionNote
                                                    ? truncateText(item.resolutionNote, 260)
                                                    : 'No saved resolution note was attached to this issue.'}
                                                toneClassName={item.resolutionNote
                                                    ? 'border-emerald-500/15 bg-emerald-500/[0.05]'
                                                    : ''}
                                                mono={Boolean(item.resolutionNote)}
                                            />
                                        </div>
                                    </div>

                                    <div className={compact ? 'xl:w-[190px]' : 'xl:w-[220px]'}>
                                        <div className={`rounded-[22px] border border-orange-500/20 bg-orange-500/[0.08] ring-1 ring-orange-500/10 ${compact ? 'px-4 py-4' : 'px-5 py-5'}`}>
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200">
                                                Match Score
                                            </div>
                                            <div className={`mt-3 font-semibold leading-none text-white ${compact ? 'text-[1.7rem]' : 'text-[2rem]'}`}>
                                                {formatMatchScore(item.score)}
                                            </div>
                                            <p className={`mt-3 ${compact ? 'text-[13px] leading-6' : 'text-sm leading-6'} text-orange-50/80`}>
                                                Historical similarity based on error shape, metadata, and issue context.
                                            </p>
                                            <div className="mt-4 border-t border-orange-500/15 pt-4">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-200">
                                                    Last Seen
                                                </div>
                                                <div className="mt-2 text-sm font-medium text-slate-100">
                                                    {formatDate(item.lastSeenAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
