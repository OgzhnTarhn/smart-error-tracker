import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardNavbar from '../components/layout/DashboardNavbar';
import IssueFilterBar from '../components/issues/IssueFilterBar';
import IssueLevelBadge from '../components/issues/IssueLevelBadge';
import IssueMetaRow from '../components/issues/IssueMetaRow';
import IssueRegressionBadge from '../components/issues/IssueRegressionBadge';
import IssueStatusBadge from '../components/issues/IssueStatusBadge';
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
    if (filters.environment !== 'all') {
        params.set('environment', filters.environment);
    }
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

export default function IssuesPage() {
    const navigate = useNavigate();
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
                    status:
                        activeFilters.status === 'all'
                            ? undefined
                            : activeFilters.status,
                    environment:
                        activeFilters.environment === 'all'
                            ? undefined
                            : activeFilters.environment,
                    level:
                        activeFilters.level === 'all'
                            ? undefined
                            : activeFilters.level,
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
        setOffset(0);
        void fetchIssues(false, 0, filters);
    }, [fetchIssues, filters]);

    useEffect(() => {
        let active = true;

        const loadFilterMetadata = async () => {
            try {
                const data = await getGroupFilters();
                if (!active || !data.ok) return;

                setEnvironmentOptions(
                    mergeUniqueSorted([], data.environments ?? []),
                );
                setReleaseOptions(mergeUniqueSorted([], data.releases ?? []));
            } catch {
                // Fallback stays on values derived from issue list.
            }
        };

        void loadFilterMetadata();
        return () => {
            active = false;
        };
    }, []);

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

    const handleRefresh = () => {
        const activeFilters: IssueFilters = {
            ...filters,
            search: searchInput.trim(),
        };
        void fetchIssues(false, 0, activeFilters);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <DashboardNavbar />
            <header className="border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            Smart Error Tracker
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Issues</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <svg
                                    className="animate-spin h-5 w-5 text-slate-400"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="w-5 h-5 text-slate-300"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                            )}
                            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
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
                />

                {error ? (
                    <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl mb-6 flex items-start gap-3">
                        <svg
                            className="w-5 h-5 text-red-400 mt-0.5 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div className="text-red-100">
                            <h3 className="font-semibold mb-1">Error Loading Issues</h3>
                            <p className="text-sm opacity-90">{error}</p>
                        </div>
                    </div>
                ) : loading && issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                        <svg
                            className="animate-spin h-8 w-8 mb-4 text-blue-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        <p>Loading issues...</p>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-800/10">
                        <svg
                            className="w-12 h-12 mb-4 text-slate-600"
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
                        <h3 className="text-lg font-medium text-slate-200 mb-1">
                            {hasActiveFilters
                                ? 'No issues found for the selected filters'
                                : 'No issues yet'}
                        </h3>
                        <p className="text-sm">
                            {hasActiveFilters
                                ? 'Try adjusting filters or clearing the search input.'
                                : 'Everything is running smoothly right now.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                            <ul className="divide-y divide-slate-700/60">
                                {issues.map((issue) => (
                                    <li
                                        key={issue.id}
                                        onClick={() => navigate(`/issues/${issue.id}`)}
                                        className="p-5 hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start gap-3">
                                                    <h2 className="text-lg font-semibold truncate text-slate-100 group-hover:text-blue-400 transition-colors">
                                                        {issue.title}
                                                    </h2>
                                                    <IssueStatusBadge status={issue.status} />
                                                    <IssueRegressionBadge
                                                        isRegression={issue.isRegression}
                                                        regressionCount={issue.regressionCount}
                                                    />
                                                </div>

                                                <IssueMetaRow
                                                    firstSeenAt={issue.firstSeenAt}
                                                    lastSeenAt={issue.lastSeenAt}
                                                    formatDate={formatDate}
                                                    formatRelativeTime={formatRelativeTime}
                                                />

                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    {issue.environment && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-300 border border-violet-500/30">
                                                            {issue.environment}
                                                        </span>
                                                    )}
                                                    {issue.releaseVersion && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                                            {issue.releaseVersion}
                                                        </span>
                                                    )}
                                                    <IssueLevelBadge level={issue.level} />
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                <div className="text-2xl font-semibold text-slate-100">
                                                    {issue.eventCount.toLocaleString()}
                                                </div>
                                                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                                                    events
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {hasMore && (
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={() => void fetchIssues(true, offset, filters)}
                                    disabled={loadingMore}
                                    className="px-6 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loadingMore && (
                                        <svg
                                            className="animate-spin h-4 w-4"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                    )}
                                    {loadingMore ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
