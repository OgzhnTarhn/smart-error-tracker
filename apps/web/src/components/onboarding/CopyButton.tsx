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
            className="ui-secondary-button h-8 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
        >
            {copied ? `${label} copied` : `Copy ${label}`}
        </button>
    );
}
