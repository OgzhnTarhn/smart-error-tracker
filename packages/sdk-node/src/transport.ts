import type { EventPayload } from './types';
import { safeStringify } from './utils';

const SDK_NAME = '@smart-error-tracker/node';
const SDK_VERSION = '0.1.0';

/**
 * Send event to the error tracker API.
 * Fire-and-forget: never throws, never crashes the host process.
 */
export async function sendEvent(
    baseUrl: string,
    apiKey: string,
    payload: Omit<EventPayload, 'sdk' | 'timestamp'>,
    timeoutMs: number,
    debug: boolean,
): Promise<void> {
    const fullPayload: EventPayload = {
        ...payload,
        timestamp: new Date().toISOString(),
        sdk: { name: SDK_NAME, version: SDK_VERSION },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const body = safeStringify(fullPayload);
        const res = await fetch(`${baseUrl}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body,
            signal: controller.signal,
        });

        if (!res.ok && debug) {
            console.warn(`[SET Node SDK] Event rejected: ${res.status}`);
        }
    } catch (err) {
        if (debug) {
            console.warn('[SET Node SDK] Failed to send event:', err);
        }
    } finally {
        clearTimeout(timer);
    }
}
