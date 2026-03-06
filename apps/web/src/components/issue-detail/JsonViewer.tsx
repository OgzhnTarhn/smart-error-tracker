interface JsonViewerProps {
    data: unknown;
    emptyMessage: string;
    maxHeightClassName?: string;
}

function toPrettyJson(data: unknown) {
    try {
        return JSON.stringify(data, null, 2);
    } catch {
        return String(data);
    }
}

export default function JsonViewer({
    data,
    emptyMessage,
    maxHeightClassName = 'max-h-[420px]',
}: JsonViewerProps) {
    if (data === null || data === undefined) {
        return (
            <div className="p-5 text-sm text-slate-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <pre className={`overflow-auto ${maxHeightClassName} p-4 text-sm font-mono whitespace-pre-wrap break-words text-slate-300 leading-relaxed`}>
            {toPrettyJson(data)}
        </pre>
    );
}
