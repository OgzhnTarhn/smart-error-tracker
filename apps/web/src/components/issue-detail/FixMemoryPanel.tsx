import { Link } from 'react-router-dom';
import type { FixMemory, FixMemoryConfidence } from '../../lib/api';

interface FixMemoryPanelProps {
    memory: FixMemory | null;
    loading: boolean;
    error: string | null;
    formatDate: (value: string) => string;
}

function truncateText(value: string, maxLength: number) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

function getConfidenceTone(confidence: FixMemoryConfidence) {
    switch (confidence) {
        case 'high':
            return 'ui-success-badge';
        case 'medium':
            return 'ui-accent-badge';
        case 'low':
        default:
            return 'ui-muted-badge';
    }
}

function LoadingState() {
    return (
        <div className="guidance-panel animate-pulse overflow-hidden rounded-[26px] border border-[#2a2a2a] ring-1 ring-white/5">
            <div className="border-b border-[#232323] px-6 pb-5 pt-6">
                <div className="h-4 w-24 rounded bg-[#202020]" />
                <div className="mt-3 h-8 w-56 rounded bg-[#181818]" />
                <div className="mt-3 h-3 w-72 rounded bg-[#161616]" />
            </div>
            <div className="space-y-5 p-6">
                <div className="h-28 rounded-[24px] border border-[#252525] bg-[#111]" />
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="h-28 rounded-[20px] border border-[#252525] bg-[#111]" />
                    <div className="h-28 rounded-[20px] border border-[#252525] bg-[#111]" />
                </div>
                <div className="grid gap-3 xl:grid-cols-3">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className="h-36 rounded-[20px] border border-[#252525] bg-[#111]" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <div className="guidance-panel ui-danger-panel overflow-hidden rounded-[26px] ring-1 ring-white/5">
            <div className="px-6 py-6">
                <h3 className="text-sm font-semibold text-red-100">
                    Fix Memory is unavailable
                </h3>
                <p className="mt-2 text-sm leading-6 text-red-100/80">
                    {error}
                </p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200/60">
                    AI guidance and prevention insights remain available.
                </p>
            </div>
        </div>
    );
}

function EmptyState({ summary }: { summary?: string | null }) {
    return (
        <div className="guidance-panel overflow-hidden rounded-[26px] border border-[#2a2a2a] ring-1 ring-white/5">
            <div className="px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-black/40 text-slate-500">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M5 12h14M12 5v14"
                        />
                    </svg>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-100">
                    No reusable fix memory is available for this issue yet
                </h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    {summary || 'Resolved references with reusable fix notes have not accumulated enough history for this issue.'}
                </p>
            </div>
        </div>
    );
}

export default function FixMemoryPanel({
    memory,
    loading,
    error,
    formatDate,
}: FixMemoryPanelProps) {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;

    const hasMeaningfulContent = Boolean(
        memory
        && (
            memory.summary
            || memory.signals.length > 0
            || memory.recommendedActions.length > 0
            || memory.relatedFixes.length > 0
        ),
    );

    if (!memory || !hasMeaningfulContent) {
        return <EmptyState summary={memory?.summary ?? null} />;
    }

    const summaryLooksEmpty = memory.confidence === 'low'
        && memory.relatedFixes.length === 0
        && memory.recommendedActions.length === 0
        && memory.signals.length === 0;

    if (summaryLooksEmpty) {
        return <EmptyState summary={memory.summary} />;
    }

    return (
        <section className="guidance-panel overflow-hidden rounded-[26px] border border-[var(--enterprise-border)] ring-1 ring-white/5">
            <div className="border-b border-[var(--enterprise-border)] px-6 pb-5 pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="ui-accent-surface flex h-12 w-12 items-center justify-center rounded-2xl">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                    d="M9 12h6m-6 4h6M9 8h6m-9 12h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-[1.6rem] font-semibold tracking-tight text-white">
                                Fix Memory
                            </h2>
                            <p className="mt-2 text-[15px] font-medium leading-7 text-slate-200">
                                Reusable fix patterns inferred from resolved similar issues
                            </p>
                            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                                Use this as a fix-reference layer: what has already worked, which patterns repeat, and which resolved issues are worth reviewing before closing the current one.
                            </p>
                        </div>
                    </div>

                    <span className={`inline-flex items-center self-start rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getConfidenceTone(memory.confidence)}`}>
                        {memory.confidence} confidence
                    </span>
                </div>
            </div>

            <div className="space-y-6 p-6">
                <div className="rounded-[24px] border border-[var(--enterprise-border)] bg-black/35 px-6 py-5 ring-1 ring-white/5">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                        Summary
                    </div>
                    <p className="mt-4 max-w-4xl text-[1rem] leading-8 text-slate-100">
                        {memory.summary || 'No reusable fix memory is available for this issue yet.'}
                    </p>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="space-y-5">
                        <div className="guidance-panel-soft rounded-[22px] border border-[var(--enterprise-border)] p-5 ring-1 ring-white/5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Signals
                                </div>
                                <div className="text-xs text-slate-500">
                                    {memory.signals.length} signal{memory.signals.length === 1 ? '' : 's'}
                                </div>
                            </div>
                            {memory.signals.length > 0 ? (
                                <ul className="mt-4 space-y-3">
                                    {memory.signals.map((signal) => (
                                        <li key={signal} className="flex items-start gap-3">
                                            <span className="ui-accent-dot mt-2 h-2 w-2 shrink-0 rounded-full" />
                                            <span className="text-sm leading-7 text-slate-200">{signal}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-4 text-sm leading-6 text-slate-400">
                                    No strong historical signals were detected yet.
                                </p>
                            )}
                        </div>

                        <div className="guidance-panel-soft rounded-[22px] border border-[var(--enterprise-border)] p-5 ring-1 ring-white/5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Recommended Reusable Actions
                            </div>
                            {memory.recommendedActions.length > 0 ? (
                                <div className="mt-4 space-y-3">
                                    {memory.recommendedActions.map((action, index) => (
                                        <div
                                            key={action}
                                            className={`rounded-[18px] border px-4 py-4 ring-1 ${
                                                index === 0
                                                    ? 'ui-accent-panel ring-white/5'
                                                    : 'border-[#252525] bg-[#0b0b0b] ring-white/5'
                                            }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                                                    index === 0
                                                        ? 'ui-accent-surface text-white'
                                                        : 'border-[#555] text-slate-400'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    {index === 0 ? (
                                                        <div className="ui-accent-text text-[11px] font-semibold uppercase tracking-[0.2em]">
                                                            Best reusable move
                                                        </div>
                                                    ) : null}
                                                    <p className={`text-sm leading-7 ${index === 0 ? 'mt-2 text-slate-100' : 'text-slate-300'}`}>
                                                        {action}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-4 text-sm leading-6 text-slate-400">
                                    No reusable actions were inferred from resolved history.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-[1.3rem] font-semibold tracking-tight text-white">
                                    Related Resolved Fixes
                                </h3>
                                <p className="mt-2 text-[14px] leading-7 text-slate-400">
                                    Most useful resolved references to review now.
                                </p>
                            </div>
                            <div className="text-xs text-slate-500">
                                {memory.relatedFixes.length} reference{memory.relatedFixes.length === 1 ? '' : 's'}
                            </div>
                        </div>

                        {memory.relatedFixes.length > 0 ? (
                            <div className="space-y-3">
                                {memory.relatedFixes.map((item) => (
                                    <Link
                                        key={item.id}
                                        to={`/issues/${item.id}`}
                                        className="guidance-panel-soft group block rounded-[22px] border border-[var(--enterprise-border)] px-5 py-5 ring-1 ring-white/5 transition-colors hover:border-[rgba(107,130,255,0.28)]"
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="ui-success-badge rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                                        Resolved
                                                    </span>
                                                    <span className="ui-accent-badge rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                                                        Fix reference
                                                    </span>
                                                </div>

                                                <h3 className="mt-4 text-[1rem] font-semibold leading-7 text-white transition-colors group-hover:text-[#dbe6ff]">
                                                    {truncateText(item.title, 140)}
                                                </h3>
                                                <p className="mt-2 text-sm leading-7 text-slate-400">
                                                    {truncateText(item.reason, 180)}
                                                </p>
                                                <div
                                                    title={item.resolutionNote ?? undefined}
                                                    className="mt-4 rounded-[16px] border border-[#252525] bg-black/40 px-4 py-3 text-sm leading-7 text-slate-200"
                                                >
                                                    {item.resolutionNote
                                                        ? truncateText(item.resolutionNote, 180)
                                                        : 'No saved resolution note was attached to this resolved issue.'}
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-left lg:w-[150px] lg:text-right">
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                    Last Seen
                                                </div>
                                                <div className="mt-2 text-sm font-medium text-slate-100">
                                                    {formatDate(item.lastSeenAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-[22px] border border-[#252525] bg-[#0b0b0b] px-5 py-5 ring-1 ring-white/5">
                                <p className="text-sm leading-6 text-slate-400">
                                    No resolved references are strong enough to show yet.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    <span className="rounded-full border border-[#2a2a2a] bg-black/30 px-3 py-1">
                        {memory.derivedFrom.resolvedSimilarIssues} resolved similar
                    </span>
                    <span className="rounded-full border border-[#2a2a2a] bg-black/30 px-3 py-1">
                        {memory.derivedFrom.resolutionNotesUsed} notes used
                    </span>
                    {memory.derivedFrom.currentAnalysisUsed ? (
                        <span className="rounded-full border border-[#2a2a2a] bg-black/30 px-3 py-1">
                            current analysis used
                        </span>
                    ) : null}
                    {memory.derivedFrom.preventionInsightUsed ? (
                        <span className="rounded-full border border-[#2a2a2a] bg-black/30 px-3 py-1">
                            prevention insight used
                        </span>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
