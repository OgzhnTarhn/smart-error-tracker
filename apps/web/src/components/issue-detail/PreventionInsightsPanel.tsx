import type { ReactNode } from 'react';
import type { PreventionInsights, PreventionRepeatRisk } from '../../lib/api';

interface PreventionInsightsPanelProps {
    insights: PreventionInsights | null;
    loading: boolean;
    error: string | null;
}

function getRiskTone(risk: PreventionRepeatRisk) {
    switch (risk) {
        case 'high':
            return {
                badgeClassName: 'border-red-500/35 bg-red-500/14 text-red-200',
                meterClassName: 'w-[92%] bg-gradient-to-r from-rose-400 via-red-400 to-orange-300',
                label: 'Critical',
            };
        case 'medium':
            return {
                badgeClassName: 'border-amber-500/35 bg-amber-500/14 text-amber-200',
                meterClassName: 'w-[68%] bg-gradient-to-r from-amber-300 via-amber-400 to-orange-300',
                label: 'Elevated',
            };
        case 'low':
        default:
            return {
                badgeClassName: 'border-emerald-500/35 bg-emerald-500/14 text-emerald-200',
                meterClassName: 'w-[38%] bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300',
                label: 'Guarded',
            };
    }
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
    return value === 1 ? singular : plural;
}

function dedupeItems(items: Array<string | null | undefined>) {
    const seen = new Set<string>();
    const output: string[] = [];

    for (const item of items) {
        if (!item) continue;
        const normalized = item.trim();
        if (!normalized) continue;
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        output.push(normalized);
    }

    return output;
}

function PanelShell({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="guidance-panel h-full overflow-hidden rounded-[28px] border border-slate-800/80 ring-1 ring-white/5">
            {children}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-4">
            <div className="guidance-panel-soft animate-pulse rounded-[22px] border border-slate-800/80 p-5 ring-1 ring-white/5">
                <div className="h-3 w-24 rounded bg-slate-700/80" />
                <div className="mt-4 h-8 w-36 rounded-full bg-slate-800/80" />
                <div className="mt-5 h-2 rounded-full bg-slate-800/90" />
                <div className="mt-5 grid grid-cols-2 gap-3">
                    {[0, 1].map((item) => (
                        <div key={item} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                            <div className="h-7 w-12 rounded bg-slate-800/80" />
                            <div className="mt-3 h-3 w-14 rounded bg-slate-800/70" />
                        </div>
                    ))}
                </div>
            </div>
            {[0, 1].map((item) => (
                <div key={item} className="animate-pulse rounded-[22px] border border-slate-800/70 bg-slate-950/45 p-5 ring-1 ring-white/5">
                    <div className="h-3 w-28 rounded bg-slate-700/70" />
                    <div className="mt-4 space-y-3">
                        <div className="h-3 w-11/12 rounded bg-slate-800/80" />
                        <div className="h-3 w-4/5 rounded bg-slate-800/75" />
                        <div className="h-3 w-3/4 rounded bg-slate-800/70" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <div className="rounded-[22px] border border-red-500/25 bg-red-500/10 px-5 py-5 ring-1 ring-red-500/15">
            <h3 className="text-sm font-semibold text-red-100">
                Prevention insight is unavailable
            </h3>
            <p className="mt-2 text-sm leading-6 text-red-100/80">
                {error}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                The rest of the issue detail page is still usable.
            </p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="rounded-[22px] border border-slate-800/80 bg-slate-950/55 px-5 py-10 text-center ring-1 ring-white/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-900/80 text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-100">
                Not enough prevention history yet
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
                This panel gets stronger once AI guidance, related issues, or resolution notes exist.
            </p>
        </div>
    );
}

function InsightCountCard({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-4 text-center ring-1 ring-white/5">
            <div className="text-2xl font-semibold text-slate-50">{value}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {label}
            </div>
        </div>
    );
}

function SignalSection({
    title,
    items,
    accentClassName,
    bulletClassName,
}: {
    title: string;
    items: string[];
    accentClassName: string;
    bulletClassName: string;
}) {
    return (
        <div className="border-t border-slate-800/80 pt-5">
            <div className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${accentClassName}`}>
                {title}
            </div>
            <ul className="mt-4 space-y-3">
                {items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                        <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${bulletClassName}`} />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function RecommendedActions({
    items,
}: {
    items: string[];
}) {
    return (
        <div className="border-t border-slate-800/80 pt-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                Recommended Actions
            </div>
            <div className="mt-4 space-y-3">
                {items.map((item, index) => (
                    <div
                        key={item}
                        className={`rounded-2xl border px-4 py-4 ring-1 ${index === 0
                            ? 'border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-50 ring-emerald-500/10'
                            : 'border-slate-800/80 bg-slate-950/60 text-slate-200 ring-white/5'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${index === 0
                                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                                : 'border-slate-700/80 bg-slate-900/70 text-slate-400'
                                }`}>
                                {index === 0 ? (
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.8"
                                            d="M5 12l4 4L19 6"
                                        />
                                    </svg>
                                ) : (
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.8"
                                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                                        />
                                    </svg>
                                )}
                            </span>
                            <span className="text-sm leading-6">{item}</span>
                        </div>
                    </div>
                ))}
            </div>
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
            || insights.derivedFrom.currentAnalysis
            || insights.derivedFrom.resolutionNotesUsed > 0
        ),
    );

    const actionItems = insights
        ? dedupeItems([insights.preventionTip, ...insights.recommendedActions])
        : [];
    const riskTone = getRiskTone(insights?.repeatRisk ?? 'low');

    return (
        <PanelShell>
            <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-6 pb-5 pt-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-200">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                                d="M4 17l6-6 4 4 6-8M6 7h.01M18 17h.01"
                            />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-50">
                            Prevention Insights
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Repeat-risk guidance from current analysis and project history
                        </p>
                    </div>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,0.85)]" />
            </div>

            <div className="p-6">
                {loading ? (
                    <LoadingState />
                ) : error ? (
                    <ErrorState error={error} />
                ) : !insights || !hasContent ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-5">
                        <div className="guidance-panel-soft rounded-[24px] border border-slate-800/80 px-5 py-5 ring-1 ring-white/5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                                        Repeat Risk
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-slate-400">
                                        Uses the existing prevention features: repeat signals, recommended actions, and derived history.
                                    </p>
                                </div>
                                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${riskTone.badgeClassName}`}>
                                    {riskTone.label}
                                </span>
                            </div>

                            <div className="mt-5 h-2 rounded-full bg-slate-800/90">
                                <div className={`h-full rounded-full ${riskTone.meterClassName}`} />
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <InsightCountCard
                                    label={pluralize(
                                        insights.derivedFrom.similarIssuesCount,
                                        'similar',
                                    )}
                                    value={String(insights.derivedFrom.similarIssuesCount)}
                                />
                                <InsightCountCard
                                    label={pluralize(
                                        insights.derivedFrom.resolutionNotesUsed,
                                        'note',
                                    )}
                                    value={String(insights.derivedFrom.resolutionNotesUsed)}
                                />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {insights.derivedFrom.currentAnalysis && (
                                    <span className="rounded-full border border-slate-700/80 bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-slate-300">
                                        AI analysis linked
                                    </span>
                                )}
                                {insights.derivedFrom.regressionHistory && (
                                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                                        Regression history
                                    </span>
                                )}
                                {insights.preventionTip && (
                                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                                        Prevention tip ready
                                    </span>
                                )}
                            </div>
                        </div>

                        {insights.repeatSignals.length > 0 && (
                            <SignalSection
                                title="Repeat Signals"
                                items={insights.repeatSignals}
                                accentClassName="text-amber-300"
                                bulletClassName="bg-amber-300"
                            />
                        )}

                        {actionItems.length > 0 && (
                            <RecommendedActions items={actionItems} />
                        )}
                    </div>
                )}
            </div>
        </PanelShell>
    );
}
