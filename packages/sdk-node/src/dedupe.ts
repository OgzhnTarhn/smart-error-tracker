/**
 * Simple in-memory dedupe: drops events with the same signature
 * if they arrive within `intervalMs` of each other.
 */
const seen = new Map<string, number>();
const MAX_CACHE = 200;

export function isDuplicate(signature: string, intervalMs: number): boolean {
    const now = Date.now();
    const last = seen.get(signature);
    if (last && now - last < intervalMs) {
        return true;
    }
    if (seen.size >= MAX_CACHE) {
        const oldest = [...seen.entries()].sort((a, b) => a[1] - b[1])[0];
        if (oldest) seen.delete(oldest[0]);
    }
    seen.set(signature, now);
    return false;
}
