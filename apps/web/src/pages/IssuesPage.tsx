import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import OverviewMetricCard from '../components/dashboard/OverviewMetricCard';
import IssueFilterBar from '../components/issues/IssueFilterBar';
import IssueLevelBadge from '../components/issues/IssueLevelBadge';
import IssueRegressionBadge from '../components/issues/IssueRegressionBadge';
import IssueStatusBadge from '../components/issues/IssueStatusBadge';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import type {
    IssueFilters,
    IssueLevelFilter,
    IssueListItem,
    IssueStatusFilter,
} from '../components/issues/types';
import { getGroupFilters, getGroups } from '../lib/api';

const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 320;

const STATUS_FILTER_VALUES: readonly IssueStatusFilter[] = [
    'all',
    'open',
    'resolved',
    'ignored',
];
const LEVEL_FILTER_VALUES: readonly IssueLevelFilter[] = [
    'all',
    'error',
    'warn',
    'info',
];

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});
const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
});

function isAllowedFilterValue<T extends string>(
    value: string | null,
    allowed: readonly T[],
): value is T {
    return value !== null && allowed.includes(value as T);
}

function normalizeSelectValue(value: string | null): string {
    const normalized = value?.trim();
    return normalized ? normalized : 'all';
}

function parseFiltersFromParams(params: URLSearchParams): IssueFilters {
    const statusParam = params.get('status');
    const levelParam = params.get('level');
    const search = (params.get('search') ?? params.get('q') ?? '').trim();

    return {
        search,
        status: isAllowedFilterValue(statusParam, STATUS_FILTER_VALUES)
            ? statusParam
            : 'all',
        environment: normalizeSelectValue(params.get('environment')),
        level: isAllowedFilterValue(levelParam, LEVEL_FILTER_VALUES)
            ? levelParam
            : 'all',
        release: normalizeSelectValue(params.get('release')),
    };
}

function buildQueryParams(filters: IssueFilters): URLSearchParams {
    const params = new URLSearchParams();

    if (filters.search) params.set('search', filters.search);
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.environment !== 'all') params.set('environment', filters.environment);
    if (filters.level !== 'all') params.set('level', filters.level);
    if (filters.release !== 'all') params.set('release', filters.release);

    return params;
}

function mergeUniqueSorted(
    existing: string[],
    incoming: Array<string | null | undefined>,
): string[] {
    const values = new Set(existing);
    for (const value of incoming) {
        const normalized = value?.trim();
        if (normalized) values.add(normalized);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return DATE_FORMATTER.format(date);
}

function formatRelativeTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    const diffMs = date.getTime() - Date.now();
    const absDiff = Math.abs(diffMs);
    const units: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
        { unit: 'day', ms: 86_400_000 },
        { unit: 'hour', ms: 3_600_000 },
        { unit: 'minute', ms: 60_000 },
    ];

    for (const { unit, ms } of units) {
        if (absDiff >= ms || unit === 'minute') {
            const amount = Math.round(diffMs / ms);
            return RELATIVE_FORMATTER.format(amount, unit);
        }
    }

    return 'just now';
}

function formatFingerprint(value: string) {
    if (value.length <= 72) return value;
    return `${value.slice(0, 68)}...`;
}

function RefreshButton({
    loading,
    onClick,
}: {
    loading: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-[#303030] bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-200 hover:text-white disabled:opacity-50"
        >
            {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
            ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            )}
            {loading ? 'Refreshing...' : 'Refresh'}
        </button>
    );
}

function IssuesLoadingState() {
    return (
        <DashboardSectionCard
            title="Issue Stream"
            description="Loading issue groups from the current project."
            contentClassName="p-5"
            variant="enterprise"
        >
            <div className="space-y-3 animate-pulse">
                {[0, 1, 2].map((index) => (
                    <div
                        key={index}
                        className="enterprise-panel-soft rounded-[24px] border border-[var(--enterprise-border)] p-5"
                    >
                        <div className="h-4 w-20 rounded bg-white/6" />
                        <div className="mt-4 h-6 w-2/3 rounded bg-white/7" />
                        <div className="mt-3 h-4 w-1/2 rounded bg-white/6" />
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <div className="h-10 rounded-xl bg-white/6" />
                            <div className="h-10 rounded-xl bg-white/6" />
                            <div className="h-10 rounded-xl bg-white/6" />
                        </div>
                    </div>
                ))}
            </div>
        </DashboardSectionCard>
    );
}

function IssuesEmptyState({
    hasActiveFilters,
}: {
    hasActiveFilters: boolean;
}) {
    return (
        <DashboardSectionCard
            title="Issue Stream"
            description="No issue groups matched the current workspace view."
            contentClassName="p-5"
            variant="enterprise"
        >
            <div className="enterprise-panel-muted flex flex-col items-center justify-center rounded-[20px] py-24 text-center">
                <svg
                    className="mb-4 h-12 w-12 text-[var(--enterprise-text-dim)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                    {hasActiveFilters ? 'No issues found for the selected filters' : 'No issues yet'}
                </h3>
                <p className="mt-2 max-w-xl text-sm text-[var(--enterprise-text-muted)]">
                    {hasActiveFilters
                        ? 'Try widening the filter workspace or clearing the search term.'
                        : 'Everything is running smoothly right now.'}
                </p>
            </div>
        </DashboardSectionCard>
    );
}

function IssueListCard({
    issue,
    onOpen,
}: {
    issue: IssueListItem;
    onOpen: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="enterprise-panel-soft w-full rounded-[24px] border border-[var(--enterprise-border)] p-5 text-left transition-all hover:border-orange-500/30 hover:bg-[#18110d]"
        >
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <IssueStatusBadge status={issue.status} variant="enterprise" />
                        <IssueRegressionBadge
                            isRegression={issue.isRegression}
                            regressionCount={issue.regressionCount}
                            variant="enterprise"
                        />
                        <IssueLevelBadge level={issue.level} variant="enterprise" />
                    </div>

                    <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
                        {issue.title}
                    </h2>

                    <div className="mt-3 rounded-xl border border-[var(--enterprise-border)] bg-[#090909] px-4 py-3 font-mono text-xs text-[var(--enterprise-text-muted)]">
                        {formatFingerprint(issue.fingerprint)}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        {issue.environment ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                                {issue.environment}
                            </span>
                        ) : null}
                        {issue.releaseVersion ? (
                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 font-mono text-xs text-blue-200">
                                {issue.releaseVersion}
                            </span>
                        ) : null}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-sm">
                        <div className="enterprise-panel-muted min-w-[180px] px-4 py-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                Last seen
                            </div>
                            <div className="mt-1 text-sm font-medium text-white">
                                {formatRelativeTime(issue.lastSeenAt)}
                            </div>
                            <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                {formatDate(issue.lastSeenAt)}
                            </div>
                        </div>
                        <div className="enterprise-panel-muted min-w-[180px] px-4 py-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                First seen
                            </div>
                            <div className="mt-1 text-sm font-medium text-white">
                                {formatDate(issue.firstSeenAt)}
                            </div>
                            <div className="mt-1 text-xs text-[var(--enterprise-text-muted)]">
                                Tracked in this issue group.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 items-end justify-between gap-4 xl:min-w-[180px] xl:flex-col xl:items-end">
                    <div className="text-right">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                            Event count
                        </div>
                        <div className="mt-2 text-[2.15rem] font-semibold tracking-tight text-white tabular-nums">
                            {issue.eventCount.toLocaleString()}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-300">
                        Open investigation
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </button>
    );
}

export default function IssuesPage() {
    const navigate = useNavigate();
    const { project: connectedProject, hasApiKey } = useDashboardProjectContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchParamsKey = searchParams.toString();

    const [issues, setIssues] = useState<IssueListItem[]>([]);
    const [searchInput, setSearchInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [environmentOptions, setEnvironmentOptions] = useState<string[]>([]);
    const [releaseOptions, setReleaseOptions] = useState<string[]>([]);
    const requestIdRef = useRef(0);

    const filters = useMemo(
        () => parseFiltersFromParams(new URLSearchParams(searchParamsKey)),
        [searchParamsKey],
    );

    useEffect(() => {
        setSearchInput(filters.search);
    }, [filters.search]);

    const updateFilters = useCallback(
        (patch: Partial<IssueFilters>) => {
            const nextFilters: IssueFilters = { ...filters, ...patch };
            const nextParams = buildQueryParams(nextFilters);
            if (nextParams.toString() !== searchParamsKey) {
                setSearchParams(nextParams, { replace: true });
            }
        },
        [filters, searchParamsKey, setSearchParams],
    );

    useEffect(() => {
        const timeout = setTimeout(() => {
            const normalizedSearch = searchInput.trim();
            if (normalizedSearch !== filters.search) {
                updateFilters({ search: normalizedSearch });
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeout);
    }, [searchInput, filters.search, updateFilters]);

    const fetchIssues = useCallback(
        async (append: boolean, currentOffset: number, activeFilters: IssueFilters) => {
            const requestId = ++requestIdRef.current;
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            setError(null);

            try {
                const data = await getGroups({
                    search: activeFilters.search || undefined,
                    status: activeFilters.status === 'all' ? undefined : activeFilters.status,
                    environment:
                        activeFilters.environment === 'all'
                            ? undefined
                            : activeFilters.environment,
                    level: activeFilters.level === 'all' ? undefined : activeFilters.level,
                    release:
                        activeFilters.release === 'all'
                            ? undefined
                            : activeFilters.release,
                    limit: PAGE_LIMIT,
                    offset: currentOffset,
                });
                if (requestId !== requestIdRef.current) return;

                if (data.ok) {
                    const groups: IssueListItem[] = data.groups ?? [];
                    setIssues((prev) => (append ? [...prev, ...groups] : groups));
                    setHasMore(data.page?.hasMore ?? false);
                    setOffset(currentOffset + groups.length);
                    setEnvironmentOptions((prev) =>
                        mergeUniqueSorted(
                            prev,
                            groups.map((group) => group.environment),
                        ),
                    );
                    setReleaseOptions((prev) =>
                        mergeUniqueSorted(
                            prev,
                            groups.map((group) => group.releaseVersion),
                        ),
                    );
                } else {
                    setError(data.error ?? 'Failed to fetch issues');
                    if (!append) setIssues([]);
                    setHasMore(false);
                }
            } catch (err: unknown) {
                if (requestId !== requestIdRef.current) return;

                setError(err instanceof Error ? err.message : 'An error occurred');
                if (!append) setIssues([]);
                setHasMore(false);
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [],
    );

    useEffect(() => {
        if (!hasApiKey) {
            setIssues([]);
            setHasMore(false);
            setOffset(0);
            setLoading(false);
            setLoadingMore(false);
            setError(null);
            return;
        }

        setOffset(0);
        void fetchIssues(false, 0, filters);
    }, [fetchIssues, filters, hasApiKey]);

    useEffect(() => {
        if (!hasApiKey) {
            setEnvironmentOptions([]);
            setReleaseOptions([]);
            return;
        }

        let active = true;

        const loadFilterMetadata = async () => {
            try {
                const data = await getGroupFilters();
                if (!active || !data.ok) return;

                setEnvironmentOptions(mergeUniqueSorted([], data.environments ?? []));
                setReleaseOptions(mergeUniqueSorted([], data.releases ?? []));
            } catch {
                // Fallback stays on values derived from issue list.
            }
        };

        void loadFilterMetadata();
        return () => {
            active = false;
        };
    }, [hasApiKey]);

    const projectLabel = connectedProject?.name ?? (hasApiKey ? 'Connected project' : 'No project connected');

    const environmentSelectOptions = useMemo(
        () =>
            mergeUniqueSorted(
                environmentOptions,
                filters.environment === 'all' ? [] : [filters.environment],
            ),
        [environmentOptions, filters.environment],
    );

    const releaseSelectOptions = useMemo(
        () =>
            mergeUniqueSorted(
                releaseOptions,
                filters.release === 'all' ? [] : [filters.release],
            ),
        [filters.release, releaseOptions],
    );

    const hasActiveFilters =
        Boolean(filters.search) ||
        filters.status !== 'all' ||
        filters.environment !== 'all' ||
        filters.level !== 'all' ||
        filters.release !== 'all';

    const activeFilterCount = [
        Boolean(searchInput.trim()),
        filters.status !== 'all',
        filters.environment !== 'all',
        filters.level !== 'all',
        filters.release !== 'all',
    ].filter(Boolean).length;

    const visibleOpenCount = issues.filter((issue) => issue.status === 'open').length;
    const visibleRegressionCount = issues.filter((issue) => issue.isRegression).length;
    const visibleEventCount = issues.reduce((sum, issue) => sum + issue.eventCount, 0);

    const handleRefresh = () => {
        if (!hasApiKey) {
            navigate('/dashboard');
            return;
        }

        const activeFilters: IssueFilters = {
            ...filters,
            search: searchInput.trim(),
        };
        void fetchIssues(false, 0, activeFilters);
    };

    const clearFilters = () => {
        setSearchInput('');
        setSearchParams(new URLSearchParams(), { replace: true });
    };

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="issues" projectName={connectedProject?.name} />

            <main className="mx-auto max-w-[1480px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="enterprise-chip">Issues</span>
                                <span className="text-xs text-[var(--enterprise-text-muted)]">
                                    {hasApiKey
                                        ? `Search, triage, and inspect issue groups for ${projectLabel}`
                                        : 'Connect a project from the dashboard before viewing issues'}
                                </span>
                                <span className="text-xs text-[var(--enterprise-text-dim)]">
                                    {hasApiKey
                                        ? hasActiveFilters
                                            ? `${activeFilterCount} filters active`
                                            : 'All issues visible'
                                        : 'Project connection required'}
                                </span>
                            </div>
                            <h1 className="mt-4 max-w-5xl text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                                Issue Command Center
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Review incoming issue groups, focus regressions, and jump directly into the
                                investigation view without leaving the shared enterprise workspace.
                            </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            <RefreshButton loading={loading} onClick={handleRefresh} />
                        </div>
                    </div>
                </section>

                {!hasApiKey ? (
                    <DashboardSectionCard
                        title="Connect A Project First"
                        description="The issue workspace is project-scoped. Start from the main dashboard, create or connect a project API key, then return here."
                        contentClassName="p-5"
                        variant="enterprise"
                    >
                        <div className="enterprise-panel-muted flex flex-col items-start gap-4 rounded-[20px] p-6">
                            <div className="max-w-2xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                No dashboard API key is configured right now, so there is no real
                                project context to inspect.
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="rounded-full border border-orange-400/20 bg-orange-500/15 px-5 py-3 text-sm font-semibold text-orange-100 transition-colors hover:border-orange-400/30 hover:bg-orange-500/20"
                            >
                                Open Main Dashboard
                            </button>
                        </div>
                    </DashboardSectionCard>
                ) : null}

                {hasApiKey ? (
                    <>
                        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <OverviewMetricCard
                                label="Visible Issues"
                                value={issues.length}
                                accentClass="enterprise-metric-accent-orange"
                                loading={loading && issues.length === 0}
                                variant="enterprise"
                            />
                            <OverviewMetricCard
                                label="Open Visible"
                                value={visibleOpenCount}
                                accentClass="enterprise-metric-accent-red"
                                loading={loading && issues.length === 0}
                                variant="enterprise"
                            />
                            <OverviewMetricCard
                                label="Regressions"
                                value={visibleRegressionCount}
                                accentClass="enterprise-metric-accent-blue"
                                loading={loading && issues.length === 0}
                                variant="enterprise"
                            />
                            <OverviewMetricCard
                                label="Visible Events"
                                value={visibleEventCount}
                                accentClass="enterprise-metric-accent-green"
                                loading={loading && issues.length === 0}
                                variant="enterprise"
                            />
                        </div>

                        <div className="mt-6">
                            <IssueFilterBar
                                searchValue={searchInput}
                                onSearchChange={setSearchInput}
                                status={filters.status}
                                onStatusChange={(status) =>
                                    updateFilters({ status, search: searchInput.trim() })
                                }
                                environment={filters.environment}
                                onEnvironmentChange={(environment) =>
                                    updateFilters({ environment, search: searchInput.trim() })
                                }
                                level={filters.level}
                                onLevelChange={(level) =>
                                    updateFilters({ level, search: searchInput.trim() })
                                }
                                release={filters.release}
                                onReleaseChange={(release) =>
                                    updateFilters({ release, search: searchInput.trim() })
                                }
                                environmentOptions={environmentSelectOptions}
                                releaseOptions={releaseSelectOptions}
                                onClearFilters={clearFilters}
                                activeFilterCount={activeFilterCount}
                                resultCountLabel={`${issues.length} loaded`}
                                variant="enterprise"
                            />
                        </div>
                    </>
                ) : null}

                {hasApiKey && error ? (
                    <div className="enterprise-panel mb-6 border-l-4 border-l-amber-500 px-5 py-4">
                        <div className="flex items-start gap-3">
                            <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-amber-100">
                                {issues.length > 0
                                    ? `${error}. Showing the last loaded issue set.`
                                    : `${error}. No issues are available right now.`}
                            </div>
                        </div>
                    </div>
                ) : null}

                {hasApiKey && loading && issues.length === 0 ? (
                    <IssuesLoadingState />
                ) : hasApiKey && issues.length === 0 ? (
                    <IssuesEmptyState hasActiveFilters={hasActiveFilters} />
                ) : hasApiKey ? (
                    <DashboardSectionCard
                        title="Issue Stream"
                        description="Prioritized issue groups ordered by the current API response."
                        action={<span className="enterprise-chip">{issues.length} groups</span>}
                        contentClassName="p-4 sm:p-5"
                        variant="enterprise"
                    >
                        <div className="space-y-3">
                            {issues.map((issue) => (
                                <IssueListCard
                                    key={issue.id}
                                    issue={issue}
                                    onOpen={() => navigate(`/issues/${issue.id}`)}
                                />
                            ))}
                        </div>
                    </DashboardSectionCard>
                ) : null}

                {hasApiKey && hasMore ? (
                    <div className="mt-6 flex justify-center">
                        <button
                            type="button"
                            onClick={() => void fetchIssues(true, offset, filters)}
                            disabled={loadingMore}
                            className="flex items-center gap-2 rounded-xl border border-[#303030] bg-transparent px-6 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-200 hover:text-white disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                            ) : null}
                            {loadingMore ? 'Loading more...' : 'Load more issues'}
                        </button>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
