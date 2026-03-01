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
        { label: 'Total Events', value: counts.totalEvents, color: 'from-blue-500 to-blue-600', icon: '📊' },
        { label: 'Total Issues', value: counts.totalGroups, color: 'from-violet-500 to-violet-600', icon: '🐛' },
        { label: 'Open', value: counts.open, color: 'from-red-500 to-red-600', icon: '🔴' },
        { label: 'Resolved', value: counts.resolved, color: 'from-emerald-500 to-emerald-600', icon: '✅' },
        { label: 'Ignored', value: counts.ignored, color: 'from-amber-500 to-amber-600', icon: '🔕' },
    ];

    const statusColor: Record<string, string> = {
        open: 'text-red-400 bg-red-500/10 border-red-500/30',
        resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        ignored: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    };

    const formatDate = (d: string) => {
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {statCards.map(card => (
                        <div
                            key={card.label}
                            className="relative overflow-hidden bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-5`} />
                            <div className="relative">
                                <span className="text-lg">{card.icon}</span>
                                <div className="text-3xl font-bold mt-2">{card.value.toLocaleString()}</div>
                                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{card.label}</div>
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
