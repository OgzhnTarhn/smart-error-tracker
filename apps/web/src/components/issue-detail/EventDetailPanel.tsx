import type { EventSourceMapResult, GroupDetailEvent } from '../../lib/api';
import JsonViewer from './JsonViewer';
import SourceMapSummary from './SourceMapSummary';
import { EVENT_TABS, type EventTab } from './types';

interface EventDetailPanelProps {
    event: GroupDetailEvent | null;
    activeTab: EventTab;
    onTabChange: (tab: EventTab) => void;
    formatDate: (value: string) => string;
    onCopyStack: () => void;
    onCopyRaw: () => void;
    onResolveSourceMap: () => void;
    stackCopied: boolean;
    rawCopied: boolean;
    sourceMapResult?: EventSourceMapResult | null;
    resolvingSourceMap?: boolean;
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

function formatStackLocation(value: string) {
    return value.replace(/^\((.*)\)$/, '$1');
}

function getLocationClassName(location: string) {
    return /https?:\/\//.test(location) || location.includes('/src/')
        ? 'text-blue-400'
        : 'text-slate-600';
}

function StackTraceView({ stack }: { stack: string }) {
    const lines = stack.split('\n').map((line) => line.trimEnd()).filter(Boolean);

    return (
        <div className="scrollbar-hidden max-h-[420px] overflow-y-auto overflow-x-hidden rounded-[18px] border border-[#2c2c2e] bg-[#090909] p-5 font-mono text-xs leading-8">
            {lines.map((line, index) => {
                const trimmed = line.trim();
                if (index === 0) {
                    return (
                        <div key={`${index}-${trimmed}`} className="mb-4 font-semibold text-red-400">
                            {trimmed}
                        </div>
                    );
                }

                const withLocation = trimmed.match(/^at\s+(.+?)\s+\((.+)\)$/);
                if (withLocation) {
                    const [, fnName, location] = withLocation;
                    const normalizedLocation = formatStackLocation(location);
                    return (
                        <div key={`${index}-${trimmed}`} className="mb-4 pl-4">
                            <div className="text-slate-500">
                                at {fnName}
                            </div>
                            <div className={`break-all ${getLocationClassName(normalizedLocation)}`}>
                                ({normalizedLocation})
                            </div>
                        </div>
                    );
                }

                const bareAt = trimmed.match(/^at\s+(.+)$/);
                if (bareAt) {
                    return (
                        <div key={`${index}-${trimmed}`} className="mb-4 pl-4 text-slate-500">
                            {trimmed}
                        </div>
                    );
                }

                return (
                    <div key={`${index}-${trimmed}`} className="mb-4 text-slate-400">
                        {trimmed}
                    </div>
                );
            })}
        </div>
    );
}

export default function EventDetailPanel({
    event,
    activeTab,
    onTabChange,
    formatDate,
    onCopyStack,
    onCopyRaw,
    onResolveSourceMap,
    stackCopied,
    rawCopied,
    sourceMapResult = null,
    resolvingSourceMap = false,
}: EventDetailPanelProps) {
    if (!event) {
        return (
            <div className="guidance-panel h-full overflow-hidden rounded-[24px] border border-[#2c2c2e] ring-1 ring-white/5">
                <div className="border-b border-[#2c2c2e] px-5 pb-4 pt-5">
                    <h2 className="text-sm font-semibold text-white">
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
    const metaValues = {
        timestamp: formatDate(event.timestamp || event.createdAt),
        source: event.source || '-',
        environment: event.environment || '-',
        release: event.releaseVersion || '-',
        level: event.level?.toUpperCase() || '-',
        sdk: event.sdk
            ? [event.sdk.name, event.sdk.version].filter(Boolean).join('@')
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
    const sourceMap = sourceMapResult?.sourceMap ?? null;
    const sourceMapStatus = sourceMapResult?.status ?? null;
    const sourceMapButtonLabel = sourceMapResult ? 'Resolve again' : 'Resolve source map';
    const sourceMapStatusLabel = sourceMapStatus
        ? sourceMapStatus.replace(/_/g, ' ')
        : 'Not checked';

    return (
        <div className="guidance-panel h-full overflow-hidden rounded-[24px] border border-[#2c2c2e] ring-1 ring-white/5">
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-5 pt-5">
                <div className="min-w-0">
                    <h2 className="text-[1.1rem] font-semibold text-white">
                        Event Detail
                    </h2>
                    <div className="mt-1 break-all font-mono text-[13px] text-slate-400">
                        Event ID: {event.id}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onCopyRaw}
                        disabled={!hasRawPayload}
                        className="rounded-lg border border-[#2c2c2e] bg-[#171717] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {rawCopied ? 'Copied Raw' : 'Copy Raw'}
                    </button>
                    {event.stack && (
                        <button
                            type="button"
                            onClick={onCopyStack}
                            className="rounded-lg border border-[#2c2c2e] bg-[#171717] px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                        >
                            {stackCopied ? 'Copied Stack' : 'Copy Stack'}
                        </button>
                    )}
                </div>
            </div>

            <div className="px-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <MetaItem label="Timestamp" value={metaValues.timestamp} />
                    <MetaItem label="Source" value={metaValues.source} />
                    <MetaItem label="Level" value={metaValues.level} valueClassName="text-red-400 font-bold" />
                    <MetaItem label="Environment" value={metaValues.environment} />
                    <MetaItem label="Release" value={metaValues.release} />
                    <MetaItem label="SDK" value={metaValues.sdk} truncate />
                </div>
            </div>

            <div className="mt-6 flex gap-6 border-b border-[#2c2c2e] px-5">
                {EVENT_TABS.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => onTabChange(tab)}
                        className={`border-b-2 px-0 pb-3 text-sm font-semibold capitalize transition-colors ${activeTab === tab
                            ? 'border-orange-500 text-orange-400'
                            : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="px-5 pb-5 pt-5">
                {activeTab === 'stack' && (
                    event.stack ? (
                        <div>
                            {sourceMap ? (
                                <SourceMapSummary
                                    sourceMap={sourceMap}
                                    hint={sourceMapResult?.hint ?? null}
                                />
                            ) : (
                                <div className="mb-4 flex flex-col gap-4 rounded-[18px] border border-blue-500/20 bg-blue-500/[0.06] p-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="text-sm font-semibold text-white">
                                                Source map
                                            </div>
                                            <span className="rounded bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                {sourceMapStatusLabel}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm leading-6 text-slate-400">
                                            {resolvingSourceMap
                                                ? 'Checking the top frame against its matching .map artifact...'
                                                : sourceMapResult?.message ?? 'Resolve source map to view original source locations.'}
                                        </div>
                                        {sourceMapResult?.hint && !resolvingSourceMap && (
                                            <div className="mt-1 text-xs text-slate-500">
                                                {sourceMapResult.hint}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onResolveSourceMap}
                                        disabled={resolvingSourceMap}
                                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {resolvingSourceMap ? 'Resolving...' : sourceMapButtonLabel}
                                    </button>
                                </div>
                            )}

                            <StackTraceView stack={event.stack} />
                        </div>
                    ) : (
                        <div className="rounded-[18px] border border-[#2c2c2e] bg-[#0d0d0d] p-5 text-sm text-slate-500">
                            No stack trace for this event
                        </div>
                    )
                )}

                {activeTab === 'context' && (
                    contextEntries.length > 0 ? (
                        <div className="space-y-4 rounded-[18px] border border-[#2c2c2e] bg-[#0d0d0d] p-4">
                            {contextSummary.length > 0 && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {contextSummary.map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-lg border border-[#2c2c2e] bg-black/35 px-3 py-2.5"
                                        >
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                                {item.label}
                                            </div>
                                            <div className="mt-1 break-all text-xs text-slate-200">
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {contextEntries.map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="rounded-lg border border-[#2c2c2e] bg-black/35 px-3 py-2.5"
                                    >
                                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                            {key}
                                        </div>
                                        <div className="break-all whitespace-pre-wrap font-mono text-sm text-slate-300">
                                            {formatContextValue(value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[18px] border border-[#2c2c2e] bg-[#0d0d0d] p-5 text-sm text-slate-500">
                            No context data for this event
                        </div>
                    )
                )}

                {activeTab === 'raw' && (
                    hasRawPayload ? (
                        <div className="overflow-hidden rounded-[18px] border border-[#2c2c2e] bg-[#0d0d0d]">
                            <JsonViewer
                                data={rawPayload}
                                emptyMessage="No raw payload available"
                                maxHeightClassName="max-h-[520px]"
                            />
                        </div>
                    ) : (
                        <div className="rounded-[18px] border border-[#2c2c2e] bg-[#0d0d0d] p-5 text-sm text-slate-500">
                            No raw payload available
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

interface MetaItemProps {
    label: string;
    value: string;
    valueClassName?: string;
    truncate?: boolean;
}

function MetaItem({
    label,
    value,
    valueClassName = 'text-white',
    truncate = false,
}: MetaItemProps) {
    return (
        <div className="rounded-xl border border-[#2c2c2e] bg-black/35 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {label}
            </div>
            <div className={`mt-2 text-sm ${valueClassName} ${truncate ? 'truncate' : 'break-all'}`}>
                {value}
            </div>
        </div>
    );
}
