import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const KEY = import.meta.env.VITE_API_KEY || '';

interface StatsData {
    counts: {
        totalGroups: number;
        open: number;
        resolved: number;
        ignored: number;
        totalEvents: number;
    };
    dailyTrend: { date: string; count: number }[];
    topIssues: {
        id: string;
        title: string;
        status: string;
        eventCount: number;
        lastSeenAt: string;
    }[];
}

export default function OverviewPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetch(`${API}/stats`, { headers: { 'x-api-key': KEY } })
            .then(r => r.json())
            .then(d => { if (d.ok) setData(d); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!data) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
            Failed to load stats
        </div>
    );

    const { counts, dailyTrend, topIssues } = data;

    const statCards = [
        { label: 'Total Events', value: counts.totalEvents, color: 'text-blue-400', bgBorder: 'bg-gradient-to-br from-blue-500/20 to-blue-600/5 border-blue-500/20', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { label: 'Total Issues', value: counts.totalGroups, color: 'text-violet-400', bgBorder: 'bg-gradient-to-br from-violet-500/20 to-violet-600/5 border-violet-500/20', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> },
        { label: 'Open', value: counts.open, color: 'text-red-400', bgBorder: 'bg-gradient-to-br from-red-500/20 to-red-600/5 border-red-500/20', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { label: 'Resolved', value: counts.resolved, color: 'text-emerald-400', bgBorder: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border-emerald-500/20', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { label: 'Ignored', value: counts.ignored, color: 'text-amber-400', bgBorder: 'bg-gradient-to-br from-amber-500/20 to-amber-600/5 border-amber-500/20', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
    ];

    const statusColor: Record<string, string> = {
        open: 'text-red-400 bg-red-500/10 border-red-500/30',
        resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        ignored: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    };

    const formatDate = (d: any) => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    };

    const timeAgo = (d: string) => {
        const diff = Date.now() - new Date(d).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}dk`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}sa`;
        return `${Math.floor(hrs / 24)}g`;
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
                        <p className="text-sm text-slate-500 mt-0.5">Dashboard Overview</p>
                    </div>
                    <nav className="flex gap-2">
                        <span className="px-4 py-2 text-sm font-medium text-violet-400 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                            Overview
                        </span>
                        <button
                            onClick={() => navigate('/issues')}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Issues
                        </button>
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {statCards.map(card => (
                        <div
                            key={card.label}
                            className="bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors rounded-2xl p-5 flex flex-col justify-between"
                        >
                            <div className="flex flex-col gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${card.bgBorder} ${card.color}`}>
                                    {card.icon}
                                </div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{card.label}</div>
                            </div>
                            <div className="mt-3">
                                <div className="text-3xl font-bold text-slate-100">{card.value.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trend Chart */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                        Events — Last 7 Days
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyTrend}>
                                <defs>
                                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    stroke="#64748b"
                                    fontSize={12}
                                />
                                <YAxis
                                    stroke="#64748b"
                                    fontSize={12}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                    }}
                                    labelFormatter={formatDate}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorEvents)"
                                    name="Events"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Issues */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-700/50">
                        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                            Top Issues
                        </h2>
                    </div>
                    {topIssues.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm text-slate-500">
                            No issues yet. Trigger some errors to see data here.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-700/30">
                            {topIssues.map((issue, i) => (
                                <button
                                    key={issue.id}
                                    onClick={() => navigate(`/issues/${issue.id}`)}
                                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors text-left"
                                >
                                    <span className="text-2xl font-bold text-slate-600 w-8">
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-200 truncate">{issue.title}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            Last seen {timeAgo(issue.lastSeenAt)} ago
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColor[issue.status] ?? 'text-slate-400'}`}>
                                        {issue.status}
                                    </span>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-slate-200">{issue.eventCount}</div>
                                        <div className="text-xs text-slate-500">events</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
