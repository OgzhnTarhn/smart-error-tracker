import type { DashboardTopIssue } from '../../lib/api';
import DashboardSectionCard from './DashboardSectionCard';

interface TopIssuesCardProps {
    issues: DashboardTopIssue[];
    loading?: boolean;
    onSelectIssue: (issueId: string) => void;
    formatRelativeTime: (value: string) => string;
}

function severityFromTitle(title: string): 'critical' | 'warning' | 'info' {
    const lower = title.toLowerCase();
    if (
        lower.includes('error') ||
        lower.includes('fail') ||
        lower.includes('crash') ||
        lower.includes('timeout') ||
        lower.includes('invalid') ||
        lower.includes('exception')
    )
        return 'critical';
    if (lower.includes('warn') || lower.includes('type') || lower.includes('cannot'))
        return 'warning';
    return 'info';
}

function extractSource(title: string): string {
    const parts = title.split(':');
    if (parts.length > 1) {
        const errorType = parts[0].trim();
        if (errorType.includes('Error') || errorType.includes('Service')) {
            return `src/${errorType.toLowerCase().replace(/\s+/g, '-')}.ts`;
        }
    }
    return 'src/unknown.ts';
}

function formatEventCount(count: number): string {
    if (count >= 1000) {
        const k = count / 1000;
        return k >= 10 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`;
    }
    return count.toLocaleString();
}

function IssueToggle({ on }: { on: boolean }) {
    return (
        <div className={`toggle-switch ${on ? 'on' : 'off'}`} />
    );
}

function TopIssuesSkeleton() {
    return (
        <div className="space-y-3 animate-pulse p-4">
            {[0, 1, 2].map((i) => (
                <div key={i} className="dash-card-inner p-4 space-y-2">
                    <div className="h-4 w-16 rounded bg-white/5" />
                    <div className="h-4 w-48 rounded bg-white/5" />
                    <div className="h-3 w-32 rounded bg-white/5" />
                </div>
            ))}
        </div>
    );
}

export default function TopIssuesCard({
    issues,
    loading = false,
    onSelectIssue,
}: TopIssuesCardProps) {
    return (
        <DashboardSectionCard
            title="Top Issues"
            action={
                <button
                    type="button"
                    className="text-xs text-[var(--dash-text-muted)] hover:text-white transition-colors"
                >
                    View All
                </button>
            }
            contentClassName="p-3 space-y-3 max-h-[460px] overflow-y-auto scrollbar-hidden"
        >
            {loading ? (
                <TopIssuesSkeleton />
            ) : issues.length === 0 ? (
                <div className="py-10 text-center text-sm text-[var(--dash-text-dim)]">
                    No issues yet. Trigger some errors to see them here.
                </div>
            ) : (
                issues.slice(0, 5).map((issue, idx) => {
                    const severity = severityFromTitle(issue.title);
                    const source = extractSource(issue.title);
                    const issueNum = `#${(9421 - idx * 100 + idx * 37).toString()}`;
                    const badgeClass =
                        severity === 'critical'
                            ? 'badge-critical'
                            : severity === 'warning'
                                ? 'badge-warning'
                                : 'badge-info';

                    return (
                        <button
                            key={issue.id}
                            type="button"
                            onClick={() => onSelectIssue(issue.id)}
                            className="dash-card-inner w-full p-4 text-left transition-all hover:border-white/10 hover:bg-[#1a1a28] cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <span className={badgeClass}>{severity}</span>
                                <span className="text-xs text-[var(--dash-text-dim)] tabular-nums">
                                    {issueNum}
                                </span>
                            </div>
                            <div className="mt-2 text-sm font-semibold text-white leading-snug truncate">
                                {issue.title}
                            </div>
                            <div className="mt-1 text-xs text-[var(--dash-text-dim)] font-mono truncate">
                                {source}
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <IssueToggle on={issue.status === 'resolved'} />
                                    <IssueToggle on={issue.eventCount > 1000} />
                                </div>
                                <span className="text-xs text-[var(--dash-text-muted)] tabular-nums">
                                    {formatEventCount(issue.eventCount)} events
                                </span>
                            </div>
                        </button>
                    );
                })
            )}
        </DashboardSectionCard>
    );
}
