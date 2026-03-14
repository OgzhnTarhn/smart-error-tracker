import type { DashboardTopIssue } from '../../lib/api';
import DashboardSectionCard from './DashboardSectionCard';

interface TopIssuesCardProps {
    issues: DashboardTopIssue[];
    loading?: boolean;
    onSelectIssue: (issueId: string) => void;
    formatRelativeTime: (value: string) => string;
    onViewAll?: () => void;
    variant?: 'default' | 'enterprise';
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

function TopIssuesSkeleton({ variant }: { variant: 'default' | 'enterprise' }) {
    return (
        <div className="space-y-3 animate-pulse p-4">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={`space-y-2 p-4 ${
                        variant === 'enterprise'
                            ? 'enterprise-panel-soft rounded-[20px] border border-[var(--enterprise-border)]'
                            : 'dash-card-inner'
                    }`}
                >
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
    formatRelativeTime,
    onViewAll,
    variant = 'default',
}: TopIssuesCardProps) {
    const isEnterprise = variant === 'enterprise';

    return (
        <DashboardSectionCard
            title="Top Issues"
            description={
                isEnterprise
                    ? 'Issues with the highest event pressure in the active window.'
                    : undefined
            }
            action={
                <button
                    type="button"
                    onClick={onViewAll}
                    className={`cursor-pointer text-xs transition-colors ${
                        isEnterprise
                            ? 'text-[var(--enterprise-text-muted)] hover:text-white'
                            : 'text-[var(--dash-text-muted)] hover:text-white'
                    }`}
                >
                    View All
                </button>
            }
            contentClassName={
                isEnterprise
                    ? 'max-h-[700px] space-y-3 overflow-y-auto p-4 scrollbar-hidden'
                    : 'p-3 space-y-3 max-h-[460px] overflow-y-auto scrollbar-hidden'
            }
            variant={variant}
        >
            {loading ? (
                <TopIssuesSkeleton variant={variant} />
            ) : issues.length === 0 ? (
                <div
                    className={`py-10 text-center text-sm ${
                        isEnterprise
                            ? 'text-[var(--enterprise-text-dim)]'
                            : 'text-[var(--dash-text-dim)]'
                    }`}
                >
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
                            className={`w-full cursor-pointer text-left transition-all ${
                                isEnterprise
                                    ? 'enterprise-panel-soft rounded-[20px] border border-[var(--enterprise-border)] p-4 hover:border-orange-500/30 hover:bg-[#18110d]'
                                    : 'dash-card-inner p-4 hover:border-white/10 hover:bg-[#1a1a28]'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={badgeClass}>{severity}</span>
                                    {issue.isRegression ? (
                                        <span className="enterprise-chip text-[10px] tracking-[0.18em]">
                                            Regression
                                        </span>
                                    ) : null}
                                </div>
                                <span
                                    className={`text-xs tabular-nums ${
                                        isEnterprise
                                            ? 'text-[var(--enterprise-text-dim)]'
                                            : 'text-[var(--dash-text-dim)]'
                                    }`}
                                >
                                    {issueNum}
                                </span>
                            </div>
                            <div className="mt-3 text-sm font-semibold leading-snug text-white sm:text-[15px]">
                                {issue.title}
                            </div>
                            <div
                                className={`mt-2 truncate font-mono text-xs ${
                                    isEnterprise
                                        ? 'text-[var(--enterprise-text-dim)]'
                                        : 'text-[var(--dash-text-dim)]'
                                }`}
                            >
                                {source}
                            </div>
                            <div className="mt-4 flex items-end justify-between gap-4">
                                <div className="space-y-1">
                                    <div
                                        className={`text-[11px] uppercase tracking-[0.18em] ${
                                            isEnterprise
                                                ? 'text-[var(--enterprise-text-dim)]'
                                                : 'text-[var(--dash-text-dim)]'
                                        }`}
                                    >
                                        Last seen
                                    </div>
                                    <div
                                        className={`text-xs ${
                                            isEnterprise
                                                ? 'text-[var(--enterprise-text-muted)]'
                                                : 'text-[var(--dash-text-muted)]'
                                        }`}
                                    >
                                        {formatRelativeTime(issue.lastSeenAt)}
                                    </div>
                                </div>
                                <span className="text-right text-lg font-bold text-white tabular-nums sm:text-2xl">
                                    {formatEventCount(issue.eventCount)}
                                    <span
                                        className={`ml-1.5 text-xs font-normal ${
                                            isEnterprise
                                                ? 'text-[var(--enterprise-text-muted)]'
                                                : 'text-[var(--dash-text-muted)]'
                                        }`}
                                    >
                                        events
                                    </span>
                                </span>
                            </div>
                        </button>
                    );
                })
            )}
        </DashboardSectionCard>
    );
}
