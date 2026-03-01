// ─── Types ───────────────────────────────────────────────

export interface SdkConfig {
    baseUrl: string;
    apiKey: string;
    environment?: string;
    release?: string;
    /** Max events per dedupe window (default: drop duplicates within 2s) */
    dedupeIntervalMs?: number;
    /** Fetch timeout in ms (default: 5000) */
    timeoutMs?: number;
    /** Enable console warnings (default: true) */
    debug?: boolean;
}

export interface EventPayload {
    source: 'frontend';
    message: string;
    stack: string | null;
    context: Record<string, unknown> | null;
    environment: string | null;
    releaseVersion: string | null;
    level: 'error' | 'warn' | 'info';
    timestamp: string;
    sdk: { name: string; version: string };
}

export interface CaptureMessageOptions {
    level?: 'error' | 'warn' | 'info';
    extras?: Record<string, unknown>;
}
