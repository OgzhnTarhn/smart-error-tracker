import type { EventSourceMapResolution } from '../../lib/api';

interface SourceMapSummaryProps {
    sourceMap: EventSourceMapResolution;
}

function normalizeOriginalSourcePath(
    file: string | null | undefined,
): string | null {
    const value = file?.trim();
    if (!value) return null;

    let normalized = value
        .replace(/^webpack:\/\/\/?/, '')
        .replace(/^vite:\/\/\/?/, '')
        .replace(/^\.\/+/, '')
        .replace(/^(?:\.\.\/)+/, '');

    // If source maps only return the file name, show it as src/<file>.
    const isBareFileName = !normalized.includes('/');
    const hasLikelySourceExt = /\.[a-z0-9]+$/i.test(normalized);
    if (isBareFileName && hasLikelySourceExt) {
        normalized = `src/${normalized}`;
    }

    return normalized;
}

function formatLocation(
    file: string | null | undefined,
    line: number | null | undefined,
    column: number | null | undefined,
) {
    const normalizedFile = file?.trim() || 'Original location unavailable';
    if (line == null) return normalizedFile;
    if (column == null) return `${normalizedFile}:${line}`;
    return `${normalizedFile}:${line}:${column}`;
}

export default function SourceMapSummary({ sourceMap }: SourceMapSummaryProps) {
    const originalFile = normalizeOriginalSourcePath(sourceMap.original.source);
    const originalLocation = formatLocation(
        originalFile,
        sourceMap.original.line,
        sourceMap.original.column,
    );
    const minifiedLocation = formatLocation(
        sourceMap.minified.file,
        sourceMap.minified.line,
        sourceMap.minified.column,
    );

    return (
        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-300">
                    Source map result
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border bg-emerald-500/15 text-emerald-200 border-emerald-500/30">
                    Source mapped
                </span>
            </div>

            <div className="mt-2 grid gap-2 text-xs">
                <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Original source
                    </div>
                    <div className="mt-1 font-mono text-slate-100 break-all">
                        {originalLocation}
                    </div>
                    {sourceMap.original.name && (
                        <div className="mt-1 text-slate-300">
                            Function: <span className="font-mono">{sourceMap.original.name}</span>
                        </div>
                    )}
                </div>

                <div className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2.5 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                        Minified frame
                    </div>
                    <div className="mt-1 font-mono text-slate-300 break-all">
                        {minifiedLocation}
                    </div>
                    {sourceMap.minified.functionName && (
                        <div className="mt-1 text-slate-400">
                            Function: <span className="font-mono">{sourceMap.minified.functionName}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
