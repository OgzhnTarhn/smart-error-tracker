// ─── Types ───────────────────────────────────────────────

export interface SdkConfig {
    baseUrl: string;
    apiKey: string;
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
