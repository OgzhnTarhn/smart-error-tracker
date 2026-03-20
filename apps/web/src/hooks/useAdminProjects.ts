import { useCallback, useEffect, useState } from 'react';
import {
    getAdminProjects,
    hasAdminConsoleAccess,
    type AdminProjectListItem,
} from '../lib/api';

interface UseAdminProjectsResult {
    projects: AdminProjectListItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<boolean>;
}

export function useAdminProjects(): UseAdminProjectsResult {
    const [projects, setProjects] = useState<AdminProjectListItem[]>([]);
    const [loading, setLoading] = useState(hasAdminConsoleAccess);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!hasAdminConsoleAccess) {
            setProjects([]);
            setError(null);
            setLoading(false);
            return false;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await getAdminProjects();
            if (!response.ok) {
                throw new Error(response.error ?? 'Failed to load projects');
            }

            setProjects(response.projects ?? []);
            return true;
        } catch (err: unknown) {
            setProjects([]);
            setError(err instanceof Error ? err.message : 'Failed to load projects');
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { projects, loading, error, refresh };
}
