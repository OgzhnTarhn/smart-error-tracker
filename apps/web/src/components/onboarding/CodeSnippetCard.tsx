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
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--enterprise-border)] px-3.5 py-3">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--enterprise-text)]">{title}</div>
                    {description ? (
                        <p className="mt-1 text-xs leading-5 text-[var(--enterprise-text-muted)]">
                            {description}
                        </p>
                    ) : null}
                </div>
                <CopyButton label={copyLabel} value={code} />
            </div>

            <pre className="ui-terminal-block overflow-x-auto px-3.5 py-3 text-[13px] leading-6">
                <code>{code}</code>
            </pre>
        </div>
    );
}
