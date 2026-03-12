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
        <ul className="divide-y divide-slate-800/80">
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
                            className={`w-full border-l-[3px] px-5 py-5 text-left transition-colors ${isSelected
                                ? 'border-l-blue-500 bg-blue-500/[0.12]'
                                : 'border-l-transparent hover:bg-slate-800/35'
                                }`}
                        >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
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
                                        <span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30">
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
