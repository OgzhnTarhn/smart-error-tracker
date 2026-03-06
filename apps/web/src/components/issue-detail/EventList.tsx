import { useEffect, useRef } from 'react';
import type { GroupDetailEvent } from '../../lib/api';
import IssueLevelBadge from '../issues/IssueLevelBadge';

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
        <ul className="max-h-[360px] overflow-y-auto divide-y divide-slate-700/30">
            {events.map((event) => {
                const isSelected = selectedEventId === event.id;
                return (
                    <li key={event.id}>
                        <button
                            ref={(node) => {
                                itemRefs.current[event.id] = node;
                            }}
                            type="button"
                            onClick={() => onSelectEvent(event)}
                            className={`w-full px-4 py-3 text-left transition-all border-l-2 ${isSelected
                                ? 'bg-violet-500/15 border-l-violet-400 ring-1 ring-violet-500/40'
                                : 'border-l-transparent hover:bg-slate-700/30'
                                }`}
                        >
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs text-slate-500">
                                    {formatDate(event.timestamp || event.createdAt)}
                                </span>
                                <div className="flex flex-wrap items-center gap-1">
                                    <IssueLevelBadge level={event.level} />
                                    {event.environment && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/30">
                                            {event.environment}
                                        </span>
                                    )}
                                    {event.releaseVersion && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                            {event.releaseVersion}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-slate-300 leading-5">
                                {formatMessage(event.message)}
                            </p>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
