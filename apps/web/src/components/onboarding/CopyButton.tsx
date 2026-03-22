import { useState } from 'react';

interface CopyButtonProps {
    label: string;
    value: string;
}

export default function CopyButton({ label, value }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    return (
        <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-muted)] transition-colors hover:text-white"
        >
            {copied ? `${label} copied` : `Copy ${label}`}
        </button>
    );
}
