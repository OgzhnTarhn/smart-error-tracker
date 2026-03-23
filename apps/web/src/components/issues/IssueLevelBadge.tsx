import type { IssueLevel } from './types';

const LEVEL_STYLES: Record<IssueLevel, string> = {
    error: 'ui-danger-badge',
    warn: 'ui-warning-badge',
    info: 'ui-accent-badge',
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
            ? `inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${LEVEL_STYLES[normalizedLevel]}`
            : `inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${LEVEL_STYLES[normalizedLevel]}`;

    return (
        <span className={className}>
            {normalizedLevel}
        </span>
    );
}
