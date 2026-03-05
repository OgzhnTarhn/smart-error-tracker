import type { SdkInitConfig, ResolvedSdkConfig, CaptureMessageOptions } from './types';
import { normalizeError, parseTopFrame, buildContext, parseDsn } from './utils';
import { sendEvent } from './transport';
import { isDuplicate } from './dedupe';

// ─── Internal State ──────────────────────────────────────

let _config: ResolvedSdkConfig | null = null;
let _handlersInstalled = false;

function warn(msg: string) {
    if (_config?.debug !== false) {
        console.warn(`[SET SDK] ${msg}`);
    }
}

function getConfig(): ResolvedSdkConfig | null {
    if (!_config) {
        warn('SDK not initialized. Call init() first.');
    }
    return _config;
}

function resolveConfig(config: SdkInitConfig): ResolvedSdkConfig | null {
    if ('dsn' in config && typeof config.dsn === 'string') {
        const parsedDsn = parseDsn(config.dsn);
        if (!parsedDsn) {
            return null;
        }

        return {
            baseUrl: parsedDsn.baseUrl,
            apiKey: parsedDsn.apiKey,
            projectId: parsedDsn.projectId,
            environment: config.environment,
            release: config.release,
            dedupeIntervalMs: config.dedupeIntervalMs ?? 2000,
            timeoutMs: config.timeoutMs ?? 5000,
            debug: config.debug ?? true,
        };
    }

    return {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        environment: config.environment,
        release: config.release,
        dedupeIntervalMs: config.dedupeIntervalMs ?? 2000,
        timeoutMs: config.timeoutMs ?? 5000,
        debug: config.debug ?? true,
    };
}

// ─── Public API ──────────────────────────────────────────

/**
 * Initialize the Smart Error Tracker SDK.
 *
 * @example
 * ```ts
 * import { init, installGlobalHandlers } from '@smart-error-tracker/browser';
 *
 * init({
 *   dsn: 'http://set_xxxxxxx@localhost:3000/project_1',
 *   environment: 'production',
 *   release: '1.0.0',
 * });
 *
 * installGlobalHandlers();
 * ```
 */
export function init(config: SdkInitConfig): void {
    const resolved = resolveConfig(config);
    if (!resolved) {
        _config = null;
        console.warn('[SET SDK] Invalid DSN. Use format: https://set_key@host/projectId');
        return;
    }

    _config = resolved;

    if (_config.debug) {
        console.log('[SET SDK] Initialized', {
            baseUrl: _config.baseUrl,
            projectId: _config.projectId,
            environment: _config.environment,
            release: _config.release,
        });
    }
}

/**
 * Capture an exception and send it to the error tracker.
 */
export function captureException(error: unknown, extras?: Record<string, unknown>): void {
    const config = getConfig();
    if (!config) return;

    const { message, stack } = normalizeError(error);
    const signature = `${message}|${parseTopFrame(stack)}`;

    if (isDuplicate(signature, config.dedupeIntervalMs!)) {
        if (config.debug) warn(`Duplicate dropped: ${message}`);
        return;
    }

    sendEvent(config.baseUrl, config.apiKey, {
        source: 'frontend',
        message,
        stack,
        context: buildContext(extras),
        environment: config.environment ?? null,
        releaseVersion: config.release ?? null,
        level: 'error',
    }, config.timeoutMs!, config.debug!);
}

/**
 * Capture a custom message and send it to the error tracker.
 */
export function captureMessage(message: string, options?: CaptureMessageOptions): void {
    const config = getConfig();
    if (!config) return;

    const signature = `msg|${message}`;
    if (isDuplicate(signature, config.dedupeIntervalMs!)) {
        if (config.debug) warn(`Duplicate dropped: ${message}`);
        return;
    }

    sendEvent(config.baseUrl, config.apiKey, {
        source: 'frontend',
        message,
        stack: null,
        context: buildContext(options?.extras),
        environment: config.environment ?? null,
        releaseVersion: config.release ?? null,
        level: options?.level ?? 'info',
    }, config.timeoutMs!, config.debug!);
}

/**
 * Install global error handlers to automatically capture unhandled errors.
 * Call this once after `init()`.
 */
export function installGlobalHandlers(): void {
    const config = getConfig();
    if (!config) return;
    if (_handlersInstalled) {
        warn('Global handlers already installed.');
        return;
    }
    if (typeof window === 'undefined') {
        warn('Not a browser environment, skipping global handlers.');
        return;
    }

    // Unhandled errors
    window.addEventListener('error', (event: ErrorEvent) => {
        captureException(event.error ?? event.message, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
        });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        captureException(event.reason ?? 'Unhandled Promise Rejection');
    });

    _handlersInstalled = true;
    if (config.debug) {
        console.log('[SET SDK] Global handlers installed (error + unhandledrejection)');
    }
}

// Re-export types
export type { SdkInitConfig, SdkInitConfig as SdkConfig, CaptureMessageOptions, EventPayload } from './types';
