import { useCallback, useEffect, useState } from 'react';
import {
    getDashboardApiKey,
    getDashboardApiKeySource,
    getProjectContext,
    type DashboardApiKeySource,
    type ProjectContext,
} from '../lib/api';

interface UseDashboardProjectContextResult {
    project: ProjectContext | null;
    loading: boolean;
    error: string | null;
    hasApiKey: boolean;
    apiKeySource: DashboardApiKeySource;
    refresh: () => Promise<boolean>;
}

export function useDashboardProjectContext(): UseDashboardProjectContextResult {
    const [project, setProject] = useState<ProjectContext | null>(null);
    const [loading, setLoading] = useState(Boolean(getDashboardApiKey()));
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const apiKey = getDashboardApiKey();
        if (!apiKey) {
            setProject(null);
            setError(null);
            setLoading(false);
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await getProjectContext();
            if (!response.ok || !response.project) {
                throw new Error(response.error ?? 'Failed to load project context');
            }

            setProject(response.project);
            return true;
        } catch (err: unknown) {
            setProject(null);
            setError(
                err instanceof Error ? err.message : 'Failed to load project context',
            );
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return {
        project,
        loading,
        error,
        hasApiKey: Boolean(getDashboardApiKey()),
        apiKeySource: getDashboardApiKeySource(),
        refresh,
    };
}
