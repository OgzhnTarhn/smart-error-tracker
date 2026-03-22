import CopyButton from './CopyButton';

interface CodeSnippetCardProps {
    title: string;
    description?: string;
    code: string;
    copyLabel?: string;
}

export default function CodeSnippetCard({
    title,
    description,
    code,
    copyLabel = 'snippet',
}: CodeSnippetCardProps) {
    return (
        <div className="enterprise-panel-muted overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--enterprise-border)] px-4 py-4">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{title}</div>
                    {description ? (
                        <p className="mt-1 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                            {description}
                        </p>
                    ) : null}
                </div>
                <CopyButton label={copyLabel} value={code} />
            </div>

            <pre className="overflow-x-auto px-4 py-4 text-sm leading-7 text-orange-50">
                <code>{code}</code>
            </pre>
        </div>
    );
}
