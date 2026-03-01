import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getGroupDetail, setGroupStatus, type StatusAction, analyzeEvent } from '../lib/api';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import ReactMarkdown from 'react-markdown';

type EventItem = {
    id: string;
    message: string;
    stack: string | null;
    context: any;
    environment: string | null;
    releaseVersion: string | null;
    level: string | null;
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
    aiAnalysis?: {
        rootCause: string;
        suggestedFix: string;
        severity: string;
    };
};

type EventTab = 'stack' | 'context' | 'raw' | 'ai';

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const levelColor: Record<string, string> = {
    error: 'text-red-400 bg-red-500/10 border-red-500/30',
    warn: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const statusColor: Record<string, string> = {
    open: 'text-red-400 bg-red-500/10 border-red-500/30',
    resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    ignored: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

// ─── Helper: build mini timeline from events ─────────────
function buildTimeline(events: EventItem[]) {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let d = 6; d >= 0; d--) {
        const dt = new Date(now);
        dt.setDate(dt.getDate() - d);
        map[dt.toISOString().slice(0, 10)] = 0;
    }
    for (const ev of events) {
        const key = new Date(ev.createdAt).toISOString().slice(0, 10);
        if (key in map) map[key]++;
    }
    return Object.entries(map).map(([date, count]) => ({
        date: new Date(date + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
        count,
    }));
}

// ─── Helper: parse context into key-value pairs ──────────
function parseContext(ctx: any): Array<{ key: string; value: string }> {
    if (!ctx || typeof ctx !== 'object') return [];
    return Object.entries(ctx).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? JSON.stringify(val) : String(val),
    }));
}

export default function IssueDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [events, setEvents] = useState<EventItem[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
    const [activeTab, setActiveTab] = useState<EventTab>('ai');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [stackCopied, setStackCopied] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);

    const fetchDetail = async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getGroupDetail(id);
            if (data.ok) {
                setGroup(data.group);
                setEvents(data.events || []);
                if (data.events?.length > 0) setSelectedEvent(data.events[0]);
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

    const copyStackTrace = async () => {
        if (!selectedEvent?.stack) return;
        await navigator.clipboard.writeText(selectedEvent.stack);
        setStackCopied(true);
        setTimeout(() => setStackCopied(false), 2000);
    };

    const handleAnalyze = async () => {
        if (!selectedEvent?.id || !group) return;
        setAiAnalyzing(true);
        try {
            const data = await analyzeEvent(selectedEvent.id);
            if (data.ok && data.aiAnalysis) {
                setGroup({ ...group, aiAnalysis: data.aiAnalysis });
            } else {
                alert(data.error || 'AI Analysis failed');
            }
        } catch (err: any) {
            alert(err.message || 'AI Analysis failed');
        } finally {
            setAiAnalyzing(false);
        }
    };

    // Loading
    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    // Error
    if (error || !group) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h2 className="text-xl font-semibold text-slate-100 mb-2">
                    {error === 'not_found' ? 'Issue Not Found' : 'Error Loading Issue'}
                </h2>
                <p className="text-slate-400 mb-6">{error}</p>
                <Link to="/issues" className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                    ← Back to Issues
                </Link>
            </div>
        </div>
    );

    const timeline = buildTimeline(events);
    const contextPairs = selectedEvent ? parseContext(selectedEvent.context) : [];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            {/* Header */}
            <header className="border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            onClick={() => navigate('/issues')}
                            className="shrink-0 p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold truncate">{group.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusColor[group.status] || statusColor.open}`}>
                                    {group.status}
                                </span>
                                <span className="text-xs text-slate-500">{group.eventCount} events</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        {group.status === 'open' && (
                            <>
                                <button onClick={() => handleAction('resolve')} disabled={!!actionLoading}
                                    className="px-4 py-2 text-sm font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading === 'resolve' ? <Spinner /> : '✅'} Resolve
                                </button>
                                <button onClick={() => handleAction('ignore')} disabled={!!actionLoading}
                                    className="px-4 py-2 text-sm font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {actionLoading === 'ignore' ? <Spinner /> : '🔕'} Ignore
                                </button>
                            </>
                        )}
                        {(group.status === 'resolved' || group.status === 'ignored') && (
                            <button onClick={() => handleAction('open')} disabled={!!actionLoading}
                                className="px-4 py-2 text-sm font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 flex items-center gap-2">
                                {actionLoading === 'open' ? <Spinner /> : '🔄'} Reopen
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Body */}
            <main className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left: Overview + Timeline + Events list */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Overview Card */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-700/50">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overview</h2>
                            </div>
                            <div className="divide-y divide-slate-700/30">
                                <Row label="Status">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusColor[group.status]}`}>{group.status}</span>
                                </Row>
                                <Row label="Events"><span className="text-lg font-bold">{group.eventCount}</span></Row>
                                <Row label="First seen">{formatDate(group.firstSeenAt)}</Row>
                                <Row label="Last seen">{formatDate(group.lastSeenAt)}</Row>
                                {selectedEvent?.environment && (
                                    <Row label="Environment">
                                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/30">{selectedEvent.environment}</span>
                                    </Row>
                                )}
                                {selectedEvent?.releaseVersion && (
                                    <Row label="Release">
                                        <code className="text-xs font-mono bg-slate-700/50 px-2 py-0.5 rounded text-blue-400">{selectedEvent.releaseVersion}</code>
                                    </Row>
                                )}
                                {selectedEvent?.level && (
                                    <Row label="Level">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${levelColor[selectedEvent.level] || levelColor.info}`}>{selectedEvent.level}</span>
                                    </Row>
                                )}
                                <div className="px-5 py-3">
                                    <div className="text-xs text-slate-500 mb-1.5">Fingerprint</div>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono bg-slate-700/50 px-2 py-1 rounded break-all flex-1 text-slate-400">{group.fingerprint}</code>
                                        <button onClick={copyFingerprint} className="shrink-0 p-1.5 rounded-md hover:bg-slate-700 transition-colors">
                                            {copied ? <span className="text-emerald-400 text-xs">✓</span> : (
                                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ✨ NEW: Event Timeline Mini Chart */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-700/50">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event Frequency — Last 7 Days</h2>
                            </div>
                            <div className="px-3 py-4 h-36">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timeline}>
                                        <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#475569" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} width={20} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Events" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Events List */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-700/50">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latest Events ({events.length})</h2>
                            </div>
                            {events.length === 0 ? (
                                <div className="px-5 py-12 text-center text-sm text-slate-500">No events recorded</div>
                            ) : (
                                <ul className="max-h-[320px] overflow-y-auto divide-y divide-slate-700/30">
                                    {events.map((ev) => (
                                        <li
                                            key={ev.id}
                                            onClick={() => setSelectedEvent(ev)}
                                            className={`px-5 py-3 cursor-pointer transition-all hover:bg-slate-700/20 ${selectedEvent?.id === ev.id
                                                ? 'bg-violet-500/5 border-l-2 border-l-violet-500'
                                                : 'border-l-2 border-l-transparent'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-500">{formatDate(ev.createdAt)}</span>
                                                <div className="flex gap-1">
                                                    {ev.environment && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-400">{ev.environment}</span>}
                                                    {ev.releaseVersion && <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-700/50 text-slate-400">{ev.releaseVersion}</span>}
                                                    {ev.level && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${levelColor[ev.level] || ''}`}>{ev.level}</span>}
                                                </div>
                                            </div>
                                            <div className="text-sm truncate text-slate-300">{ev.message}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Right: Event Detail + Context + AI */}
                    <div className="lg:col-span-3 space-y-6">

                        {/* Event Detail Panel */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden sticky top-6">
                            <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event Detail</h2>
                                <div className="flex items-center gap-2">
                                    {/* ✨ NEW: Copy Stack Trace */}
                                    {selectedEvent?.stack && (
                                        <button
                                            onClick={copyStackTrace}
                                            className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors flex items-center gap-1.5"
                                        >
                                            {stackCopied ? (
                                                <><span className="text-emerald-400">✓</span> Copied</>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    Copy Stack
                                                </>
                                            )}
                                        </button>
                                    )}
                                    {selectedEvent && <span className="text-xs text-slate-500 font-mono">{selectedEvent.id.slice(0, 12)}…</span>}
                                </div>
                            </div>

                            {!selectedEvent ? (
                                <div className="px-5 py-16 text-center text-sm text-slate-500">
                                    Select an event from the list
                                </div>
                            ) : (
                                <>
                                    {/* Tabs */}
                                    <div className="flex gap-1 px-5 pt-4 pb-2">
                                        {(['stack', 'context', 'raw', 'ai'] as EventTab[]).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                                                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30'
                                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                                                    }`}
                                            >
                                                {tab === 'ai' ? '✨ AI Analysis' : tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content */}
                                    <div className="px-5 pb-5">
                                        {activeTab !== 'ai' && (
                                            <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-auto max-h-[400px]">
                                                {activeTab === 'stack' && (
                                                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-slate-300 leading-relaxed">
                                                        {selectedEvent.stack || 'No stack trace available'}
                                                    </pre>
                                                )}
                                                {activeTab === 'context' && (
                                                    contextPairs.length > 0 ? (
                                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {contextPairs.map(({ key, value }) => (
                                                                <div key={key} className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2">
                                                                    <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{key}</div>
                                                                    <div className="text-sm font-mono text-slate-300 break-all">{value}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-4 text-sm text-slate-500">No context available</div>
                                                    )
                                                )}
                                                {activeTab === 'raw' && (
                                                    <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-slate-300 leading-relaxed">
                                                        {JSON.stringify(selectedEvent, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                        {activeTab === 'ai' && (
                                            <div className="flex flex-col gap-4">
                                                {!group.aiAnalysis ? (
                                                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center text-3xl mb-4">
                                                            🤖
                                                        </div>
                                                        <h3 className="text-lg font-semibold text-slate-200 mb-2">AI Error Analysis</h3>
                                                        <p className="text-sm text-slate-400 max-w-sm mb-6">
                                                            Get a detailed breakdown of the root cause and actionable code fixes directly from Gemini AI.
                                                            <br /><br />
                                                            <span className="text-xs opacity-70 italic">Analyzes are cached in the database so you won't consume quota repeatedly for the same error.</span>
                                                        </p>
                                                        <button
                                                            onClick={handleAnalyze}
                                                            disabled={aiAnalyzing || !selectedEvent}
                                                            className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-blue-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                                                        >
                                                            {aiAnalyzing ? <Spinner /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                                            {aiAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex gap-4 flex-col lg:flex-row">
                                                            {/* Root Cause Card */}
                                                            <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                                                                <h4 className="flex items-center gap-2 text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                                    Root Cause
                                                                </h4>
                                                                <div className="text-sm text-slate-300 leading-relaxed">
                                                                    {group.aiAnalysis.rootCause}
                                                                </div>
                                                            </div>
                                                            {/* Severity Card */}
                                                            <div className="w-full lg:w-48 shrink-0 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-center items-center text-center">
                                                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                                                    Severity Assessment
                                                                </h4>
                                                                <div className={`text-xl font-black uppercase tracking-widest ${group.aiAnalysis.severity === 'high' ? 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                                                                    group.aiAnalysis.severity === 'medium' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]'
                                                                    }`}>
                                                                    {group.aiAnalysis.severity}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Suggested Fix Card */}
                                                        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm">
                                                            <h4 className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                                                Suggested Fix
                                                            </h4>
                                                            <div className="mt-2 text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                                                                <ReactMarkdown>
                                                                    {group.aiAnalysis.suggestedFix}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>


                    </div>
                </div>
            </main>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-5 py-3 flex justify-between items-center">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm text-slate-200">{children}</span>
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
