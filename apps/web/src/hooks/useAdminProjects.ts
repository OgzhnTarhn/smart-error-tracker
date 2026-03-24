import { useCallback, useEffect, useState } from 'react';
import {
    getAdminProjects,
    type AdminProjectListItem,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface UseAdminProjectsResult {
    projects: AdminProjectListItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<boolean>;
}

export function useAdminProjects(): UseAdminProjectsResult {
    const { isAuthenticated, session } = useAuth();
    const [projects, setProjects] = useState<AdminProjectListItem[]>([]);
    const [loading, setLoading] = useState(isAuthenticated);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!isAuthenticated) {
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
    }, [isAuthenticated, session?.token]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { projects, loading, error, refresh };
}
