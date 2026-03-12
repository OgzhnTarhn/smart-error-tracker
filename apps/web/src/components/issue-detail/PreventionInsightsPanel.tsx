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
                badgeClassName: 'bg-red-500 text-white',
                meterClassName: 'w-[86%] bg-gradient-to-r from-orange-400 via-orange-500 to-red-500',
                label: 'Critical',
            };
        case 'medium':
            return {
                badgeClassName: 'bg-orange-500/85 text-white',
                meterClassName: 'w-[68%] bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500',
                label: 'Elevated',
            };
        case 'low':
        default:
            return {
                badgeClassName: 'bg-emerald-500/85 text-white',
                meterClassName: 'w-[42%] bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400',
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
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        output.push(normalized);
    }

    return output;
}

function buildReportSignals(insights: PreventionInsights) {
    return dedupeItems([
        ...insights.repeatSignals,
        insights.derivedFrom.similarIssuesCount > 0
            ? `This issue has similarities with ${insights.derivedFrom.similarIssuesCount} past ${pluralize(insights.derivedFrom.similarIssuesCount, 'issue')} in this repository.`
            : null,
        insights.derivedFrom.resolutionNotesUsed > 0
            ? `${insights.derivedFrom.resolutionNotesUsed} resolved ${pluralize(insights.derivedFrom.resolutionNotesUsed, 'issue')} includes a saved resolution note.`
            : null,
        insights.derivedFrom.regressionHistory
            ? 'Related issues in this pattern have regressed before.'
            : null,
        insights.derivedFrom.currentAnalysis
            ? 'Current AI analysis is contributing to this prevention insight.'
            : null,
    ]);
}

function SidebarCard({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`guidance-panel overflow-hidden rounded-[24px] border border-[#2a2a2a] ring-1 ring-white/5 ${className}`}>
            {children}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-5">
            <SidebarCard>
                <div className="animate-pulse p-5">
                    <div className="flex items-center justify-between">
                        <div className="h-4 w-[8.5rem] rounded bg-[#202020]" />
                        <div className="h-6 w-[4.5rem] rounded bg-[#202020]" />
                    </div>
                    <div className="mt-5 h-3 w-28 rounded bg-[#181818]" />
                    <div className="mt-3 h-12 rounded bg-[#141414]" />
                    <div className="mt-5 h-2 rounded-full bg-[#181818]" />
                    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="h-16 rounded-2xl bg-[#141414]" />
                        <div className="h-10 w-px bg-[#202020]" />
                        <div className="h-16 rounded-2xl bg-[#141414]" />
                    </div>
                </div>
            </SidebarCard>
            <div className="space-y-3">
                {[0, 1, 2].map((item) => (
                    <div
                        key={item}
                        className="animate-pulse rounded-[20px] border border-[#252525] bg-[#0d0d0d] p-4 ring-1 ring-white/5"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 h-6 w-6 rounded-full bg-[#1b1b1b]" />
                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="h-3 w-11/12 rounded bg-[#1b1b1b]" />
                                <div className="h-3 w-4/5 rounded bg-[#181818]" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <SidebarCard className="border-red-500/25 bg-red-500/10">
            <div className="p-5">
                <h3 className="text-sm font-semibold text-red-100">
                    Prevention insight is unavailable
                </h3>
                <p className="mt-2 text-sm leading-6 text-red-100/80">
                    {error}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.24em] text-red-200/60">
                    The rest of the issue detail page is still usable.
                </p>
            </div>
        </SidebarCard>
    );
}

function EmptyState() {
    return (
        <SidebarCard>
            <div className="px-5 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-black/40 text-slate-500">
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
        </SidebarCard>
    );
}

function RecommendedActionCard({
    item,
    active,
}: {
    item: string;
    active: boolean;
}) {
    return (
        <div
            className={`rounded-[18px] border p-4 ring-1 ${active
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-50 ring-emerald-500/10'
                : 'border-[#252525] bg-[#0b0b0b] text-slate-300 ring-white/5'
                }`}
        >
            <div className="flex items-start gap-3">
                <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active
                        ? 'border-emerald-400/30 bg-emerald-500 text-white'
                        : 'border-[#555] bg-transparent text-slate-400'
                        }`}
                >
                    {active ? (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.4"
                                d="M5 12l4 4L19 7"
                            />
                        </svg>
                    ) : (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.2"
                                d="M12 6v12m6-6H6"
                            />
                        </svg>
                    )}
                </span>
                <p className="text-sm leading-7">
                    {item}
                </p>
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

    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    if (!insights || !hasContent) return <EmptyState />;

    const actionItems = dedupeItems([insights.preventionTip, ...insights.recommendedActions]);
    const reportSignals = buildReportSignals(insights);
    const riskTone = getRiskTone(insights.repeatRisk);

    return (
        <div className="space-y-5">
            <SidebarCard>
                <div className="border-b border-[#232323] px-5 pb-5 pt-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/12 text-orange-300">
                                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.8"
                                        d="M4 17l6-6 4 4 6-8M6 7h.01M18 17h.01"
                                    />
                                </svg>
                            </div>
                            <h2 className="text-lg font-semibold text-white">
                                Prevention Insights
                            </h2>
                        </div>
                        <span className="h-4 w-1.5 rounded-full bg-orange-500" />
                    </div>
                </div>

                <div className="p-5">
                    <div>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Repeat Risk
                            </div>
                            <span className={`rounded px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${riskTone.badgeClassName}`}>
                                {riskTone.label}
                            </span>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-400">
                            Uses the existing prevention feature: repeat signals, recommended actions, and derived history.
                        </p>

                        <div className="mt-5 h-1.5 rounded-full bg-[#242424]">
                            <div className={`h-full rounded-full ${riskTone.meterClassName}`} />
                        </div>

                        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <div className="text-center">
                                <div className="text-4xl font-semibold text-white">
                                    {insights.derivedFrom.similarIssuesCount}
                                </div>
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {pluralize(insights.derivedFrom.similarIssuesCount, 'similar')}
                                </div>
                            </div>
                            <div className="h-12 w-px bg-[#2a2a2a]" />
                            <div className="text-center">
                                <div className="text-4xl font-semibold text-white">
                                    {insights.derivedFrom.resolutionNotesUsed}
                                </div>
                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                    {pluralize(insights.derivedFrom.resolutionNotesUsed, 'note')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2">
                            {insights.derivedFrom.currentAnalysis && (
                                <span className="rounded border border-[#2a2a2a] bg-black/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Analysis Trend
                                </span>
                            )}
                            {insights.derivedFrom.regressionHistory && (
                                <span className="rounded border border-orange-500/25 bg-orange-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-orange-300">
                                    Regression History
                                </span>
                            )}
                            {actionItems.length > 0 && (
                                <span className="rounded border border-[#2a2a2a] bg-black/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Resolution Priority
                                </span>
                            )}
                        </div>
                    </div>

                    {reportSignals.length > 0 && (
                        <div className="mt-6 border-t border-[#232323] pt-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Report Signals
                            </div>
                            <ul className="mt-4 space-y-3">
                                {reportSignals.map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </SidebarCard>

            {actionItems.length > 0 && (
                <section className="space-y-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Recommended Actions
                    </div>
                    <div className="space-y-3">
                        {actionItems.map((item, index) => (
                            <RecommendedActionCard
                                key={item}
                                item={item}
                                active={index === 0}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
