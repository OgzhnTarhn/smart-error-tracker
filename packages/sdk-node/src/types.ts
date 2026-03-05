// ─── Types ───────────────────────────────────────────────

export interface SdkConfig {
    environment?: string;
    release?: string;
    /** Drop duplicate events within this window (default: 2000ms) */
    dedupeIntervalMs?: number;
    /** Fetch timeout in ms (default: 5000) */
    timeoutMs?: number;
    /** Enable console warnings (default: true) */
    debug?: boolean;
    /** Event source identifier (default: "backend") */
    source?: string;
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
    source: string;
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
