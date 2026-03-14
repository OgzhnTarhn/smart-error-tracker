import type { IssueLevel } from './types';

const LEVEL_STYLES: Record<IssueLevel, string> = {
    error: 'text-red-400 bg-red-500/10 border-red-500/30',
    warn: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

function normalizeLevel(level: string): IssueLevel | null {
    if (level === 'error' || level === 'warn' || level === 'info') {
        return level;
    }
    return null;
}

interface IssueLevelBadgeProps {
    level: string | null;
    variant?: 'default' | 'enterprise';
}

export default function IssueLevelBadge({
    level,
    variant = 'default',
}: IssueLevelBadgeProps) {
    if (!level) return null;

    const normalizedLevel = normalizeLevel(level);
    if (!normalizedLevel) return null;

    const className =
        variant === 'enterprise'
            ? `inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                normalizedLevel === 'error'
                    ? 'bg-red-500/18 text-red-300'
                    : normalizedLevel === 'warn'
                        ? 'bg-amber-500/18 text-amber-300'
                        : 'bg-blue-500/18 text-blue-300'
            }`
            : `inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wide ${LEVEL_STYLES[normalizedLevel]}`;

    return (
        <span className={className}>
            {normalizedLevel}
        </span>
    );
}
