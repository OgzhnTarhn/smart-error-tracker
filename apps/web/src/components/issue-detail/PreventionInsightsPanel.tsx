import type { PreventionInsights, PreventionRepeatRisk } from '../../lib/api';

interface PreventionInsightsPanelProps {
    insights: PreventionInsights | null;
    loading: boolean;
    error: string | null;
}

function getRiskClassName(risk: PreventionRepeatRisk) {
    switch (risk) {
        case 'high':
            return 'border-rose-500/35 bg-rose-500/12 text-rose-200';
        case 'medium':
            return 'border-amber-500/35 bg-amber-500/12 text-amber-200';
        case 'low':
        default:
            return 'border-emerald-500/35 bg-emerald-500/12 text-emerald-200';
    }
}

function LoadingState() {
    return (
        <div className="space-y-3">
            {[0, 1, 2].map((item) => (
                <div
                    key={item}
                    className="animate-pulse rounded-xl border border-slate-700/70 bg-slate-900/45 p-4"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="h-3 w-28 rounded bg-slate-700/70" />
                            <div className="mt-3 h-5 w-4/5 rounded bg-slate-700/60" />
                        </div>
                        <div className="h-7 w-20 rounded-full bg-slate-700/60" />
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-slate-800/90" />
                        <div className="h-3 w-2/3 rounded bg-slate-800/80" />
                        <div className="h-3 w-4/5 rounded bg-slate-800/70" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-4">
            <h3 className="text-sm font-medium text-red-200">
                Prevention insight is unavailable
            </h3>
            <p className="mt-1 text-sm text-red-200/80">
                {error}
            </p>
            <p className="mt-2 text-xs text-slate-400">
                The rest of the issue detail page is still usable.
            </p>
        </div>
    );
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
                        d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                    />
                </svg>
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-200">
                Not enough prevention history yet
            </h3>
            <p className="mt-1 text-sm text-slate-500">
                This panel gets stronger once AI analysis or related resolved issues exist.
            </p>
        </div>
    );
}

function SignalList({
    title,
    items,
    accentClassName,
}: {
    title: string;
    items: string[];
    accentClassName: string;
}) {
    return (
        <div className="border-t border-slate-800/80 pt-4">
            <div className={`text-[11px] font-semibold ${accentClassName}`}>
                {title}
            </div>
            <ul className="mt-3 space-y-2">
                {items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm leading-5 text-slate-300">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function PreventionInsightsPanel({
    insights,
    loading,
    error,
}: PreventionInsightsPanelProps) {
    const hasContent = Boolean(
        insights
        && (
            insights.preventionTip
            || insights.repeatSignals.length > 0
            || insights.recommendedActions.length > 0
            || insights.derivedFrom.similarIssuesCount > 0
            || insights.derivedFrom.regressionHistory
        ),
    );

    return (
        <div className="overflow-hidden rounded-2xl bg-slate-800/35 ring-1 ring-white/5">
            <div className="flex flex-col gap-1 border-b border-slate-800/80 px-5 pb-4 pt-5">
                <h2 className="text-base font-semibold text-slate-100">
                    Prevention Insights
                </h2>
                <p className="text-sm text-slate-500">
                    Repeat-risk guidance from current analysis and project history
                </p>
            </div>

            <div className="p-5">
                {loading ? (
                    <LoadingState />
                ) : error ? (
                    <ErrorState error={error} />
                ) : !insights || !hasContent ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-4">
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_190px]">
                            <div className="rounded-xl bg-slate-950/45 p-4 ring-1 ring-white/5">
                                <div className="text-[11px] font-semibold text-rose-300">
                                    Prevention Tip
                                </div>
                                <p className="mt-3 text-sm leading-6 text-slate-100">
                                    {insights.preventionTip ?? 'No specific prevention tip is available yet.'}
                                </p>
                            </div>

                            <div className="rounded-xl bg-slate-950/45 p-4 ring-1 ring-white/5">
                                <div className="text-[11px] font-semibold text-slate-500">
                                    Repeat Risk
                                </div>
                                <div className="mt-3">
                                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${getRiskClassName(insights.repeatRisk)}`}>
                                        {insights.repeatRisk}
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400">
                                    {insights.derivedFrom.currentAnalysis && (
                                        <span className="rounded-full bg-slate-900/65 px-2.5 py-1 ring-1 ring-white/5">
                                            AI analysis
                                        </span>
                                    )}
                                    {insights.derivedFrom.similarIssuesCount > 0 && (
                                        <span className="rounded-full bg-slate-900/65 px-2.5 py-1 ring-1 ring-white/5">
                                            {insights.derivedFrom.similarIssuesCount} similar
                                        </span>
                                    )}
                                    {insights.derivedFrom.regressionHistory && (
                                        <span className="rounded-full bg-slate-900/65 px-2.5 py-1 ring-1 ring-white/5">
                                            Regression history
                                        </span>
                                    )}
                                    {insights.derivedFrom.resolutionNotesUsed > 0 && (
                                        <span className="rounded-full bg-slate-900/65 px-2.5 py-1 ring-1 ring-white/5">
                                            {insights.derivedFrom.resolutionNotesUsed} note reused
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {insights.repeatSignals.length > 0 && (
                            <SignalList
                                title="Repeat Signals"
                                items={insights.repeatSignals}
                                accentClassName="text-amber-300"
                            />
                        )}

                        {insights.recommendedActions.length > 0 && (
                            <SignalList
                                title="Recommended Actions"
                                items={insights.recommendedActions}
                                accentClassName="text-emerald-300"
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
