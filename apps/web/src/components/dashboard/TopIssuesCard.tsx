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
                <div key={index} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded bg-slate-700/50 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/3 rounded bg-slate-700/50" />
                        <div className="h-3 w-1/3 rounded bg-slate-700/50" />
                    </div>
                    <div className="h-6 w-16 rounded-full bg-slate-700/50 shrink-0" />
                    <div className="w-14 space-y-2 text-right">
                        <div className="h-4 rounded bg-slate-700/50" />
                        <div className="h-3 rounded bg-slate-700/50" />
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
                <div className="px-5 py-12 text-center text-sm text-slate-500">
                    No issues yet. Trigger some errors to see data here.
                </div>
            ) : (
                <div className="divide-y divide-slate-700/30">
                    {issues.map((issue, index) => (
                        <button
                            key={issue.id}
                            type="button"
                            onClick={() => onSelectIssue(issue.id)}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-700/20 transition-colors text-left"
                        >
                            <span className="text-2xl font-bold text-slate-600 w-8 shrink-0">
                                {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-medium text-slate-200 truncate min-w-0 flex-1">
                                        {issue.title}
                                    </div>
                                    <IssueStatusBadge status={issue.status} />
                                    <IssueRegressionBadge
                                        isRegression={issue.isRegression}
                                        regressionCount={issue.regressionCount}
                                    />
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Last seen {formatRelativeTime(issue.lastSeenAt)}
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <div className="text-lg font-bold text-slate-200">
                                    {issue.eventCount.toLocaleString()}
                                </div>
                                <div className="text-xs text-slate-500">events</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </DashboardSectionCard>
    );
}
