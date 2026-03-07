import { useCallback, useEffect, useState } from 'react';
import {
    getDashboardStats,
    type DashboardBreakdownItem,
    type DashboardStatsData,
    type DashboardStatsResponse,
} from '../lib/api';

const EMPTY_TOTALS = {
    totalEvents: 0,
    totalIssues: 0,
    openIssues: 0,
    resolvedIssues: 0,
    ignoredIssues: 0,
};

function sortBreakdown(items: DashboardBreakdownItem[]) {
    return [...items].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function normalizeStats(response: DashboardStatsResponse): DashboardStatsData {
    const counts = response.counts;

    return {
        totals: response.totals ?? {
            totalEvents: counts?.totalEvents ?? EMPTY_TOTALS.totalEvents,
            totalIssues: counts?.totalGroups ?? EMPTY_TOTALS.totalIssues,
            openIssues: counts?.open ?? EMPTY_TOTALS.openIssues,
            resolvedIssues: counts?.resolved ?? EMPTY_TOTALS.resolvedIssues,
            ignoredIssues: counts?.ignored ?? EMPTY_TOTALS.ignoredIssues,
        },
        trend7d: response.trend7d ?? response.dailyTrend ?? [],
        errorsByLevel: sortBreakdown(response.errorsByLevel ?? []),
        errorsByEnvironment: sortBreakdown(response.errorsByEnvironment ?? []),
        errorsByRelease: sortBreakdown(response.errorsByRelease ?? []),
        topRoutes: sortBreakdown(response.topRoutes ?? []),
        topIssues: response.topIssues ?? [],
    };
}

interface UseDashboardStatsResult {
    stats: DashboardStatsData | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useDashboardStats(): UseDashboardStatsResult {
    const [stats, setStats] = useState<DashboardStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await getDashboardStats();
            if (!response.ok) {
                throw new Error(response.error ?? 'Failed to load dashboard analytics');
            }

            setStats(normalizeStats(response));
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load dashboard analytics',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { stats, loading, error, refresh };
}
