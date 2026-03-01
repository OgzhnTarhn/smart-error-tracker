interface SdkConfig {
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
interface EventPayload {
    source: 'frontend';
    message: string;
    stack: string | null;
    context: Record<string, unknown> | null;
    environment: string | null;
    releaseVersion: string | null;
    level: 'error' | 'warn' | 'info';
    timestamp: string;
    sdk: {
        name: string;
        version: string;
    };
}
interface CaptureMessageOptions {
    level?: 'error' | 'warn' | 'info';
    extras?: Record<string, unknown>;
}

/**
 * Initialize the Smart Error Tracker SDK.
 *
 * @example
 * ```ts
 * import { init, installGlobalHandlers } from '@smart-error-tracker/browser';
 *
 * init({
 *   baseUrl: 'http://localhost:3000',
 *   apiKey: 'set_xxxxxxx',
 *   environment: 'production',
 *   release: '1.0.0',
 * });
 *
 * installGlobalHandlers();
 * ```
 */
declare function init(config: SdkConfig): void;
/**
 * Capture an exception and send it to the error tracker.
 */
declare function captureException(error: unknown, extras?: Record<string, unknown>): void;
/**
 * Capture a custom message and send it to the error tracker.
 */
declare function captureMessage(message: string, options?: CaptureMessageOptions): void;
/**
 * Install global error handlers to automatically capture unhandled errors.
 * Call this once after `init()`.
 */
declare function installGlobalHandlers(): void;

export { type CaptureMessageOptions, type EventPayload, type SdkConfig, captureException, captureMessage, init, installGlobalHandlers };
