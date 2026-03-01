import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

type IssueStatus = 'all' | 'open' | 'resolved' | 'ignored';

type ErrorGroup = {
    id: string;
    fingerprint: string;
    title: string;
    status: string;
    eventCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
};

const PAGE_LIMIT = 20;

export default function IssuesPage() {
    const navigate = useNavigate();
    const [issues, setIssues] = useState<ErrorGroup[]>([]);
    const [statusFilter, setStatusFilter] = useState<IssueStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Debounce search input
    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedQuery(value);
        }, 300);
    }, []);

    const buildEndpoint = (currentOffset: number) => {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim());
        params.set('limit', String(PAGE_LIMIT));
        params.set('offset', String(currentOffset));
        const qs = params.toString();
        return `/groups${qs ? `?${qs}` : ''}`;
    };

    const fetchIssues = async (append = false) => {
        const currentOffset = append ? offset : 0;
        if (append) setLoadingMore(true); else setLoading(true);
        setError(null);
        try {
            const data = await apiFetch(buildEndpoint(currentOffset));
            if (data.ok) {
                const groups = data.groups || [];
                if (append) {
                    setIssues(prev => [...prev, ...groups]);
                } else {
                    setIssues(groups);
                }
                setHasMore(data.page?.hasMore ?? false);
                setOffset(currentOffset + groups.length);
            } else {
                setError(data.error || 'Failed to fetch issues');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Refetch on filter or search change
    useEffect(() => {
        setOffset(0);
        fetchIssues(false);
    }, [statusFilter, debouncedQuery]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                            Smart Error Tracker
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">Issues</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <nav className="flex gap-2 mr-4">
                            <button
                                onClick={() => navigate('/')}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Overview
                            </button>
                            <span className="px-4 py-2 text-sm font-medium text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                                Issues
                            </span>
                        </nav>
                        <button
                            onClick={() => fetchIssues(false)}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            )}
                            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Search + Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="text"
                            placeholder="Search issues..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-1 p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-lg w-max shrink-0">
                        {(['all', 'open', 'resolved', 'ignored'] as IssueStatus[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-200 ${statusFilter === status
                                    ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {error ? (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6 flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div className="text-red-800 dark:text-red-200">
                            <h3 className="font-semibold mb-1">Error Loading Issues</h3>
                            <p className="text-sm opacity-90">{error}</p>
                        </div>
                    </div>
                ) : loading && issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        <svg className="animate-spin h-8 w-8 mb-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        <p>Loading issues...</p>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-800/10">
                        <svg className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-1">
                            {debouncedQuery ? `No results for "${debouncedQuery}"` : `No issues ${statusFilter !== 'all' ? `marked as ${statusFilter}` : 'yet'}`}
                        </h3>
                        <p className="text-sm">Everything is running smoothly right now.</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                            <ul className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {issues.map((issue) => (
                                    <li key={issue.id} onClick={() => navigate(`/issues/${issue.id}`)} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group cursor-pointer">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <h2 className="text-lg font-semibold truncate text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {issue.title}
                                                    </h2>
                                                    {issue.status === 'open' && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30">Open</span>}
                                                    {issue.status === 'resolved' && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">Resolved</span>}
                                                    {issue.status === 'ignored' && <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border border-slate-200 dark:border-slate-500/30">Ignored</span>}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">{issue.eventCount}</span> events
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        {formatDate(issue.lastSeenAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={() => fetchIssues(true)}
                                    disabled={loadingMore}
                                    className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loadingMore ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    ) : null}
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
