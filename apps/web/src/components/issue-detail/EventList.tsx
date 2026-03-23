import { useEffect, useRef } from 'react';
import type { GroupDetailEvent } from '../../lib/api';

interface EventListProps {
    events: GroupDetailEvent[];
    selectedEventId: string | null;
    onSelectEvent: (event: GroupDetailEvent) => void;
    formatDate: (value: string) => string;
}

function formatMessage(message: string) {
    const normalized = message.replace(/\s+/g, ' ').trim();
    if (normalized.length <= 96) return normalized;
    return `${normalized.slice(0, 96)}...`;
}

export default function EventList({
    events,
    selectedEventId,
    onSelectEvent,
    formatDate,
}: EventListProps) {
    const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    useEffect(() => {
        if (!selectedEventId) return;
        const node = itemRefs.current[selectedEventId];
        node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedEventId]);

    if (events.length === 0) {
        return (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
                No events available for this issue
            </div>
        );
    }

    return (
        <ul className="divide-y divide-[var(--enterprise-border)]">
            {events.map((event) => {
                const isSelected = selectedEventId === event.id;
                const levelLabel = event.level?.toUpperCase() ?? 'EVENT';
                return (
                    <li key={event.id}>
                        <button
                            ref={(node) => {
                                itemRefs.current[event.id] = node;
                            }}
                            type="button"
                            onClick={() => onSelectEvent(event)}
                            className={`w-full border-l-2 px-5 py-5 text-left transition-colors ${isSelected
                                ? 'border-l-blue-500 bg-blue-500/[0.07]'
                                : 'border-l-transparent hover:bg-[#181818]'
                                }`}
                        >
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[11px] text-slate-500">
                                    {formatDate(event.timestamp || event.createdAt)}
                                </span>
                                <span className="rounded bg-red-500/18 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-red-300">
                                    {levelLabel}
                                </span>
                                {event.environment && (
                                    <span className="ui-accent-badge rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]">
                                        {event.environment}
                                    </span>
                                )}
                                {event.releaseVersion && (
                                    <span className="rounded border border-[#2c2c2c] bg-[#181818] px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
                                        {event.releaseVersion}
                                    </span>
                                )}
                            </div>
                            <p className={`text-sm leading-7 ${isSelected ? 'font-semibold text-white' : 'text-slate-400'}`}>
                                {formatMessage(event.message)}
                            </p>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
