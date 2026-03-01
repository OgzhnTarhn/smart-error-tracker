import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getGroupDetail, setGroupStatus, type StatusAction } from '../lib/api';

type EventItem = {
    id: string;
    message: string;
    stack: string | null;
    context: any;
    createdAt: string;
};

type GroupDetail = {
    id: string;
    fingerprint: string;
    title: string;
    status: string;
    eventCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
};

type EventTab = 'stack' | 'context' | 'raw';

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

export default function IssueDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
    const [activeTab, setActiveTab] = useState<EventTab>('stack');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchDetail = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getGroupDetail(id);
            if (data.ok) {
                setGroup(data.group);
                setEvents(data.events || []);
                if (data.events?.length > 0) {
                    setSelectedEvent(data.events[0]);
                }
            } else {
                setError(data.error || 'Failed to load');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDetail(); }, [id]);

    const handleAction = async (action: StatusAction) => {
        if (!id) return;
        setActionLoading(action);
        try {
            const data = await setGroupStatus(id, action);
            if (data.ok && data.group) {
                setGroup(prev => prev ? { ...prev, status: data.group.status, lastSeenAt: data.group.lastSeenAt, eventCount: data.group.eventCount } : prev);
            }
        } catch { }
        setActionLoading(null);
    };

    const copyFingerprint = async () => {
        if (!group) return;
        await navigator.clipboard.writeText(group.fingerprint);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // --- Loading skeleton ---
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-6 animate-pulse" />
                    <div className="h-8 w-80 bg-slate-200 dark:bg-slate-700 rounded mb-8 animate-pulse" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                        </div>
                        <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // --- Error state ---
    if (error || !group) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        {error === 'not_found' ? 'Issue Not Found' : 'Error Loading Issue'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
                    <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back to Issues
                    </Link>
                </div>
            </div>
        );
    }

    const statusBadge = () => {
        const map: Record<string, string> = {
            open: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30',
            resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
            ignored: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-300 dark:border-slate-500/30',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${map[group.status] || map.open}`}>
                {group.status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                <div className="max-w-6xl mx-auto px-8 py-5">
                    <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Issues
                    </Link>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <h1 className="text-2xl font-bold truncate">{group.title}</h1>
                            {statusBadge()}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {group.status === 'open' && (
                                <>
                                    <button onClick={() => handleAction('resolve')} disabled={!!actionLoading}
                                        className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                        {actionLoading === 'resolve' ? <Spinner /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                                        Resolve
                                    </button>
                                    <button onClick={() => handleAction('ignore')} disabled={!!actionLoading}
                                        className="px-4 py-2 text-sm font-medium bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                        {actionLoading === 'ignore' ? <Spinner /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
                                        Ignore
                                    </button>
                                </>
                            )}
                            {(group.status === 'resolved' || group.status === 'ignored') && (
                                <button onClick={() => handleAction('open')} disabled={!!actionLoading}
                                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    {actionLoading === 'open' ? <Spinner /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                                    Reopen
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Body: 2 columns */}
            <div className="max-w-6xl mx-auto px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left column (2/5) */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Overview card */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overview</h2>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                <Row label="Status"><span className="capitalize font-medium">{group.status}</span></Row>
                                <Row label="Events"><span className="font-semibold text-lg">{group.eventCount}</span></Row>
                                <Row label="First seen">{formatDate(group.firstSeenAt)}</Row>
                                <Row label="Last seen">{formatDate(group.lastSeenAt)}</Row>
                                <div className="px-5 py-3">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Fingerprint</div>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded break-all flex-1">{group.fingerprint}</code>
                                        <button onClick={copyFingerprint} className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Copy fingerprint">
                                            {copied ? (
                                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Events list card */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Latest Events ({events.length})</h2>
                            </div>
                            {events.length === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-slate-400">No events recorded</div>
                            ) : (
                                <ul className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {events.map((ev) => (
                                        <li key={ev.id}
                                            onClick={() => setSelectedEvent(ev)}
                                            className={`px-5 py-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${selectedEvent?.id === ev.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''}`}>
                                            <div className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{formatDate(ev.createdAt)}</div>
                                            <div className="text-sm truncate">{ev.message}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Right column (3/5): Event detail */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden sticky top-6">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Event Detail</h2>
                                {selectedEvent && <span className="text-xs text-slate-400 font-mono">{selectedEvent.id.slice(0, 12)}…</span>}
                            </div>

                            {!selectedEvent ? (
                                <div className="px-5 py-12 text-center text-sm text-slate-400">Select an event from the list</div>
                            ) : (
                                <>
                                    {/* Tabs */}
                                    <div className="flex gap-1 px-5 pt-4 pb-2">
                                        {(['stack', 'context', 'raw'] as EventTab[]).map((tab) => (
                                            <button key={tab} onClick={() => setActiveTab(tab)}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all duration-150 ${activeTab === tab
                                                    ? 'bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                                    }`}>
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab content */}
                                    <div className="px-5 pb-5">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-auto max-h-[500px]">
                                            {activeTab === 'stack' && (
                                                <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
                                                    {selectedEvent.stack || 'No stack trace available'}
                                                </pre>
                                            )}
                                            {activeTab === 'context' && (
                                                <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
                                                    {selectedEvent.context ? JSON.stringify(selectedEvent.context, null, 2) : 'No context available'}
                                                </pre>
                                            )}
                                            {activeTab === 'raw' && (
                                                <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300">
                                                    {JSON.stringify(selectedEvent, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Helper components
function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-5 py-3 flex justify-between items-center">
            <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
            <span className="text-sm text-slate-900 dark:text-slate-100">{children}</span>
        </div>
    );
}

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}
