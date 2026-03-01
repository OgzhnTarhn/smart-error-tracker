import type { SdkConfig, CaptureMessageOptions } from './types';
import { normalizeError, parseTopFrame, buildContext } from './utils';
import { sendEvent } from './transport';
import { isDuplicate } from './dedupe';

// ─── Internal State ──────────────────────────────────────

let _config: SdkConfig | null = null;
let _handlersInstalled = false;

function warn(msg: string) {
    if (_config?.debug !== false) {
        console.warn(`[SET SDK] ${msg}`);
    }
}

function getConfig(): SdkConfig | null {
    if (!_config) {
        warn('SDK not initialized. Call init() first.');
    }
    return _config;
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
 *   baseUrl: 'http://localhost:3000',
 *   apiKey: 'set_xxxxxxx',
 *   environment: 'production',
 *   release: '1.0.0',
 * });
 *
 * installGlobalHandlers();
 * ```
 */
export function init(config: SdkConfig): void {
    _config = {
        dedupeIntervalMs: 2000,
        timeoutMs: 5000,
        debug: true,
        ...config,
    };
    if (_config.debug) {
        console.log('[SET SDK] Initialized', {
            baseUrl: _config.baseUrl,
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
export type { SdkConfig, CaptureMessageOptions, EventPayload } from './types';
