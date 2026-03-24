import { useMemo } from 'react';
import { useDashboardProjectContext } from './useDashboardProjectContext';
import { useDashboardStats } from './useDashboardStats';
import {
    buildWorkspaceNotifications,
    getWorkspaceNotificationActionableCount,
    getWorkspaceNotificationCounts,
    hasWorkspaceSignalIndicator,
} from '../lib/workspaceNotifications';

export function useWorkspaceNotifications() {
    const {
        project,
        loading: projectLoading,
        error: projectError,
        hasApiKey,
        apiKeySource,
    } = useDashboardProjectContext();
    const {
        stats,
        loading: statsLoading,
        error: statsError,
    } = useDashboardStats('7d', hasApiKey);

    const notifications = useMemo(
        () => buildWorkspaceNotifications(stats, hasApiKey, project?.name ?? null),
        [hasApiKey, project?.name, stats],
    );
    const counts = useMemo(
        () => getWorkspaceNotificationCounts(notifications),
        [notifications],
    );

    return {
        project,
        hasApiKey,
        apiKeySource,
        notifications,
        counts,
        actionableCount: getWorkspaceNotificationActionableCount(counts),
        hasSignalIndicator: hasWorkspaceSignalIndicator(notifications),
        loading: projectLoading || (hasApiKey && statsLoading),
        error: projectError ?? statsError ?? null,
        stats,
    };
}
