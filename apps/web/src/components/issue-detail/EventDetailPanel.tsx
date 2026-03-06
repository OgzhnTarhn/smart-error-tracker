import type { ReactNode } from 'react';
import type { GroupDetailEvent } from '../../lib/api';
import IssueLevelBadge from '../issues/IssueLevelBadge';
import JsonViewer from './JsonViewer';
import { EVENT_TABS, type EventTab } from './types';

interface EventDetailPanelProps {
    event: GroupDetailEvent | null;
    activeTab: EventTab;
    onTabChange: (tab: EventTab) => void;
    formatDate: (value: string) => string;
    onCopyStack: () => void;
    onCopyRaw: () => void;
    stackCopied: boolean;
    rawCopied: boolean;
    sourceMapOriginal?: Record<string, unknown> | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function readPath(
    input: Record<string, unknown> | null,
    path: string[],
): unknown {
    let current: unknown = input;
    for (const segment of path) {
        const currentRecord = asRecord(current);
        if (!currentRecord) return undefined;
        current = currentRecord[segment];
    }
    return current;
}

function toDisplayString(value: unknown): string | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    return null;
}

function pickFirstString(
    input: Record<string, unknown> | null,
    paths: string[][],
): string | null {
    for (const path of paths) {
        const value = toDisplayString(readPath(input, path));
        if (value) return value;
    }
    return null;
}

function formatContextValue(value: unknown): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

function getSourceMapSummary(sourceMapOriginal?: Record<string, unknown> | null) {
    if (!sourceMapOriginal) return null;
    const file = toDisplayString(sourceMapOriginal.file);
    const line = toDisplayString(sourceMapOriginal.line);
    const column = toDisplayString(sourceMapOriginal.column);
    const name = toDisplayString(sourceMapOriginal.name);

    if (!file && !line && !column && !name) return null;
    return {
        file: file ?? '-',
        line: line ?? '-',
        column: column ?? '-',
        name: name ?? '-',
    };
}

export default function EventDetailPanel({
    event,
    activeTab,
    onTabChange,
    formatDate,
    onCopyStack,
    onCopyRaw,
    stackCopied,
    rawCopied,
    sourceMapOriginal,
}: EventDetailPanelProps) {
    if (!event) {
        return (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-700/50">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Event Detail
                    </h2>
                </div>
                <div className="px-5 py-16 text-center text-sm text-slate-500">
                    No events available for this issue
                </div>
            </div>
        );
    }

    const context = asRecord(event.context);
    const contextEntries = context ? Object.entries(context) : [];
    const sourceMapSummary = getSourceMapSummary(sourceMapOriginal);
    const metaValues = {
        timestamp: formatDate(event.timestamp || event.createdAt),
        source: event.source || '-',
        environment: event.environment || '-',
        release: event.releaseVersion || '-',
        level: event.level || '-',
        sdk: event.sdk
            ? [event.sdk.name, event.sdk.version].filter(Boolean).join(' ')
            : '-',
    };
    const contextSummary = [
        {
            label: 'Route',
            value: pickFirstString(context, [
                ['route'],
                ['request', 'route'],
                ['request', 'path'],
                ['pathname'],
                ['url'],
            ]),
        },
        {
            label: 'Browser',
            value: pickFirstString(context, [
                ['browser'],
                ['client', 'browser'],
                ['device', 'browser'],
            ]),
        },
        {
            label: 'User Agent',
            value: pickFirstString(context, [
                ['userAgent'],
                ['ua'],
                ['request', 'userAgent'],
                ['request', 'headers', 'user-agent'],
            ]),
        },
        {
            label: 'Platform',
            value: pickFirstString(context, [
                ['platform'],
                ['os'],
                ['device', 'platform'],
            ]),
        },
    ].filter((item): item is { label: string; value: string } => Boolean(item.value));

    const rawPayload = event.rawPayload ?? null;
    const hasRawPayload = rawPayload !== null;

    return (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/50 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Event Detail
                    </h2>
                    <div className="mt-1 text-sm text-slate-200 font-medium font-mono break-all">
                        Event ID: {event.id}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                        {metaValues.timestamp} | {event.level ?? 'unknown'} | {event.environment ?? 'unknown'} | {event.releaseVersion ?? 'unknown'}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCopyRaw}
                        disabled={!hasRawPayload}
                        className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-700/60 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {rawCopied ? 'Copied Raw' : 'Copy Raw'}
                    </button>
                    {event.stack && (
                        <button
                            type="button"
                            onClick={onCopyStack}
                            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-700/60 hover:bg-slate-700 rounded-md transition-colors"
                        >
                            {stackCopied ? 'Copied Stack' : 'Copy Stack'}
                        </button>
                    )}
                </div>
            </div>

            <div className="px-5 pt-4">
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                    <MetaItem label="Timestamp" value={metaValues.timestamp} />
                    <MetaItem label="Source" value={metaValues.source} />
                    <MetaItem
                        label="Level"
                        value={metaValues.level}
                        badge={event.level ? <IssueLevelBadge level={event.level} /> : undefined}
                    />
                    <MetaItem label="Environment" value={metaValues.environment} />
                    <MetaItem label="Release" value={metaValues.release} />
                    <MetaItem label="SDK" value={metaValues.sdk} />
                </div>
                {sourceMapSummary && (
                    <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-blue-300 mb-1">
                            Source Map
                        </div>
                        <div className="text-xs text-blue-100 font-mono break-all">
                            {sourceMapSummary.file}:{sourceMapSummary.line}:{sourceMapSummary.column} {sourceMapSummary.name !== '-' ? `(${sourceMapSummary.name})` : ''}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-1 px-5 pt-4 pb-2">
                {EVENT_TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => onTabChange(tab)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                            ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="px-5 pb-5">
                <div className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden">
                    {activeTab === 'stack' && (
                        event.stack ? (
                            <pre className="max-h-[420px] overflow-auto p-4 text-sm font-mono whitespace-pre-wrap break-words text-slate-300 leading-relaxed">
                                {event.stack}
                            </pre>
                        ) : (
                            <div className="p-5 text-sm text-slate-500">
                                No stack trace for this event
                            </div>
                        )
                    )}

                    {activeTab === 'context' && (
                        contextEntries.length > 0 ? (
                            <div className="p-4 space-y-4">
                                {contextSummary.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {contextSummary.map((item) => (
                                            <div
                                                key={item.label}
                                                className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2"
                                            >
                                                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                                    {item.label}
                                                </div>
                                                <div className="mt-1 text-xs text-slate-200 break-all">
                                                    {item.value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {contextEntries.map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2"
                                        >
                                            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                                                {key}
                                            </div>
                                            <div className="text-sm font-mono text-slate-300 break-all whitespace-pre-wrap">
                                                {formatContextValue(value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-5 text-sm text-slate-500">
                                No context data for this event
                            </div>
                        )
                    )}

                    {activeTab === 'raw' && (
                        hasRawPayload ? (
                            <JsonViewer
                                data={rawPayload}
                                emptyMessage="No raw payload available"
                            />
                        ) : (
                            <div className="p-5 text-sm text-slate-500">
                                No raw payload available
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

interface MetaItemProps {
    label: string;
    value: string;
    badge?: ReactNode;
}

function MetaItem({ label, value, badge }: MetaItemProps) {
    return (
        <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                {label}
            </div>
            <div className="mt-1 text-xs text-slate-200 break-all">
                {badge ?? value}
            </div>
        </div>
    );
}
