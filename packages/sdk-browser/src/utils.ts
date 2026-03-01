/**
 * Safe JSON.stringify — handles circular references and caps payload size.
 */
export function safeStringify(obj: unknown, maxLength = 50_000): string {
    const seen = new WeakSet();
    const json = JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
        }
        if (typeof value === 'string' && value.length > 10_000) {
            return value.slice(0, 10_000) + '…[truncated]';
        }
        return value;
    });
    if (json && json.length > maxLength) {
        return json.slice(0, maxLength) + '…[truncated]';
    }
    return json ?? '{}';
}

/**
 * Extract message and stack from any thrown value.
 */
export function normalizeError(input: unknown): { message: string; stack: string | null } {
    if (input instanceof Error) {
        return {
            message: input.message || String(input),
            stack: input.stack ?? null,
        };
    }
    if (typeof input === 'string') {
        return { message: input, stack: null };
    }
    return { message: String(input), stack: null };
}

/**
 * Parse the first meaningful frame from a stack trace string.
 * Used for dedupe signature.
 */
export function parseTopFrame(stack: string | null): string {
    if (!stack) return '';
    const lines = stack.split('\n').map(l => l.trim()).filter(Boolean);
    // Skip the first line (error message) and find the first "at ..." frame
    for (const line of lines) {
        if (line.startsWith('at ')) {
            return line;
        }
    }
    return lines[1] ?? lines[0] ?? '';
}

/**
 * Build context object with browser metadata + user extras.
 */
export function buildContext(extras?: Record<string, unknown>): Record<string, unknown> {
    const ctx: Record<string, unknown> = {};
    if (typeof window !== 'undefined') {
        ctx.url = window.location.href;
        ctx.userAgent = navigator.userAgent;
        ctx.language = navigator.language;
        ctx.viewport = { width: window.innerWidth, height: window.innerHeight };
    }
    if (extras) {
        Object.assign(ctx, extras);
    }
    return ctx;
}
