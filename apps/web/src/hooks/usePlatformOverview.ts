import { useCallback, useState } from 'react';
import {
    getPlatformOverviewSnapshot,
    type PlatformOverviewData,
    type PlatformOverviewEnvironment,
    type PlatformOverviewRange,
} from '../lib/platformOverviewMock';

const REFRESH_DELAY_MS = 180;

interface UsePlatformOverviewResult {
    data: PlatformOverviewData;
    loading: boolean;
    lastUpdated: Date;
    refresh: () => Promise<void>;
}

export function usePlatformOverview(
    range: PlatformOverviewRange,
    environment: PlatformOverviewEnvironment,
): UsePlatformOverviewResult {
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(() => new Date());
    const data: PlatformOverviewData = getPlatformOverviewSnapshot(range, environment);

    const refresh = useCallback(async () => {
        setLoading(true);

        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, REFRESH_DELAY_MS);
        });

        setLastUpdated(new Date());
        setLoading(false);
    }, []);

    return { data, loading, lastUpdated, refresh };
}
