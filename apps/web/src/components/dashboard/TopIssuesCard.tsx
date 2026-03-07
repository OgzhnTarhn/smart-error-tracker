import type { DashboardTopIssue } from '../../lib/api';
import IssueRegressionBadge from '../issues/IssueRegressionBadge';
import IssueStatusBadge from '../issues/IssueStatusBadge';
import DashboardSectionCard from './DashboardSectionCard';

interface TopIssuesCardProps {
    issues: DashboardTopIssue[];
    loading?: boolean;
    onSelectIssue: (issueId: string) => void;
    formatRelativeTime: (value: string) => string;
}

function TopIssuesSkeleton() {
    return (
        <div className="divide-y divide-slate-700/30 animate-pulse">
            {[0, 1, 2, 3].map((index) => (
                <div key={index} className="px-5 py-4 sm:px-6 sm:py-5">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                        <div className="w-10 h-10 rounded-2xl bg-slate-700/50 shrink-0" />
                        <div className="min-w-0 space-y-3">
                            <div className="h-5 w-3/4 rounded bg-slate-700/50" />
                            <div className="flex gap-2">
                                <div className="h-6 w-16 rounded-full bg-slate-700/50" />
                                <div className="h-6 w-24 rounded-full bg-slate-700/50" />
                            </div>
                            <div className="h-3 w-1/2 rounded bg-slate-700/50" />
                        </div>
                        <div className="col-start-2 sm:col-start-auto w-20 rounded-2xl border border-slate-700/50 bg-slate-900/50 px-3 py-3 space-y-2">
                            <div className="h-5 rounded bg-slate-700/50" />
                            <div className="h-3 rounded bg-slate-700/50" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function TopIssuesCard({
    issues,
    loading = false,
    onSelectIssue,
    formatRelativeTime,
}: TopIssuesCardProps) {
    return (
        <DashboardSectionCard
            title="Top Issues"
            description="Highest-volume issues ranked by total event count."
            contentClassName="p-0"
        >
            {loading ? (
                <TopIssuesSkeleton />
            ) : issues.length === 0 ? (
                <div className="px-5 py-14 sm:px-6 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/60 text-slate-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="mt-4 text-sm font-medium text-slate-200">No issues yet</div>
                    <div className="mt-1 text-sm text-slate-500">
                        Trigger some errors to see the highest-volume issues here.
                    </div>
                </div>
            ) : (
                <div className="divide-y divide-slate-700/30">
                    {issues.map((issue, index) => (
                        <button
                            key={issue.id}
                            type="button"
                            onClick={() => onSelectIssue(issue.id)}
                            title={issue.title}
                            className="group relative w-full px-5 py-4 sm:px-6 sm:py-5 text-left transition-colors hover:bg-slate-700/18 focus:outline-none focus-visible:bg-slate-700/18"
                        >
                            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/70 text-base font-semibold text-slate-400 transition-colors group-hover:border-slate-600/80 group-hover:text-slate-200">
                                    {index + 1}
                                </div>
                                <div className="min-w-0">
                                    <div className="min-w-0">
                                        <div className="truncate text-[15px] sm:text-base font-semibold leading-6 text-slate-100 transition-colors group-hover:text-white">
                                            {issue.title}
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <IssueStatusBadge status={issue.status} />
                                            <IssueRegressionBadge
                                                isRegression={issue.isRegression}
                                                regressionCount={issue.regressionCount}
                                            />
                                        </div>
                                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-slate-400">
                                            <span className="font-medium text-slate-300">
                                                Last seen {formatRelativeTime(issue.lastSeenAt)}
                                            </span>
                                            <span className="hidden sm:inline text-slate-600">•</span>
                                            <span className="text-slate-500">
                                                Ranked by total event volume
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-start-2 sm:col-start-auto shrink-0 sm:justify-self-end">
                                    <div className="inline-flex min-w-20 flex-col rounded-2xl border border-slate-700/70 bg-slate-900/65 px-3.5 py-3 text-right shadow-[0_12px_30px_-24px_rgba(15,23,42,1)]">
                                        <div className="text-xl font-semibold tracking-tight text-slate-100 tabular-nums">
                                            {issue.eventCount.toLocaleString()}
                                        </div>
                                        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            events
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </DashboardSectionCard>
    );
}
