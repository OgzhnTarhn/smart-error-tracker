import type { SdkInitConfig, ResolvedSdkConfig, CaptureMessageOptions } from './types';
import { normalizeError, parseTopFrame, buildContext, parseDsn } from './utils';
import { sendEvent } from './transport';
import { isDuplicate } from './dedupe';

// ─── Internal State ──────────────────────────────────────

let _config: ResolvedSdkConfig | null = null;

function warn(msg: string) {
    if (_config?.debug !== false) {
        console.warn(`[SET Node SDK] ${msg}`);
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
            source: config.source ?? 'backend',
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
        source: config.source ?? 'backend',
    };
}

// ─── Public API ──────────────────────────────────────────

/**
 * Initialize the Smart Error Tracker Node.js SDK.
 *
 * @example
 * ```ts
 * import { init } from '@smart-error-tracker/node';
 *
 * init({
 *   dsn: 'http://set_xxxxxxx@localhost:3000/project_1',
 *   environment: 'production',
 *   release: '1.0.0',
 * });
 * ```
 */
export function init(config: SdkInitConfig): void {
    const resolved = resolveConfig(config);
    if (!resolved) {
        _config = null;
        console.warn('[SET Node SDK] Invalid DSN. Use format: https://set_key@host/projectId');
        return;
    }

    _config = resolved;

    if (_config.debug) {
        console.log('[SET Node SDK] Initialized', {
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
        source: config.source || 'backend',
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
        source: config.source || 'backend',
        message,
        stack: null,
        context: buildContext(options?.extras),
        environment: config.environment ?? null,
        releaseVersion: config.release ?? null,
        level: options?.level ?? 'info',
    }, config.timeoutMs!, config.debug!);
}

/**
 * Express error-handling middleware.
 * Place this AFTER all routes as the last middleware.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { init, expressErrorHandler } from '@smart-error-tracker/node';
 *
 * const app = express();
 * init({ baseUrl: '...', apiKey: '...' });
 *
 * app.get('/', (req, res) => { ... });
 *
 * // Must be last middleware
 * app.use(expressErrorHandler());
 * ```
 */
export function expressErrorHandler() {
    return (err: unknown, req: any, res: any, next: any) => {
        // Capture the error
        captureException(err, {
            method: req?.method,
            url: req?.originalUrl || req?.url,
            headers: {
                'user-agent': req?.headers?.['user-agent'],
                'content-type': req?.headers?.['content-type'],
            },
            query: req?.query,
            ip: req?.ip,
        });

        // Pass to Express default error handler
        if (res.headersSent) {
            return next(err);
        }

        const { message } = normalizeError(err);
        res.status(500).json({ error: 'internal_error', message });
    };
}

/**
 * Capture unhandled exceptions and rejections at process level.
 * Call once after init().
 */
export function installGlobalHandlers(): void {
    const config = getConfig();
    if (!config) return;

    process.on('uncaughtException', (err) => {
        captureException(err, { handler: 'uncaughtException' });
        if (config.debug) {
            console.error('[SET Node SDK] Uncaught Exception:', err);
        }
    });

    process.on('unhandledRejection', (reason) => {
        captureException(reason, { handler: 'unhandledRejection' });
        if (config.debug) {
            console.error('[SET Node SDK] Unhandled Rejection:', reason);
        }
    });

    if (config.debug) {
        console.log('[SET Node SDK] Global handlers installed (uncaughtException + unhandledRejection)');
    }
}

// Re-export types
export type { SdkInitConfig, SdkInitConfig as SdkConfig, CaptureMessageOptions, EventPayload } from './types';
