// ─── Types ───────────────────────────────────────────────

export interface SdkConfig {
    environment?: string;
    release?: string;
    /** Max events per dedupe window (default: drop duplicates within 2s) */
    dedupeIntervalMs?: number;
    /** Fetch timeout in ms (default: 5000) */
    timeoutMs?: number;
    /** Enable console warnings (default: true) */
    debug?: boolean;
}

export type SdkInitConfig =
    | (SdkConfig & {
        dsn: string;
        baseUrl?: never;
        apiKey?: never;
    })
    | (SdkConfig & {
        baseUrl: string;
        apiKey: string;
        dsn?: never;
    });

export interface ResolvedSdkConfig extends SdkConfig {
    baseUrl: string;
    apiKey: string;
    projectId?: string;
}

export interface ParsedDsn {
    baseUrl: string;
    apiKey: string;
    projectId: string;
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
