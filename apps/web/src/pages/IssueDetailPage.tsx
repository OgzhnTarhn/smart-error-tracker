import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import EventDetailPanel from '../components/issue-detail/EventDetailPanel';
import EventList from '../components/issue-detail/EventList';
import FixMemoryPanel from '../components/issue-detail/FixMemoryPanel';
import PreventionInsightsPanel, { PreventionRecommendedActionsPanel } from '../components/issue-detail/PreventionInsightsPanel';
import SimilarPastIssuesPanel from '../components/issue-detail/SimilarPastIssuesPanel';
import type { EventTab } from '../components/issue-detail/types';
import IssueRegressionBadge from '../components/issues/IssueRegressionBadge';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import {
    analyzeEvent,
    type EventAiAnalysis,
    type FixMemory,
    type EventSourceMapResult,
    getFixMemory,
    getGroupDetail,
    getPreventionInsights,
    getSimilarIssues,
    resolveEventSourceMap,
    setGroupStatus,
    type GroupDetail,
    type GroupDetailEvent,
    type PreventionInsights,
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

interface TimelinePoint {
    date: string;
    count: number;
}

type IssueDetailView = 'investigation' | 'guidance';
type GuidanceWorkspaceSection = 'analysis' | 'prevention' | 'fix-memory';

const GUIDANCE_WORKSPACE_SECTIONS: Array<{
    value: GuidanceWorkspaceSection;
    label: string;
    description: string;
}> = [
    {
        value: 'analysis',
        label: 'AI Debug Analysis',
        description: 'Current event diagnosis, likely failure path, and the fastest next inspection step.',
    },
    {
        value: 'prevention',
        label: 'Prevention Summary',
        description: 'Repeat risk, prevention actions, and historical issue context that support recurrence planning.',
    },
    {
        value: 'fix-memory',
        label: 'Fix Memory',
        description: 'Reusable fix patterns and resolved references worth reviewing before applying a new fix.',
    },
];

function getIssueDetailView(value: string | null): IssueDetailView {
    return value === 'guidance' ? 'guidance' : 'investigation';
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

function formatRelativeTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';

    const diffMs = Date.now() - date.getTime();
    const absDiffMs = Math.abs(diffMs);

    if (absDiffMs < 60_000) {
        return diffMs >= 0 ? 'just now' : 'soon';
    }

    if (absDiffMs < 3_600_000) {
        const minutes = Math.round(absDiffMs / 60_000);
        return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
    }

    if (absDiffMs < 86_400_000) {
        const hours = Math.round(absDiffMs / 3_600_000);
        return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
    }

    const days = Math.round(absDiffMs / 86_400_000);
    if (days <= 7) {
        return diffMs >= 0 ? `${days}d ago` : `in ${days}d`;
    }

    return formatDate(value);
}

function truncateIdentifier(value: string, leading = 10, trailing = 4) {
    if (value.length <= leading + trailing + 3) return value;
    return `${value.slice(0, leading)}...${value.slice(-trailing)}`;
}

function formatTimelineLabel(value: string) {
    const [day, month] = value.split(' ');
    if (day && month) return `${month} ${day}`;
    return value;
}

function getSeveritySummary(severity: EventAiAnalysis['severity']) {
    switch (severity) {
        case 'critical':
            return 'Critical Risk';
        case 'high':
            return 'High Risk';
        case 'medium':
            return 'Medium Risk';
        case 'low':
            return 'Low Risk';
        default:
            return 'Pending';
    }
}

function getSeverityValueClass(severity: EventAiAnalysis['severity']) {
    switch (severity) {
        case 'critical':
            return 'text-red-300';
        case 'high':
            return 'text-orange-300';
        case 'medium':
            return 'text-orange-200';
        case 'low':
            return 'text-emerald-200';
        default:
            return 'text-slate-300';
    }
}

function getConfidenceSummary(confidence: EventAiAnalysis['confidence']) {
    switch (confidence) {
        case 'high':
            return 'High Confidence';
        case 'medium':
            return 'Medium Confidence';
        case 'low':
            return 'Low Confidence';
        default:
            return 'Awaiting analysis';
    }
}

function getConfidenceValueClass(confidence: EventAiAnalysis['confidence']) {
    switch (confidence) {
        case 'high':
            return 'text-slate-50';
        case 'medium':
            return 'text-orange-200';
        case 'low':
            return 'text-slate-300';
        default:
            return 'text-slate-300';
    }
}

function getEventEnvironmentLabel(event: GroupDetailEvent | null) {
    if (event?.environment) return event.environment;
    if (event?.releaseVersion) return `Release ${event.releaseVersion}`;
    return 'Unknown';
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
    const [searchParams, setSearchParams] = useSearchParams();

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
    const [preventionInsights, setPreventionInsights] = useState<PreventionInsights | null>(null);
    const [preventionInsightsLoading, setPreventionInsightsLoading] = useState(false);
    const [preventionInsightsError, setPreventionInsightsError] = useState<string | null>(null);
    const [fixMemory, setFixMemory] = useState<FixMemory | null>(null);
    const [fixMemoryLoading, setFixMemoryLoading] = useState(false);
    const [fixMemoryError, setFixMemoryError] = useState<string | null>(null);
    const [activeGuidanceSection, setActiveGuidanceSection] = useState<GuidanceWorkspaceSection>('analysis');

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
    const activeView = getIssueDetailView(searchParams.get('view'));

    const timeline = useMemo(() => buildTimeline(events), [events]);
    const selectedSourceMapResult = selectedEvent
        ? sourceMapResultByEventId[selectedEvent.id] ?? null
        : null;
    const aiAnalyzing = selectedEvent ? aiAnalyzingEventId === selectedEvent.id : false;
    const sourceMapResolving = selectedEvent
        ? sourceMapResolvingEventId === selectedEvent.id
        : false;

    const handleViewChange = useCallback((nextView: IssueDetailView) => {
        const nextParams = new URLSearchParams(searchParams);

        if (nextView === 'guidance') {
            nextParams.set('view', 'guidance');
        } else {
            nextParams.delete('view');
        }

        setSearchParams(nextParams, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        setStackCopied(false);
        setRawCopied(false);
    }, [selectedEvent?.id]);

    useEffect(() => {
        setActiveGuidanceSection('analysis');
    }, [id]);

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

    useEffect(() => {
        if (!id) {
            setPreventionInsights(null);
            setPreventionInsightsLoading(false);
            setPreventionInsightsError(null);
            return;
        }

        let cancelled = false;

        setPreventionInsights(null);
        setPreventionInsightsLoading(true);
        setPreventionInsightsError(null);

        void getPreventionInsights(id)
            .then((data) => {
                if (cancelled) return;

                if (!data.ok) {
                    setPreventionInsightsError(
                        data.error || 'Failed to load prevention insights',
                    );
                    setPreventionInsights(null);
                    return;
                }

                setPreventionInsights(data.insights ?? null);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setPreventionInsightsError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load prevention insights',
                );
                setPreventionInsights(null);
            })
            .finally(() => {
                if (cancelled) return;
                setPreventionInsightsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        if (!id) {
            setFixMemory(null);
            setFixMemoryLoading(false);
            setFixMemoryError(null);
            return;
        }

        let cancelled = false;

        setFixMemory(null);
        setFixMemoryLoading(true);
        setFixMemoryError(null);

        void getFixMemory(id)
            .then((data) => {
                if (cancelled) return;

                if (!data.ok) {
                    setFixMemoryError(data.error || 'Failed to load fix memory');
                    setFixMemory(null);
                    return;
                }

                setFixMemory(data.memory ?? null);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                setFixMemoryError(
                    err instanceof Error ? err.message : 'Failed to load fix memory',
                );
                setFixMemory(null);
            })
            .finally(() => {
                if (cancelled) return;
                setFixMemoryLoading(false);
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
        <div className="issue-detail-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="issues" />

            <main className="mx-auto max-w-[1480px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[#222] pb-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <IssueHeaderStatusBadge status={group.status} />
                                <span className="text-xs text-slate-500">
                                    {activeView === 'investigation'
                                        ? `${events.length} ${events.length === 1 ? 'event' : 'events'} in last 7 days`
                                        : formatRelativeTime(group.lastSeenAt)}
                                </span>
                                {group.isRegression && (
                                    <IssueRegressionBadge
                                        isRegression={group.isRegression}
                                        regressionCount={group.regressionCount}
                                    />
                                )}
                                {activeView !== 'investigation' && (
                                    <span className="text-xs text-slate-600">
                                        {group.eventCount} events
                                    </span>
                                )}
                            </div>
                            <h1 className="mt-4 max-w-5xl text-3xl font-semibold tracking-tight text-white md:text-[2.35rem]">
                                {group.title}
                            </h1>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            {group.status === 'open' && (
                                <>
                                    <ActionButton
                                        loading={actionLoading === 'resolve'}
                                        onClick={openResolveDialog}
                                        className="border-orange-500 bg-orange-500 text-white hover:bg-orange-400 hover:border-orange-400"
                                        label="Resolve"
                                    />
                                    <ActionButton
                                        loading={actionLoading === 'ignore'}
                                        onClick={() => void handleAction('ignore')}
                                        className="border-[#303030] bg-transparent text-slate-300 hover:border-slate-200 hover:text-white"
                                        label="Ignore"
                                    />
                                </>
                            )}
                            {(group.status === 'resolved' || group.status === 'ignored') && (
                                <ActionButton
                                    loading={actionLoading === 'open'}
                                    onClick={() => void handleAction('open')}
                                    className="border-orange-500 bg-orange-500 text-white hover:bg-orange-400 hover:border-orange-400"
                                    label="Reopen Issue"
                                />
                            )}
                        </div>
                    </div>
                </section>

                <div className="mt-5">
                    <IssueDetailTopTabs
                        activeView={activeView}
                        onChange={handleViewChange}
                    />
                </div>

                {activeView === 'investigation' ? (
                    <InvestigationTabContent
                        group={group}
                        timeline={timeline}
                        events={events}
                        selectedEvent={selectedEvent}
                        activeTab={activeTab}
                        copiedFingerprint={copiedFingerprint}
                        stackCopied={stackCopied}
                        rawCopied={rawCopied}
                        sourceMapResult={selectedSourceMapResult}
                        sourceMapResolving={sourceMapResolving}
                        onCopyFingerprint={() => void copyFingerprint()}
                        onSelectEvent={(event) => setSelectedEventId(event.id)}
                        onTabChange={setActiveTab}
                        onCopyStack={() => void copyStackTrace()}
                        onCopyRaw={() => void copyRawPayload()}
                        onResolveSourceMap={() => void handleResolveSourceMap()}
                        formatDate={formatDate}
                    />
                ) : (
                    <GuidanceTabContent
                        events={events}
                        selectedEventId={selectedEvent?.id ?? null}
                        activeSection={activeGuidanceSection}
                        preventionInsights={preventionInsights}
                        preventionInsightsLoading={preventionInsightsLoading}
                        preventionInsightsError={preventionInsightsError}
                        fixMemory={fixMemory}
                        fixMemoryLoading={fixMemoryLoading}
                        fixMemoryError={fixMemoryError}
                        similarIssues={similarIssues}
                        similarIssuesLoading={similarIssuesLoading}
                        similarIssuesError={similarIssuesError}
                        selectedEvent={selectedEvent}
                        aiAnalyzing={aiAnalyzing}
                        analysisError={analysisError}
                        onAnalyze={() => void handleAnalyze()}
                        onSectionChange={setActiveGuidanceSection}
                        onSelectEvent={(event) => setSelectedEventId(event.id)}
                        formatDate={formatDate}
                    />
                )}
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

function IssueHeaderStatusBadge({ status }: { status: string }) {
    const classes = status === 'resolved'
        ? 'bg-emerald-500/18 text-emerald-300'
        : status === 'ignored'
            ? 'bg-amber-500/18 text-amber-300'
            : 'bg-red-500/18 text-red-300';

    return (
        <span className={`rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${classes}`}>
            {status}
        </span>
    );
}

function IssueDetailTopTabs({
    activeView,
    onChange,
}: {
    activeView: IssueDetailView;
    onChange: (view: IssueDetailView) => void;
}) {
    const tabs: Array<{
        value: IssueDetailView;
        label: string;
    }> = [
        {
            value: 'investigation',
            label: 'Investigation',
        },
        {
            value: 'guidance',
            label: 'Guidance Workspace',
        },
    ];

    return (
        <div className="mb-8 border-b border-[#222]">
            <div
                role="tablist"
                aria-label="Issue detail sections"
                className="flex flex-wrap items-end gap-8"
            >
                {tabs.map((tab) => {
                    const isActive = tab.value === activeView;

                    return (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onChange(tab.value)}
                            className={`border-b-2 px-0 pb-4 pt-1 text-base transition-colors ${
                                isActive
                                    ? 'border-orange-500 text-white'
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function InvestigationTabContent({
    group,
    timeline,
    events,
    selectedEvent,
    activeTab,
    copiedFingerprint,
    stackCopied,
    rawCopied,
    sourceMapResult,
    sourceMapResolving,
    onCopyFingerprint,
    onSelectEvent,
    onTabChange,
    onCopyStack,
    onCopyRaw,
    onResolveSourceMap,
    formatDate,
}: {
    group: GroupDetail;
    timeline: TimelinePoint[];
    events: GroupDetailEvent[];
    selectedEvent: GroupDetailEvent | null;
    activeTab: EventTab;
    copiedFingerprint: boolean;
    stackCopied: boolean;
    rawCopied: boolean;
    sourceMapResult: EventSourceMapResult | null;
    sourceMapResolving: boolean;
    onCopyFingerprint: () => void;
    onSelectEvent: (event: GroupDetailEvent) => void;
    onTabChange: (tab: EventTab) => void;
    onCopyStack: () => void;
    onCopyRaw: () => void;
    onResolveSourceMap: () => void;
    formatDate: (value: string) => string;
}) {
    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-5">
                <div className="guidance-panel overflow-hidden rounded-[24px] border border-[#2c2c2e] p-5 ring-1 ring-white/5">
                    <div className="pb-4">
                        <h2 className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                            Overview
                        </h2>
                    </div>
                    <div className="space-y-1 text-sm">
                        <Row label="Status">
                            <span className="text-lg font-bold capitalize text-orange-400">
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
                                <span className="text-slate-200">No</span>
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
                            <span className="text-xl font-bold text-white">{group.eventCount}</span>
                        </Row>

                        <div className="mt-4 border-t border-[#2c2c2e] pt-4">
                            <Row label="First seen">{formatDate(group.firstSeenAt)}</Row>
                            <Row label="Last seen">{formatDate(group.lastSeenAt)}</Row>
                        </div>

                        <div className="mt-8">
                            <div className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                                Fingerprint
                            </div>
                            <code className="block rounded-xl border border-[#2c2c2e] bg-[#090909] px-4 py-4 font-mono text-[13px] leading-8 break-all text-blue-400">
                                {group.fingerprint}
                            </code>
                            <button
                                type="button"
                                onClick={onCopyFingerprint}
                                className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400 transition-colors hover:text-orange-300"
                            >
                                {copiedFingerprint ? 'Copied fingerprint' : 'Copy fingerprint'}
                            </button>
                        </div>

                        <div className="mt-8">
                            <div className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                                Event Frequency - Last 7 Days
                            </div>
                            <InvestigationFrequencyChart timeline={timeline} />
                        </div>
                    </div>
                </div>

                {group.resolutionNote && (
                    <ResolutionNoteCard
                        note={group.resolutionNote}
                        isResolved={group.status === 'resolved'}
                    />
                )}
            </div>

            <div className="guidance-panel min-w-0 overflow-hidden rounded-[24px] border border-[#2c2c2e] ring-1 ring-white/5">
                <div className="border-b border-[#2c2c2e] px-5 py-5">
                    <h2 className="text-[1.05rem] font-semibold text-white">
                        Latest Events ({events.length})
                    </h2>
                </div>
                <div className="max-h-[760px] overflow-y-auto">
                    <EventList
                        events={events}
                        selectedEventId={selectedEvent?.id ?? null}
                        onSelectEvent={onSelectEvent}
                        formatDate={formatDate}
                    />
                </div>
            </div>

            <div className="min-w-0">
                <EventDetailPanel
                    event={selectedEvent}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                    formatDate={formatDate}
                    onCopyStack={onCopyStack}
                    onCopyRaw={onCopyRaw}
                    onResolveSourceMap={onResolveSourceMap}
                    stackCopied={stackCopied}
                    rawCopied={rawCopied}
                    sourceMapResult={sourceMapResult}
                    resolvingSourceMap={sourceMapResolving}
                />
            </div>
        </div>
    );
}

function GuidanceTabContent({
    events,
    selectedEventId,
    activeSection,
    preventionInsights,
    preventionInsightsLoading,
    preventionInsightsError,
    fixMemory,
    fixMemoryLoading,
    fixMemoryError,
    similarIssues,
    similarIssuesLoading,
    similarIssuesError,
    selectedEvent,
    aiAnalyzing,
    analysisError,
    onAnalyze,
    onSectionChange,
    onSelectEvent,
    formatDate,
}: {
    events: GroupDetailEvent[];
    selectedEventId: string | null;
    activeSection: GuidanceWorkspaceSection;
    preventionInsights: PreventionInsights | null;
    preventionInsightsLoading: boolean;
    preventionInsightsError: string | null;
    fixMemory: FixMemory | null;
    fixMemoryLoading: boolean;
    fixMemoryError: string | null;
    similarIssues: SimilarIssue[];
    similarIssuesLoading: boolean;
    similarIssuesError: string | null;
    selectedEvent: GroupDetailEvent | null;
    aiAnalyzing: boolean;
    analysisError: string | null;
    onAnalyze: () => void;
    onSectionChange: (section: GuidanceWorkspaceSection) => void;
    onSelectEvent: (event: GroupDetailEvent) => void;
    formatDate: (value: string) => string;
}) {
    const selectedEventIndex = selectedEventId
        ? events.findIndex((event) => event.id === selectedEventId)
        : events.length > 0
            ? 0
            : -1;
    const activeIndex = selectedEventIndex >= 0 ? selectedEventIndex : 0;
    const previousEvent = activeIndex > 0 ? events[activeIndex - 1] : null;
    const nextEvent = activeIndex < events.length - 1 ? events[activeIndex + 1] : null;
    const repeatRiskTone = getGuidanceRepeatRiskTone(preventionInsights?.repeatRisk ?? null);
    const selectedAnalysis = selectedEvent?.aiAnalysis ?? null;
    const activeSectionMeta = GUIDANCE_WORKSPACE_SECTIONS.find((section) => section.value === activeSection)
        ?? GUIDANCE_WORKSPACE_SECTIONS[0];

    return (
        <div className="space-y-5">
            <section className="guidance-panel overflow-hidden rounded-[28px] border border-[#2b241f] ring-1 ring-white/5">
                <div className="border-b border-[#252525] px-5 pb-5 pt-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <h2 className="text-[1.9rem] font-semibold tracking-tight text-white">
                                Guidance Workspace
                            </h2>
                            <p className="mt-2 text-[15px] font-medium leading-7 text-slate-200">
                                Focused debugging guidance for the selected issue.
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Move between event diagnosis, recurrence planning, and reusable fixes without leaving the current issue detail page.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
                                    {events.length} {events.length === 1 ? 'event' : 'events'} loaded
                                </span>
                                {selectedAnalysis?.severity ? (
                                    <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-orange-200">
                                        {getSeveritySummary(selectedAnalysis.severity)}
                                    </span>
                                ) : null}
                                {selectedAnalysis?.confidence ? (
                                    <span className="rounded-full border border-slate-600/60 bg-black/35 px-3 py-1 text-[11px] font-medium text-slate-200">
                                        {getConfidenceSummary(selectedAnalysis.confidence)}
                                    </span>
                                ) : null}
                                {repeatRiskTone ? (
                                    <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${repeatRiskTone.className}`}>
                                        Repeat risk: {repeatRiskTone.label}
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:min-w-[360px] xl:items-end">
                            <div className="flex items-center gap-2 self-start xl:self-end">
                                <GuidanceEventNavButton
                                    label="Previous event"
                                    onClick={() => previousEvent && onSelectEvent(previousEvent)}
                                    disabled={!previousEvent}
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.8"
                                            d="M15 19l-7-7 7-7"
                                        />
                                    </svg>
                                </GuidanceEventNavButton>
                                <GuidanceEventNavButton
                                    label="Next event"
                                    onClick={() => nextEvent && onSelectEvent(nextEvent)}
                                    disabled={!nextEvent}
                                >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.8"
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </GuidanceEventNavButton>
                                <div className="rounded-xl border border-[#252525] bg-black/30 px-3 py-2 text-right ring-1 ring-white/5">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                        Active event
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-slate-100">
                                        {events.length === 0 ? 'None' : `${activeIndex + 1} of ${events.length}`}
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                        Selected event
                                    </div>
                                    <select
                                        value={selectedEvent?.id ?? ''}
                                        onChange={(event) => {
                                            const nextSelectedEvent = events.find((item) => item.id === event.target.value);
                                            if (nextSelectedEvent) onSelectEvent(nextSelectedEvent);
                                        }}
                                        disabled={events.length === 0}
                                        style={{ colorScheme: 'dark' }}
                                        className="w-full rounded-xl border border-[#2c2c2e] bg-[#111] px-4 py-3 text-sm text-slate-100 outline-none transition-colors focus:border-orange-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {events.map((event) => (
                                            <option key={event.id} value={event.id}>
                                                {`${truncateIdentifier(event.id, 10, 4)} | ${formatDate(event.timestamp || event.createdAt)}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <ActionButton
                                    loading={aiAnalyzing}
                                    onClick={onAnalyze}
                                    className="border-orange-500 bg-orange-500 text-white hover:bg-orange-400 hover:border-orange-400"
                                    label="Analyze Selected Event"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <GuidanceWorkspaceSectionTabs
                    activeSection={activeSection}
                    onChange={onSectionChange}
                    description={activeSectionMeta.description}
                />
            </section>

            <div
                role="tabpanel"
                id={`guidance-panel-${activeSection}`}
                aria-labelledby={`guidance-tab-${activeSection}`}
            >
                {activeSection === 'analysis' ? (
                    <div className="space-y-6">
                        <GuidanceActiveEventSummary
                            activeIndex={activeIndex}
                            eventCount={events.length}
                            selectedEvent={selectedEvent}
                            formatDate={formatDate}
                        />

                        <AiAnalysisPanel
                            analysis={selectedAnalysis}
                            selectedEvent={selectedEvent}
                            analyzing={aiAnalyzing}
                            error={analysisError}
                        />
                    </div>
                ) : activeSection === 'prevention' ? (
                    <div className="space-y-6">
                        <PreventionInsightsPanel
                            insights={preventionInsights}
                            loading={preventionInsightsLoading}
                            error={preventionInsightsError}
                            showRecommendedActions={false}
                        />

                        <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)] xl:items-start">
                            <div className="min-w-0">
                                <PreventionRecommendedActionsPanel
                                    insights={preventionInsights}
                                    loading={preventionInsightsLoading}
                                    error={preventionInsightsError}
                                    compact
                                    framed
                                />
                            </div>

                            <div className="min-w-0">
                                <SimilarPastIssuesPanel
                                    items={similarIssues}
                                    loading={similarIssuesLoading}
                                    error={similarIssuesError}
                                    formatDate={formatDate}
                                    compact
                                    framed
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <FixMemoryPanel
                        memory={fixMemory}
                        loading={fixMemoryLoading}
                        error={fixMemoryError}
                        formatDate={formatDate}
                    />
                )}
            </div>
        </div>
    );
}

function GuidanceWorkspaceSectionTabs({
    activeSection,
    onChange,
    description,
}: {
    activeSection: GuidanceWorkspaceSection;
    onChange: (section: GuidanceWorkspaceSection) => void;
    description: string;
}) {
    return (
        <div className="px-5 pb-4 pt-4">
            <div
                role="tablist"
                aria-label="Guidance workspace sections"
                className="inline-flex max-w-full flex-wrap gap-2 rounded-2xl border border-[#252525] bg-[#0b0b0b]/80 p-1.5"
            >
                {GUIDANCE_WORKSPACE_SECTIONS.map((section) => {
                    const isActive = section.value === activeSection;

                    return (
                        <button
                            key={section.value}
                            id={`guidance-tab-${section.value}`}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`guidance-panel-${section.value}`}
                            onClick={() => onChange(section.value)}
                            className={`rounded-[14px] px-4 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-orange-500 text-white shadow-[0_0_0_1px_rgba(249,115,22,0.22)]'
                                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                            }`}
                        >
                            {section.label}
                        </button>
                    );
                })}
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-6 text-slate-500">
                {description}
            </p>
        </div>
    );
}

function GuidanceActiveEventSummary({
    activeIndex,
    eventCount,
    selectedEvent,
    formatDate,
}: {
    activeIndex: number;
    eventCount: number;
    selectedEvent: GroupDetailEvent | null;
    formatDate: (value: string) => string;
}) {
    if (!selectedEvent) return null;

    const timestamp = selectedEvent.timestamp || selectedEvent.createdAt;

    return (
        <section className="guidance-panel-soft rounded-[24px] border border-[#262626] px-5 py-5 ring-1 ring-white/5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                    <h3 className="text-[1.3rem] font-semibold tracking-tight text-white">
                        Active Event Summary
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                        {selectedEvent.message || 'No event message was attached to this occurrence.'}
                    </p>
                </div>

                <div className="rounded-[18px] border border-[#252525] bg-black/30 px-4 py-3 text-left ring-1 ring-white/5 lg:min-w-[180px] lg:text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Focused occurrence
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-100">
                        {eventCount === 0 ? 'No events' : `${activeIndex + 1} of ${eventCount}`}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        {formatDate(timestamp)}
                    </p>
                </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <GuidanceEventMetaCard
                    label="Event ID"
                    value={truncateIdentifier(selectedEvent.id, 12, 4)}
                    detail={selectedEvent.level ? selectedEvent.level.toUpperCase() : 'Level unknown'}
                    mono
                />
                <GuidanceEventMetaCard
                    label="Last Seen"
                    value={formatRelativeTime(timestamp)}
                    detail={formatDate(timestamp)}
                />
                <GuidanceEventMetaCard
                    label="Source"
                    value={selectedEvent.source}
                    detail={selectedEvent.releaseVersion ?? 'No release tagged'}
                />
                <GuidanceEventMetaCard
                    label="Environment"
                    value={getEventEnvironmentLabel(selectedEvent)}
                    detail={selectedEvent.message
                        ? 'Selected event message is summarized above.'
                        : 'No message attached'}
                />
            </div>
        </section>
    );
}

function getGuidanceRepeatRiskTone(risk: PreventionInsights['repeatRisk'] | null) {
    switch (risk) {
        case 'high':
            return {
                label: 'Critical',
                className: 'border-red-500/25 bg-red-500/10 text-red-200',
            };
        case 'medium':
            return {
                label: 'Elevated',
                className: 'border-orange-500/25 bg-orange-500/10 text-orange-200',
            };
        case 'low':
            return {
                label: 'Guarded',
                className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
            };
        default:
            return null;
    }
}

function GuidanceEventNavButton({
    label,
    onClick,
    disabled,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#2c2c2e] bg-[#111] text-slate-300 transition-colors hover:border-orange-500/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
            {children}
        </button>
    );
}

function GuidanceEventMetaCard({
    label,
    value,
    detail,
    mono = false,
}: {
    label: string;
    value: string;
    detail?: string | null;
    mono?: boolean;
}) {
    return (
        <div className="guidance-panel-soft rounded-[20px] border border-[#262626] px-4 py-4 ring-1 ring-white/5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {label}
            </div>
            <div className={`mt-2 text-[1rem] font-semibold text-slate-100 ${mono ? 'font-mono' : ''}`}>
                {value}
            </div>
            {detail ? (
                <div className={`mt-2 text-xs leading-6 text-slate-400 ${mono ? 'font-mono' : ''}`}>
                    {detail}
                </div>
            ) : null}
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="text-[15px] text-slate-400">{label}</span>
            <span className="text-right text-[15px] text-slate-100">{children}</span>
        </div>
    );
}

function InvestigationFrequencyChart({
    timeline,
}: {
    timeline: TimelinePoint[];
}) {
    const peakCount = timeline.reduce((highest, point) => Math.max(highest, point.count), 0);
    const maxCount = Math.max(peakCount, 1);
    const totalCount = timeline.reduce((sum, point) => sum + point.count, 0);
    const peakPoint = timeline.reduce<TimelinePoint | null>((best, point) => {
        if (!best || point.count > best.count) return point;
        return best;
    }, null);

    return (
        <div className="rounded-[16px] border border-[#17253a] bg-[#07101a] px-3 py-3 ring-1 ring-blue-500/8">
            <div className="flex items-center justify-between gap-3 text-[10px] font-medium">
                <div className="text-slate-500">
                    <span className="uppercase tracking-[0.18em]">Total</span>
                    <span className="ml-2 text-slate-200">{totalCount}</span>
                </div>
                <div className="text-right text-slate-500">
                    <span className="uppercase tracking-[0.18em]">Peak</span>
                    <span className="ml-2 text-blue-300">
                        {peakPoint ? `${peakPoint.count} on ${formatTimelineLabel(peakPoint.date)}` : 'No events'}
                    </span>
                </div>
            </div>

            <div className="mt-3 rounded-[12px] bg-[#050b12] px-2.5 pb-2.5 pt-3">
                <div className="flex h-[58px] items-end gap-1.5">
                    {timeline.map((point, index) => {
                        const heightPx = point.count > 0
                            ? Math.max((point.count / maxCount) * 50, 8)
                            : 2;
                        const isPeak = point.count === peakCount && point.count > 0;
                        const isLast = index === timeline.length - 1;

                        return (
                            <div
                                key={`${point.date}-${index}`}
                                className="flex flex-1 items-end justify-center"
                                title={`${formatTimelineLabel(point.date)}: ${point.count} ${point.count === 1 ? 'event' : 'events'}`}
                            >
                                <div
                                    className={`w-full rounded-[3px] ${isPeak
                                        ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.18)]'
                                        : isLast && point.count > 0
                                            ? 'bg-sky-400'
                                            : point.count > 0
                                                ? 'bg-blue-500/32'
                                                : 'bg-blue-500/[0.08]'
                                        }`}
                                    style={{
                                        height: `${heightPx}px`,
                                        maxWidth: '24px',
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-500">
                    {timeline.map((point, index) => (
                        <div key={`label-${point.date}-${index}`} className="flex-1 text-center">
                            {index % 2 === 0 || index === timeline.length - 1
                                ? formatTimelineLabel(point.date)
                                : ''}
                        </div>
                    ))}
                </div>
            </div>
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
            className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${className}`}
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
        <div className="guidance-panel overflow-hidden rounded-[24px] border border-[#2c2c2e] ring-1 ring-white/5">
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
                <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                        Resolution Note
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {isResolved ? 'Saved with the current resolution.' : 'Retained from the last resolution.'}
                    </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                    Saved
                </span>
            </div>
            <div className="px-5 pb-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[24px] border border-[#2b2b2b] bg-[#101010] shadow-2xl shadow-black/50">
                <div className="border-b border-[#232323] px-5 py-4">
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
                            className="mt-2 w-full resize-y rounded-xl border border-[#2c2c2c] bg-black px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-orange-500/60"
                        />
                    </label>

                    {error && (
                        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-[#232323] px-5 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-xl border border-[#2f2f2f] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-200 hover:text-white disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-400 disabled:opacity-50"
                    >
                        {loading ? <Spinner /> : null}
                        {loading ? 'Resolving...' : 'Resolve Issue'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function GuidanceMetricCard({
    label,
    value,
    valueClassName,
}: {
    label: string;
    value: string;
    valueClassName: string;
}) {
    return (
        <div className="guidance-panel-soft min-h-[124px] rounded-[22px] border border-[#262626] px-5 py-5 ring-1 ring-white/5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {label}
            </div>
            <div className={`mt-3 text-[1.45rem] font-semibold leading-tight ${valueClassName}`}>
                {value}
            </div>
        </div>
    );
}

function GuidanceDecisionCard({
    label,
    value,
    supportingText,
    icon,
    iconClassName,
    toneClassName,
}: {
    label: string;
    value: string;
    supportingText?: string;
    icon: ReactNode;
    iconClassName: string;
    toneClassName: string;
}) {
    return (
        <div className={`flex min-h-[248px] flex-col rounded-[28px] border px-7 py-7 ring-1 ring-white/5 ${toneClassName}`}>
            <div className="flex items-center gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${iconClassName}`}>
                    {icon}
                </span>
                <div className="text-[13px] font-semibold uppercase tracking-[0.24em] text-slate-200">
                    {label}
                </div>
            </div>
            <p className="mt-6 whitespace-pre-wrap text-[1.16rem] leading-10 text-slate-100">
                {value}
            </p>
            {supportingText ? (
                <p className="mt-4 text-[15px] leading-7 text-slate-300/85">
                    {supportingText}
                </p>
            ) : null}
        </div>
    );
}

function AnalysisSectionCard({
    label,
    value,
    labelClassName,
    iconClassName,
    icon,
    codeValue = false,
}: {
    label: string;
    value: string;
    labelClassName: string;
    iconClassName: string;
    icon: ReactNode;
    codeValue?: boolean;
}) {
    return (
        <div className="guidance-panel-soft min-h-[176px] rounded-[24px] border border-[#262626] p-6 ring-1 ring-white/5">
            <div className="flex items-center gap-3.5">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${iconClassName}`}>
                    {icon}
                </span>
                <div className={`text-[13px] font-semibold uppercase tracking-[0.24em] ${labelClassName}`}>
                    {label}
                </div>
            </div>

            {codeValue ? (
                <div className="mt-5 rounded-xl border border-[#2b2b2b] bg-black px-4 py-3.5 font-mono text-[15px] leading-7 text-orange-300">
                    {value}
                </div>
            ) : (
                <p className="mt-5 whitespace-pre-wrap text-[1.05rem] leading-8 text-slate-300">
                    {value}
                </p>
            )}
        </div>
    );
}

interface AiAnalysisPanelProps {
    analysis?: EventAiAnalysis | null;
    selectedEvent: GroupDetailEvent | null;
    analyzing: boolean;
    error: string | null;
}

function AiAnalysisPanel({
    analysis,
    selectedEvent,
    analyzing,
    error,
}: AiAnalysisPanelProps) {
    const detailSections = [
        {
            label: 'Suggested Fix',
            value: analysis?.suggestedFix,
            labelClassName: 'text-slate-400',
            iconClassName: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
            codeValue: false,
            icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M4 7h16M4 12h16M4 17h16"
                    />
                </svg>
            ),
        },
        {
            label: 'Likely Area',
            value: analysis?.likelyArea,
            labelClassName: 'text-slate-400',
            iconClassName: 'border-slate-700 bg-[#171717] text-slate-300',
            codeValue: true,
            icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M7 4h7l5 5v11a1 1 0 01-1 1H7a2 2 0 01-2-2V6a2 2 0 012-2z"
                    />
                </svg>
            ),
        },
    ].flatMap((section) => (section.value
        ? [{
            ...section,
            value: section.value,
        }]
        : []));

    const hasRenderableAnalysis = Boolean(
        analysis
        && (
            analysis.summary
            || detailSections.length > 0
            || analysis.rootCause
            || analysis.nextStep
            || analysis.severity
            || analysis.confidence
            || analysis.preventionTip
        ),
    );
    const showLoadingState = Boolean(selectedEvent && analyzing && !hasRenderableAnalysis);
    const showEmptyState = !selectedEvent || (!showLoadingState && !hasRenderableAnalysis);

    return (
        <div className="guidance-panel relative overflow-hidden rounded-[30px] border border-[#2b241f] ring-1 ring-white/5">
            <div className="border-b border-[#252525] px-7 pb-6 pt-7">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-orange-500/12 text-orange-300">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.8"
                                d="M12 3l1.8 4.7L18 9.5l-3.3 2.8 1 4.7L12 14.8 8.3 17l1-4.7L6 9.5l4.2-1.8L12 3z"
                            />
                        </svg>
                    </div>
                    <div>
                        <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            AI Decision Summary
                        </div>
                        <h2 className="mt-2 text-[2.15rem] font-semibold tracking-tight text-white">
                            AI Debug Guidance
                        </h2>
                        <p className="mt-2 max-w-4xl text-[16px] leading-8 text-slate-400">
                            {selectedEvent
                                ? <>Decision support for event <span className="font-mono text-orange-300">{truncateIdentifier(selectedEvent.id, 12, 4)}</span>. Start with the summary below, confirm the likely failure path, then use the immediate next step to validate the diagnosis against the current event context.</>
                                : 'Choose an event from the list to generate structured debugging guidance. This workspace is designed to help you move from suspicion to confirmation faster by highlighting the most actionable parts of the analysis first.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-7">
                {error && (
                    <div className="mb-6 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-[15px] text-red-200 ring-1 ring-red-500/15">
                        {error}
                        {hasRenderableAnalysis ? ' Previous guidance is still shown below.' : ''}
                    </div>
                )}

                {showLoadingState ? (
                    <div className="py-16 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-orange-200">
                            <Spinner />
                            Analyzing selected event
                        </div>
                        <p className="mt-5 text-[15px] leading-7 text-slate-400">
                            Building structured debugging guidance from the event context and stack trace.
                        </p>
                    </div>
                ) : showEmptyState ? (
                    <div className="py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2a2a2a] bg-black/40 text-slate-500">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                    d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <h3 className="mt-5 text-lg font-semibold text-slate-100">
                            {selectedEvent ? 'No analysis for this event yet' : 'No event selected'}
                        </h3>
                        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-7 text-slate-400">
                            {selectedEvent
                                ? 'Run analysis to get a concise root-cause readout, likely inspection area, and the best next debugging step.'
                                : 'Choose an event from the event list to populate the guidance workspace.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {analyzing && (
                            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-5 py-4 text-[15px] text-orange-100 ring-1 ring-orange-500/10">
                                Refreshing guidance for the selected event.
                            </div>
                        )}

                        <div className="space-y-6">
                            {analysis?.summary ? (
                                <div className="min-h-[250px] rounded-[32px] border border-[#2b2b2b] bg-black/35 px-8 py-8 ring-1 ring-white/5">
                                    <div className="text-[13px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                                        Analysis Summary
                                    </div>
                                    <p className="mt-5 max-w-5xl whitespace-pre-wrap text-[1.28rem] leading-10 text-slate-100">
                                        {analysis.summary}
                                    </p>
                                    <p className="mt-5 max-w-4xl text-[15px] leading-8 text-slate-400">
                                        Treat this as the working diagnosis for the selected event. Use it to orient the investigation quickly before comparing the stack trace, release metadata, and similar issue history.
                                    </p>
                                </div>
                            ) : null}

                            {(analysis?.rootCause || analysis?.nextStep) ? (
                                <div className="grid gap-6 xl:grid-cols-2">
                                    {analysis?.rootCause ? (
                                        <GuidanceDecisionCard
                                            label="Root Cause"
                                            value={analysis.rootCause}
                                            supportingText="This is the strongest current explanation for why the event failed. Validate it against the exact code path, event payload, and runtime conditions before applying a permanent fix."
                                            iconClassName="border-orange-500/20 bg-orange-500/10 text-orange-300"
                                            toneClassName="border-orange-500/15 bg-orange-500/[0.08]"
                                            icon={(
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="1.8"
                                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                                    />
                                                </svg>
                                            )}
                                        />
                                    ) : null}
                                    {analysis?.nextStep ? (
                                        <GuidanceDecisionCard
                                            label="Immediate Next Step"
                                            value={analysis.nextStep}
                                            supportingText="Use this as the fastest confirmation step. The goal here is to prove or disprove the suspected failure path with the least amount of extra debugging work."
                                            iconClassName="border-amber-500/20 bg-amber-500/10 text-amber-200"
                                            toneClassName="border-amber-500/15 bg-amber-500/[0.07]"
                                            icon={(
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="1.8"
                                                        d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"
                                                    />
                                                </svg>
                                            )}
                                        />
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <GuidanceMetricCard
                                    label="Severity"
                                    value={getSeveritySummary(analysis?.severity ?? null)}
                                    valueClassName={getSeverityValueClass(analysis?.severity ?? null)}
                                />
                                <GuidanceMetricCard
                                    label="Confidence"
                                    value={getConfidenceSummary(analysis?.confidence ?? null)}
                                    valueClassName={getConfidenceValueClass(analysis?.confidence ?? null)}
                                />
                                <GuidanceMetricCard
                                    label="Last Print"
                                    value={selectedEvent
                                        ? formatRelativeTime(selectedEvent.timestamp || selectedEvent.createdAt)
                                        : '-'}
                                    valueClassName="text-slate-100"
                                />
                                <GuidanceMetricCard
                                    label="Environment"
                                    value={getEventEnvironmentLabel(selectedEvent)}
                                    valueClassName="text-slate-100"
                                />
                            </div>

                            {analysis?.preventionTip ? (
                                <div className="rounded-[26px] border border-orange-500/20 bg-orange-500/[0.08] px-7 py-6 text-[16px] ring-1 ring-orange-500/10">
                                    <div className="flex items-start gap-4 text-orange-100">
                                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-orange-400/20 bg-orange-400/10 text-orange-200">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth="1.8"
                                                    d="M12 3a6 6 0 00-3.6 10.8V17a1 1 0 001 1h5.2a1 1 0 001-1v-3.2A6 6 0 0012 3zm-2 17h4m-3 0v1m2-1v1"
                                                />
                                            </svg>
                                        </span>
                                            <div>
                                                <div className="text-[13px] font-semibold uppercase tracking-[0.22em] text-orange-300">
                                                    Pro-tip
                                                </div>
                                                <p className="mt-2 max-w-5xl leading-8 text-orange-50/90">
                                                    {analysis.preventionTip}
                                                </p>
                                                <p className="mt-3 max-w-4xl text-[15px] leading-7 text-orange-50/70">
                                                    Small guardrails applied here usually pay off twice: they reduce repeat noise in the short term and improve the quality of future guidance for the same failure pattern.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                            ) : null}
                        </div>

                        {detailSections.length > 0 && (
                            <div className="grid gap-5 xl:grid-cols-2">
                                {detailSections.map((section) => (
                                    <AnalysisSectionCard
                                        key={section.label}
                                        label={section.label}
                                        value={section.value}
                                        labelClassName={section.labelClassName}
                                        iconClassName={section.iconClassName}
                                        icon={section.icon}
                                        codeValue={section.codeValue}
                                    />
                                ))}
                            </div>
                        )}

                        {!analysis?.summary
                            && !analysis?.rootCause
                            && !analysis?.nextStep
                            && detailSections.length === 0
                            && !analysis?.preventionTip && (
                            <div className="rounded-[22px] border border-slate-800/80 bg-slate-950/55 px-6 py-5 text-[15px] leading-7 text-slate-400 ring-1 ring-white/5">
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
