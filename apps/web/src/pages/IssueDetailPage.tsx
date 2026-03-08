import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    BarChart,
    Bar,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import EventDetailPanel from '../components/issue-detail/EventDetailPanel';
import EventList from '../components/issue-detail/EventList';
import SimilarPastIssuesPanel from '../components/issue-detail/SimilarPastIssuesPanel';
import type { EventTab } from '../components/issue-detail/types';
import IssueRegressionBadge from '../components/issues/IssueRegressionBadge';
import IssueStatusBadge from '../components/issues/IssueStatusBadge';
import {
    analyzeEvent,
    type EventAiAnalysis,
    type EventSourceMapResult,
    getGroupDetail,
    getSimilarIssues,
    resolveEventSourceMap,
    setGroupStatus,
    type GroupDetail,
    type GroupDetailEvent,
    type SimilarIssue,
    type StatusAction,
} from '../lib/api';

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

const statusColor: Record<string, string> = {
    open: 'text-red-400 bg-red-500/10 border-red-500/30',
    resolved: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    ignored: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

interface TimelinePoint {
    date: string;
    count: number;
}

function getAnalyzeErrorMessage(errorCode: string | undefined): string {
    if (errorCode === 'ai_not_configured') {
        return 'AI analysis is not configured, but source map resolution is still available.';
    }
    if (errorCode === 'ai_analysis_failed') {
        return 'AI analysis failed for this event.';
    }
    if (errorCode === 'not_found') {
        return 'Selected event could not be found.';
    }
    return 'AI analysis failed';
}

function getSourceMapErrorMessage(errorCode: string | undefined): string {
    if (errorCode === 'not_found') {
        return 'Selected event could not be found.';
    }
    return 'Source map resolution failed.';
}

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return DATE_FORMATTER.format(date);
}

function buildTimeline(events: GroupDetailEvent[]): TimelinePoint[] {
    const now = new Date();
    const map: Record<string, number> = {};

    for (let day = 6; day >= 0; day -= 1) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);
        map[date.toISOString().slice(0, 10)] = 0;
    }

    for (const event of events) {
        const eventDate = new Date(event.timestamp || event.createdAt);
        if (Number.isNaN(eventDate.getTime())) continue;
        const key = eventDate.toISOString().slice(0, 10);
        if (key in map) map[key] += 1;
    }

    return Object.entries(map).map(([date, count]) => ({
        date: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
        }),
        count,
    }));
}

export default function IssueDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [events, setEvents] = useState<GroupDetailEvent[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<EventTab>('stack');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<StatusAction | null>(null);
    const [aiAnalyzingEventId, setAiAnalyzingEventId] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [sourceMapResolvingEventId, setSourceMapResolvingEventId] = useState<string | null>(null);
    const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
    const [resolutionNoteDraft, setResolutionNoteDraft] = useState('');
    const [resolveDialogError, setResolveDialogError] = useState<string | null>(null);
    const [similarIssues, setSimilarIssues] = useState<SimilarIssue[]>([]);
    const [similarIssuesLoading, setSimilarIssuesLoading] = useState(false);
    const [similarIssuesError, setSimilarIssuesError] = useState<string | null>(null);

    const [copiedFingerprint, setCopiedFingerprint] = useState(false);
    const [stackCopied, setStackCopied] = useState(false);
    const [rawCopied, setRawCopied] = useState(false);
    const [sourceMapResultByEventId, setSourceMapResultByEventId] = useState<
        Record<string, EventSourceMapResult>
    >({});

    const selectedEvent = useMemo(() => {
        if (events.length === 0) return null;
        if (!selectedEventId) return events[0];
        return events.find((event) => event.id === selectedEventId) ?? events[0];
    }, [events, selectedEventId]);

    const timeline = useMemo(() => buildTimeline(events), [events]);
    const selectedSourceMapResult = selectedEvent
        ? sourceMapResultByEventId[selectedEvent.id] ?? null
        : null;
    const aiAnalyzing = selectedEvent ? aiAnalyzingEventId === selectedEvent.id : false;
    const sourceMapResolving = selectedEvent
        ? sourceMapResolvingEventId === selectedEvent.id
        : false;

    useEffect(() => {
        setStackCopied(false);
        setRawCopied(false);
    }, [selectedEvent?.id]);

    useEffect(() => {
        setAnalysisError(null);
    }, [selectedEvent?.id]);

    const fetchDetail = useCallback(async () => {
        if (!id) return;

        setLoading(true);
        setError(null);
        setAnalysisError(null);

        try {
            const data = await getGroupDetail(id);
            if (!data.ok || !data.group) {
                setError(data.error || 'Failed to load');
                setGroup(null);
                setEvents([]);
                setSelectedEventId(null);
                return;
            }

            const nextEvents = data.events ?? [];
            setGroup(data.group);
            setEvents(nextEvents);
            setSelectedEventId((prev) => {
                if (prev && nextEvents.some((event) => event.id === prev)) {
                    return prev;
                }
                return nextEvents[0]?.id ?? null;
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load');
            setGroup(null);
            setEvents([]);
            setSelectedEventId(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        setAiAnalyzingEventId(null);
        setSourceMapResolvingEventId(null);
        setSourceMapResultByEventId({});
        setResolveDialogOpen(false);
        setResolveDialogError(null);
        void fetchDetail();
    }, [fetchDetail, id]);

    useEffect(() => {
        if (!id) {
            setSimilarIssues([]);
            setSimilarIssuesLoading(false);
            setSimilarIssuesError(null);
            return;
        }

        let cancelled = false;

        setSimilarIssues([]);
        setSimilarIssuesLoading(true);
        setSimilarIssuesError(null);

        void getSimilarIssues(id)
            .then((data) => {
                if (cancelled) return;

                if (!data.ok) {
                    setSimilarIssuesError(data.error || 'Failed to load similar issues');
                    setSimilarIssues([]);
                    return;
                }

                setSimilarIssues(data.items ?? []);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setSimilarIssuesError(
                    err instanceof Error ? err.message : 'Failed to load similar issues',
                );
                setSimilarIssues([]);
            })
            .finally(() => {
                if (cancelled) return;
                setSimilarIssuesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    const handleAction = async (action: StatusAction) => {
        if (!id) return;

        setActionLoading(action);
        try {
            const data = await setGroupStatus(id, action);
            if (data.ok && data.group) {
                const updatedGroup = data.group;
                setGroup((previous) => (previous
                    ? {
                        ...previous,
                        status: updatedGroup.status,
                        resolutionNote: updatedGroup.resolutionNote,
                        isRegression: updatedGroup.isRegression,
                        regressionCount: updatedGroup.regressionCount,
                        lastRegressedAt: updatedGroup.lastRegressedAt,
                        lastSeenAt: updatedGroup.lastSeenAt,
                        eventCount: updatedGroup.eventCount,
                    }
                    : previous));
                return { ok: true as const };
            }
            return { ok: false as const, error: data.error || 'Action failed' };
        } catch (err: unknown) {
            return {
                ok: false as const,
                error: err instanceof Error ? err.message : 'Action failed',
            };
        } finally {
            setActionLoading(null);
        }
    };

    const openResolveDialog = () => {
        if (!group) return;
        setResolutionNoteDraft(group.resolutionNote ?? '');
        setResolveDialogError(null);
        setResolveDialogOpen(true);
    };

    const closeResolveDialog = () => {
        if (actionLoading === 'resolve') return;
        setResolveDialogOpen(false);
        setResolveDialogError(null);
    };

    const handleResolveSubmit = async () => {
        if (!id) return;

        setActionLoading('resolve');
        try {
            const data = await setGroupStatus(id, 'resolve', {
                note: resolutionNoteDraft,
            });
            if (data.ok && data.group) {
                const updatedGroup = data.group;
                setGroup((previous) => (previous
                    ? {
                        ...previous,
                        status: updatedGroup.status,
                        resolutionNote: updatedGroup.resolutionNote,
                        isRegression: updatedGroup.isRegression,
                        regressionCount: updatedGroup.regressionCount,
                        lastRegressedAt: updatedGroup.lastRegressedAt,
                        lastSeenAt: updatedGroup.lastSeenAt,
                        eventCount: updatedGroup.eventCount,
                    }
                    : previous));
                setResolveDialogOpen(false);
                setResolveDialogError(null);
                return;
            }

            setResolveDialogError(data.error || 'Failed to resolve issue');
        } catch (err: unknown) {
            setResolveDialogError(
                err instanceof Error ? err.message : 'Failed to resolve issue',
            );
        } finally {
            setActionLoading(null);
        }
    };

    const copyFingerprint = async () => {
        if (!group) return;
        try {
            await navigator.clipboard.writeText(group.fingerprint);
            setCopiedFingerprint(true);
            setTimeout(() => setCopiedFingerprint(false), 1800);
        } catch {
            // no-op
        }
    };

    const copyStackTrace = async () => {
        if (!selectedEvent?.stack) return;
        try {
            await navigator.clipboard.writeText(selectedEvent.stack);
            setStackCopied(true);
            setTimeout(() => setStackCopied(false), 1800);
        } catch {
            // no-op
        }
    };

    const copyRawPayload = async () => {
        if (!selectedEvent) return;
        const rawData = selectedEvent.rawPayload ?? null;
        if (rawData === null) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(rawData, null, 2));
            setRawCopied(true);
            setTimeout(() => setRawCopied(false), 1800);
        } catch {
            // no-op
        }
    };

    const handleAnalyze = async () => {
        if (!selectedEvent) return;

        setAiAnalyzingEventId(selectedEvent.id);
        setAnalysisError(null);
        try {
            const data = await analyzeEvent(selectedEvent.id);
            if (data.sourceMapResult) {
                setSourceMapResultByEventId((previous) => ({
                    ...previous,
                    [selectedEvent.id]: data.sourceMapResult!,
                }));
            } else {
                const sourceMap = data.sourceMap;
                if (!sourceMap) {
                    // no-op: analysis can still succeed without a resolvable source map
                } else {
                    setSourceMapResultByEventId((previous) => ({
                        ...previous,
                        [selectedEvent.id]: {
                            status: 'resolved',
                            message: 'Resolved the top frame to its original source location.',
                            hint: null,
                            sourceMap,
                            diagnostics: {
                                frame: sourceMap.minified,
                                frameKind: 'remote_asset',
                                mapUrl: sourceMap.mapUrl,
                                httpStatus: null,
                            },
                        },
                    }));
                }
            }

            const nextAnalysis = data.analysis ?? data.aiAnalysis ?? null;
            if (data.ok && nextAnalysis) {
                setEvents((previous) => previous.map((event) => (event.id === selectedEvent.id
                    ? { ...event, aiAnalysis: nextAnalysis }
                    : event)));
                return;
            }

            setAnalysisError(getAnalyzeErrorMessage(data.error));
        } catch (err: unknown) {
            setAnalysisError(err instanceof Error ? err.message : 'AI analysis failed');
        } finally {
            setAiAnalyzingEventId((current) => (current === selectedEvent.id ? null : current));
        }
    };

    const handleResolveSourceMap = async () => {
        if (!selectedEvent) return;

        setSourceMapResolvingEventId(selectedEvent.id);
        try {
            const data = await resolveEventSourceMap(selectedEvent.id);
            if (data.ok && data.sourceMapResult) {
                setSourceMapResultByEventId((previous) => ({
                    ...previous,
                    [selectedEvent.id]: data.sourceMapResult!,
                }));
                return;
            }

            setSourceMapResultByEventId((previous) => ({
                ...previous,
                [selectedEvent.id]: {
                    status: 'fetch_failed',
                    message: getSourceMapErrorMessage(data.error),
                    hint: 'Try again after confirming the event still exists and the API is reachable.',
                    sourceMap: null,
                    diagnostics: {
                        frame: null,
                        frameKind: 'unknown',
                        mapUrl: null,
                        httpStatus: null,
                    },
                },
            }));
        } catch (err: unknown) {
            setSourceMapResultByEventId((previous) => ({
                ...previous,
                [selectedEvent.id]: {
                    status: 'fetch_failed',
                    message: err instanceof Error
                        ? err.message
                        : 'Source map resolution failed.',
                    hint: 'Check that the API can reach the frontend asset URL for this event.',
                    sourceMap: null,
                    diagnostics: {
                        frame: null,
                        frameKind: 'unknown',
                        mapUrl: null,
                        httpStatus: null,
                    },
                },
            }));
        } finally {
            setSourceMapResolvingEventId((current) => (current === selectedEvent.id ? null : current));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-red-400"
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
                    </div>
                    <h2 className="text-xl font-semibold text-slate-100 mb-2">
                        {error === 'not_found' ? 'Issue Not Found' : 'Error Loading Issue'}
                    </h2>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        type="button"
                        onClick={() => navigate('/issues')}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                    >
                        Back to Issues
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100">
            <header className="border-b border-slate-800 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            onClick={() => navigate('/issues')}
                            className="shrink-0 p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                />
                            </svg>
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold truncate">{group.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <IssueStatusBadge status={group.status} />
                                <IssueRegressionBadge
                                    isRegression={group.isRegression}
                                    regressionCount={group.regressionCount}
                                />
                                <span className="text-xs text-slate-500">
                                    {group.eventCount} events
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {group.status === 'open' && (
                            <>
                                <ActionButton
                                    loading={actionLoading === 'resolve'}
                                    onClick={openResolveDialog}
                                    className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                                    label="Resolve"
                                />
                                <ActionButton
                                    loading={actionLoading === 'ignore'}
                                    onClick={() => void handleAction('ignore')}
                                    className="bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                                    label="Ignore"
                                />
                            </>
                        )}
                        {(group.status === 'resolved' || group.status === 'ignored') && (
                            <ActionButton
                                loading={actionLoading === 'open'}
                                onClick={() => void handleAction('open')}
                                className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                                label="Reopen"
                            />
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-700/50">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Overview
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-700/30">
                                <Row label="Status">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusColor[group.status] || statusColor.open}`}>
                                        {group.status}
                                    </span>
                                </Row>
                                <Row label="Regression">
                                    {group.isRegression ? (
                                        <IssueRegressionBadge
                                            isRegression={group.isRegression}
                                            regressionCount={group.regressionCount}
                                        />
                                    ) : (
                                        <span className="text-slate-400">No</span>
                                    )}
                                </Row>
                                {group.isRegression && (
                                    <Row label="Regression count">{group.regressionCount}</Row>
                                )}
                                {group.isRegression && group.lastRegressedAt && (
                                    <Row label="Last regressed">
                                        {formatDate(group.lastRegressedAt)}
                                    </Row>
                                )}
                                <Row label="Total events">
                                    <span className="text-lg font-bold">{group.eventCount}</span>
                                </Row>
                                <Row label="First seen">{formatDate(group.firstSeenAt)}</Row>
                                <Row label="Last seen">{formatDate(group.lastSeenAt)}</Row>
                                <div className="px-5 py-3">
                                    <div className="text-xs text-slate-500 mb-1.5">Fingerprint</div>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono bg-slate-700/50 px-2 py-1 rounded break-all flex-1 text-slate-400">
                                            {group.fingerprint}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={() => void copyFingerprint()}
                                            className="shrink-0 p-1.5 rounded-md hover:bg-slate-700 transition-colors text-xs text-slate-300"
                                        >
                                            {copiedFingerprint ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {group.resolutionNote && (
                            <ResolutionNoteCard
                                note={group.resolutionNote}
                                isResolved={group.status === 'resolved'}
                            />
                        )}

                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-700/50">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Event Frequency - Last 7 Days
                                </h2>
                            </div>
                            <div className="px-3 py-4 h-36">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timeline}>
                                        <XAxis
                                            dataKey="date"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={10}
                                            allowDecimals={false}
                                            tickLine={false}
                                            axisLine={false}
                                            width={20}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="#8b5cf6"
                                            radius={[4, 4, 0, 0]}
                                            name="Events"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-700/50">
                                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Latest Events ({events.length})
                                </h2>
                            </div>
                            <EventList
                                events={events}
                                selectedEventId={selectedEvent?.id ?? null}
                                onSelectEvent={(event) => setSelectedEventId(event.id)}
                                formatDate={formatDate}
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-3 space-y-6">
                        <EventDetailPanel
                            event={selectedEvent}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            formatDate={formatDate}
                            onCopyStack={() => void copyStackTrace()}
                            onCopyRaw={() => void copyRawPayload()}
                            onResolveSourceMap={() => void handleResolveSourceMap()}
                            stackCopied={stackCopied}
                            rawCopied={rawCopied}
                            sourceMapResult={selectedSourceMapResult}
                            resolvingSourceMap={sourceMapResolving}
                        />

                        <SimilarPastIssuesPanel
                            items={similarIssues}
                            loading={similarIssuesLoading}
                            error={similarIssuesError}
                            formatDate={formatDate}
                        />

                        <AiAnalysisPanel
                            analysis={selectedEvent?.aiAnalysis ?? null}
                            selectedEvent={selectedEvent}
                            analyzing={aiAnalyzing}
                            error={analysisError}
                            onAnalyze={() => void handleAnalyze()}
                        />
                    </div>
                </div>
            </main>

            {resolveDialogOpen && (
                <ResolveIssueDialog
                    note={resolutionNoteDraft}
                    loading={actionLoading === 'resolve'}
                    error={resolveDialogError}
                    onChangeNote={setResolutionNoteDraft}
                    onCancel={closeResolveDialog}
                    onSubmit={() => void handleResolveSubmit()}
                />
            )}
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="px-5 py-3 flex justify-between items-center gap-3">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm text-slate-200 text-right">{children}</span>
        </div>
    );
}

interface ActionButtonProps {
    loading: boolean;
    onClick: () => void;
    label: string;
    className: string;
}

function ActionButton({ loading, onClick, label, className }: ActionButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${className}`}
        >
            {loading ? <Spinner /> : null}
            {label}
        </button>
    );
}

function ResolutionNoteCard({
    note,
    isResolved,
}: {
    note: string;
    isResolved: boolean;
}) {
    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Resolution Note
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-500">
                        {isResolved ? 'Saved with the current resolution.' : 'Retained from the last resolution.'}
                    </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    Saved
                </span>
            </div>
            <div className="px-5 py-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {note}
                </p>
            </div>
        </div>
    );
}

function ResolveIssueDialog({
    note,
    loading,
    error,
    onChangeNote,
    onCancel,
    onSubmit,
}: {
    note: string;
    loading: boolean;
    error: string | null;
    onChangeNote: (value: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/40">
                <div className="border-b border-slate-800 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-100">Resolve Issue</h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Add an optional note describing what fixed the issue.
                    </p>
                </div>

                <div className="px-5 py-4">
                    <label className="block">
                        <span className="text-sm font-medium text-slate-200">Resolution Note</span>
                        <span className="ml-2 text-xs text-slate-500">Optional</span>
                        <textarea
                            value={note}
                            onChange={(event) => onChangeNote(event.target.value)}
                            rows={5}
                            placeholder="Added null guard before rendering checkout summary."
                            className="mt-2 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-violet-500/60"
                        />
                    </label>

                    {error && (
                        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                    >
                        {loading ? <Spinner /> : null}
                        {loading ? 'Resolving...' : 'Resolve Issue'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function getSeverityPillClass(severity: EventAiAnalysis['severity']) {
    switch (severity) {
        case 'critical':
            return 'border-red-500/40 bg-red-500/15 text-red-200';
        case 'high':
            return 'border-orange-500/40 bg-orange-500/15 text-orange-200';
        case 'medium':
            return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
        case 'low':
            return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200';
        default:
            return 'border-slate-600 bg-slate-800 text-slate-300';
    }
}

function getConfidencePillClass(confidence: EventAiAnalysis['confidence']) {
    switch (confidence) {
        case 'high':
            return 'border-sky-500/40 bg-sky-500/15 text-sky-200';
        case 'medium':
            return 'border-blue-500/40 bg-blue-500/15 text-blue-200';
        case 'low':
            return 'border-slate-600 bg-slate-800 text-slate-300';
        default:
            return 'border-slate-600 bg-slate-800 text-slate-300';
    }
}

function AnalysisPill({
    label,
    value,
    className,
}: {
    label: string;
    value: string;
    className: string;
}) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${className}`}>
            {label}: {value}
        </span>
    );
}

function AnalysisSectionCard({
    label,
    value,
    accentClassName,
}: {
    label: string;
    value: string;
    accentClassName: string;
}) {
    return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <div className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${accentClassName}`}>
                {label}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {value}
            </p>
        </div>
    );
}

interface AiAnalysisPanelProps {
    analysis?: EventAiAnalysis | null;
    selectedEvent: GroupDetailEvent | null;
    analyzing: boolean;
    error: string | null;
    onAnalyze: () => void;
}

function AiAnalysisPanel({
    analysis,
    selectedEvent,
    analyzing,
    error,
    onAnalyze,
}: AiAnalysisPanelProps) {
    const sections = [
        {
            label: 'Root Cause',
            value: analysis?.rootCause,
            accentClassName: 'text-violet-300',
        },
        {
            label: 'Suggested Fix',
            value: analysis?.suggestedFix,
            accentClassName: 'text-emerald-300',
        },
        {
            label: 'Likely Area',
            value: analysis?.likelyArea,
            accentClassName: 'text-sky-300',
        },
        {
            label: 'Next Step',
            value: analysis?.nextStep,
            accentClassName: 'text-amber-300',
        },
        {
            label: 'Prevention Tip',
            value: analysis?.preventionTip,
            accentClassName: 'text-rose-300',
        },
    ].filter((section): section is {
        label: string;
        value: string;
        accentClassName: string;
    } => Boolean(section.value));

    const hasRenderableAnalysis = Boolean(
        analysis
        && (
            analysis.summary
            || sections.length > 0
            || analysis.severity
            || analysis.confidence
        ),
    );
    const showLoadingState = Boolean(selectedEvent && analyzing && !hasRenderableAnalysis);
    const showEmptyState = !selectedEvent || (!showLoadingState && !hasRenderableAnalysis);

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-violet-500/10 to-transparent">
                <div>
                    <h2 className="text-sm font-bold text-slate-200">AI Debug Guidance</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                        Event-based analysis for the selected event
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onAnalyze}
                    disabled={analyzing || !selectedEvent}
                    className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-lg hover:from-violet-500 hover:to-blue-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {analyzing ? <Spinner /> : null}
                    {analyzing ? 'Analyzing...' : 'Analyze Selected Event'}
                </button>
            </div>
            <div className="p-5">
                {error && (
                    <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                        {error}
                        {hasRenderableAnalysis ? ' Previous guidance is still shown below.' : ''}
                    </div>
                )}

                {showLoadingState ? (
                    <div className="py-8 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
                            <Spinner />
                            Analyzing selected event
                        </div>
                        <p className="mt-3 text-sm text-slate-500">
                            Building structured debugging guidance from the event context and stack trace.
                        </p>
                    </div>
                ) : showEmptyState ? (
                    <div className="py-8 text-center">
                        <h3 className="text-slate-300 font-medium mb-1">
                            {selectedEvent ? 'No analysis for this event yet' : 'No event selected'}
                        </h3>
                        <p className="text-sm text-slate-500">
                            {selectedEvent
                                ? 'Run analysis to get a concise root-cause readout, where to inspect, and the best next debugging step.'
                                : 'Choose an event from the list to generate structured debugging guidance.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {analyzing && (
                            <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
                                Refreshing guidance for the selected event.
                            </div>
                        )}

                        <div className="flex flex-col gap-3 border border-slate-700/60 rounded-xl bg-slate-900/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-slate-400">
                                Selected event{' '}
                                <span className="font-mono text-slate-200">{selectedEvent.id}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {analysis?.severity && (
                                    <AnalysisPill
                                        label="Severity"
                                        value={analysis.severity}
                                        className={getSeverityPillClass(analysis.severity)}
                                    />
                                )}
                                {analysis?.confidence && (
                                    <AnalysisPill
                                        label="Confidence"
                                        value={analysis.confidence}
                                        className={getConfidencePillClass(analysis.confidence)}
                                    />
                                )}
                            </div>
                        </div>

                        {analysis?.summary && (
                            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    Summary
                                </div>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                                    {analysis.summary}
                                </p>
                            </div>
                        )}

                        {sections.length > 0 && (
                            <div className="grid gap-3 xl:grid-cols-2">
                                {sections.map((section) => (
                                    <AnalysisSectionCard
                                        key={section.label}
                                        label={section.label}
                                        value={section.value}
                                        accentClassName={section.accentClassName}
                                    />
                                ))}
                            </div>
                        )}

                        {!analysis?.summary && sections.length === 0 && (
                            <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-400">
                                Analysis returned limited structured data for this event.
                            </div>
                        )}
                    </div>
                )}
            </div>
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
