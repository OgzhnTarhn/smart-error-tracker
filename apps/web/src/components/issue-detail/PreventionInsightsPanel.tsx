import type { ReactNode } from 'react';
import type { PreventionInsights, PreventionRepeatRisk } from '../../lib/api';

interface PreventionInsightsPanelProps {
    insights: PreventionInsights | null;
    loading: boolean;
    error: string | null;
    showRecommendedActions?: boolean;
}

interface PreventionRecommendedActionsPanelProps {
    insights: PreventionInsights | null;
    loading: boolean;
    error: string | null;
    compact?: boolean;
}

function getRiskTone(risk: PreventionRepeatRisk) {
    switch (risk) {
        case 'high':
            return {
                label: 'Critical',
                badgeClassName: 'border-red-500/30 bg-red-500/12 text-red-200',
                surfaceClassName: 'border-red-500/20 bg-red-500/[0.08]',
                meterClassName: 'w-[88%] bg-gradient-to-r from-orange-400 via-orange-500 to-red-500',
                description: 'This pattern has enough historical signal to treat repeat risk as urgent.',
            };
        case 'medium':
            return {
                label: 'Elevated',
                badgeClassName: 'border-orange-500/30 bg-orange-500/12 text-orange-200',
                surfaceClassName: 'border-orange-500/20 bg-orange-500/[0.08]',
                meterClassName: 'w-[66%] bg-gradient-to-r from-amber-300 via-orange-400 to-orange-500',
                description: 'There is meaningful history here, but the pattern is not yet dominant.',
            };
        case 'low':
        default:
            return {
                label: 'Guarded',
                badgeClassName: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200',
                surfaceClassName: 'border-emerald-500/20 bg-emerald-500/[0.08]',
                meterClassName: 'w-[40%] bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400',
                description: 'Current prevention history suggests lower repeat risk, but not zero risk.',
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
            ? `Matched ${insights.derivedFrom.similarIssuesCount} historical ${pluralize(insights.derivedFrom.similarIssuesCount, 'issue')}.`
            : null,
        insights.derivedFrom.resolutionNotesUsed > 0
            ? `${insights.derivedFrom.resolutionNotesUsed} saved resolution ${pluralize(insights.derivedFrom.resolutionNotesUsed, 'note')} contributed to this readout.`
            : null,
        insights.derivedFrom.regressionHistory
            ? 'Related issue patterns have regressed before.'
            : null,
        insights.derivedFrom.currentAnalysis
            ? 'Current AI analysis is reinforcing the prevention signal.'
            : null,
    ]);
}

function PanelShell({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={`guidance-panel overflow-hidden rounded-[24px] border border-[#2a2a2a] ring-1 ring-white/5 ${className}`}>
            {children}
        </section>
    );
}

function StatCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="guidance-panel-soft rounded-[20px] border border-[#262626] px-4 py-4 ring-1 ring-white/5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {label}
            </div>
            <div className="mt-2 text-[1.35rem] font-semibold text-slate-100">
                {value}
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-400">
                {detail}
            </p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="space-y-5">
            <PanelShell>
                <div className="animate-pulse p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                            <div className="h-4 w-32 rounded bg-[#202020]" />
                            <div className="h-8 w-56 rounded bg-[#171717]" />
                            <div className="h-3 w-72 rounded bg-[#181818]" />
                        </div>
                        <div className="h-7 w-20 rounded-full bg-[#202020]" />
                    </div>
                    <div className="mt-5 h-2 rounded-full bg-[#1b1b1b]" />
                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-28 rounded-[20px] border border-[#252525] bg-[#111]" />
                        ))}
                    </div>
                </div>
            </PanelShell>

            <PanelShell>
                <div className="animate-pulse p-5">
                    <div className="h-4 w-40 rounded bg-[#202020]" />
                    <div className="mt-4 grid gap-3">
                        {[0, 1, 2].map((item) => (
                            <div key={item} className="h-20 rounded-[18px] border border-[#252525] bg-[#111]" />
                        ))}
                    </div>
                </div>
            </PanelShell>
        </div>
    );
}

function ErrorState({ error }: { error: string }) {
    return (
        <PanelShell className="border-red-500/25 bg-red-500/10">
            <div className="p-5">
                <h3 className="text-sm font-semibold text-red-100">
                    Prevention insight is unavailable
                </h3>
                <p className="mt-2 text-sm leading-6 text-red-100/80">
                    {error}
                </p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200/60">
                    Guidance can still continue without this context.
                </p>
            </div>
        </PanelShell>
    );
}

function EmptyState() {
    return (
        <PanelShell>
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
                    This panel becomes more useful after similar issues, saved notes, or prior analysis accumulate.
                </p>
            </div>
        </PanelShell>
    );
}

function RecommendedActionCard({
    item,
    highlight,
    compact = false,
}: {
    item: string;
    highlight: boolean;
    compact?: boolean;
}) {
    return (
        <div
            className={`rounded-[20px] border px-4 py-4 ring-1 ${
                highlight
                    ? 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-50 ring-emerald-500/10'
                    : 'border-[#252525] bg-[#0b0b0b] text-slate-300 ring-white/5'
            }`}
        >
            <div className="flex items-start gap-3">
                <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                        highlight
                            ? 'border-emerald-400/30 bg-emerald-500 text-white'
                            : 'border-[#555] bg-transparent text-slate-400'
                    }`}
                >
                    {highlight ? (
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
                <div className="min-w-0">
                    {highlight ? (
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                            Best next prevention move
                        </div>
                    ) : null}
                    <p className={highlight
                        ? `mt-2 ${compact ? 'text-[13px] leading-6' : 'text-sm leading-7'}`
                        : compact
                            ? 'text-[13px] leading-6'
                            : 'text-sm leading-7'}>
                        {item}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ActionsLoadingState({ compact = false }: { compact?: boolean }) {
    return (
        <PanelShell>
            <div className={`${compact ? 'p-4' : 'p-5'} animate-pulse`}>
                <div className="h-4 w-36 rounded bg-[#202020]" />
                <div className="mt-2 h-3 w-52 rounded bg-[#181818]" />
                <div className="mt-4 space-y-3">
                    {[0, 1, 2].map((item) => (
                        <div key={item} className={`rounded-[18px] border border-[#252525] bg-[#111] ${compact ? 'h-16' : 'h-20'}`} />
                    ))}
                </div>
            </div>
        </PanelShell>
    );
}

function ActionsErrorState({ error, compact = false }: { error: string; compact?: boolean }) {
    return (
        <PanelShell className="border-red-500/25 bg-red-500/10">
            <div className={compact ? 'p-4' : 'p-5'}>
                <h3 className="text-sm font-semibold text-red-100">
                    Recommended actions are unavailable
                </h3>
                <p className="mt-2 text-sm leading-6 text-red-100/80">
                    {error}
                </p>
            </div>
        </PanelShell>
    );
}

function ActionsEmptyState({ compact = false }: { compact?: boolean }) {
    return (
        <PanelShell>
            <div className={`${compact ? 'px-4 py-8' : 'px-5 py-10'} text-center`}>
                <h3 className="text-sm font-semibold text-slate-100">
                    No recommended actions yet
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                    Actionable prevention steps will appear here once enough context is available.
                </p>
            </div>
        </PanelShell>
    );
}

export function PreventionRecommendedActionsPanel({
    insights,
    loading,
    error,
    compact = false,
}: PreventionRecommendedActionsPanelProps) {
    if (loading) return <ActionsLoadingState compact={compact} />;
    if (error) return <ActionsErrorState error={error} compact={compact} />;

    const actionItems = insights ? dedupeItems([insights.preventionTip, ...insights.recommendedActions]) : [];
    if (actionItems.length === 0) return <ActionsEmptyState compact={compact} />;

    return (
        <section className={compact ? 'space-y-3' : 'space-y-4'}>
            <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Recommended Actions
                </div>
                <p className={`mt-2 ${compact ? 'text-[13px] leading-6' : 'text-sm leading-6'} text-slate-400`}>
                    Start with the top action, then move downward if more follow-up is needed.
                </p>
            </div>
            <div className="space-y-3">
                {actionItems.map((item, index) => (
                    <RecommendedActionCard
                        key={item}
                        item={item}
                        highlight={index === 0}
                        compact={compact}
                    />
                ))}
            </div>
        </section>
    );
}

export default function PreventionInsightsPanel({
    insights,
    loading,
    error,
    showRecommendedActions = true,
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
            <PanelShell>
                <div className="border-b border-[#232323] px-5 pb-5 pt-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-300">
                                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="1.8"
                                        d="M4 17l6-6 4 4 6-8M6 7h.01M18 17h.01"
                                    />
                                </svg>
                            </div>
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Prevention Summary
                                </div>
                                <h2 className="mt-2 text-[1.35rem] font-semibold tracking-tight text-white">
                                    Avoid repeating this failure pattern
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Historical signals, saved fixes, and AI context condensed into one prevention view.
                                </p>
                            </div>
                        </div>

                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${riskTone.badgeClassName}`}>
                            {riskTone.label} repeat risk
                        </span>
                    </div>
                </div>

                <div className="space-y-5 p-5">
                    <div className={`rounded-[22px] border px-4 py-4 ring-1 ring-white/5 ${riskTone.surfaceClassName}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                                Repeat Risk Readout
                            </div>
                            <div className="text-sm font-semibold text-slate-100">
                                {riskTone.label}
                            </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-200">
                            {riskTone.description}
                        </p>
                        <div className="mt-4 h-2 rounded-full bg-black/30">
                            <div className={`h-full rounded-full ${riskTone.meterClassName}`} />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <StatCard
                            label="Similar Issues"
                            value={String(insights.derivedFrom.similarIssuesCount)}
                            detail={`${insights.derivedFrom.similarIssuesCount} historical ${pluralize(insights.derivedFrom.similarIssuesCount, 'match')} influenced this assessment.`}
                        />
                        <StatCard
                            label="Saved Notes"
                            value={String(insights.derivedFrom.resolutionNotesUsed)}
                            detail={`${insights.derivedFrom.resolutionNotesUsed} resolution ${pluralize(insights.derivedFrom.resolutionNotesUsed, 'note')} is reusable context.`}
                        />
                        <StatCard
                            label="Regression"
                            value={insights.derivedFrom.regressionHistory ? 'Seen before' : 'No signal'}
                            detail={insights.derivedFrom.regressionHistory
                                ? 'Past issue patterns have resurfaced after being resolved.'
                                : 'No repeated regression history is currently attached.'}
                        />
                    </div>
                </div>
            </PanelShell>

            {reportSignals.length > 0 ? (
                <PanelShell>
                    <div className="border-b border-[#232323] px-5 pb-4 pt-5">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Report Signals
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Short evidence points behind this prevention recommendation.
                        </p>
                    </div>
                    <div className="grid gap-3 p-5">
                        {reportSignals.map((item) => (
                            <div
                                key={item}
                                className="guidance-panel-soft rounded-[18px] border border-[#252525] px-4 py-4 ring-1 ring-white/5"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                                    <p className="text-sm leading-7 text-slate-200">
                                        {item}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </PanelShell>
            ) : null}

            {showRecommendedActions && actionItems.length > 0 ? (
                <PreventionRecommendedActionsPanel
                    insights={insights}
                    loading={false}
                    error={null}
                />
            ) : null}
        </div>
    );
}
