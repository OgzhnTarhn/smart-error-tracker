import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import PublicSiteChrome from './PublicSiteChrome';

interface AuthShellProps {
    eyebrow: string;
    title: string;
    description: string;
    formTitle: string;
    formDescription: string;
    alternateLabel: string;
    alternateLinkTo: string;
    alternateLinkLabel: string;
    children: ReactNode;
}

const AUTH_BULLETS = [
    'Public visitors understand the product first.',
    'Authenticated users enter project setup and issue triage.',
    'Demo access can open the existing seeded workspace immediately.',
];

export default function AuthShell({
    eyebrow,
    title,
    description,
    formTitle,
    formDescription,
    alternateLabel,
    alternateLinkTo,
    alternateLinkLabel,
    children,
}: AuthShellProps) {
    return (
        <PublicSiteChrome>
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-10 md:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)] xl:px-8 xl:py-12">
                <section className="flex flex-col justify-between">
                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cbd7ff]">
                            {eyebrow}
                        </div>
                        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-5xl">
                            {title}
                        </h1>
                        <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--enterprise-text-muted)]">
                            {description}
                        </p>
                    </div>

                    <div className="mt-10 space-y-6">
                        <div className="border-l border-[rgba(107,130,255,0.28)] pl-5">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--enterprise-text-dim)]">
                                Access Model
                            </div>
                            <div className="mt-3 text-2xl font-semibold text-white">
                                One public entry, one protected workspace
                            </div>
                            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                The dashboard stays intact. This layer only prepares the entry flow for visitors, members, and demo access.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {AUTH_BULLETS.map((item, index) => (
                                <div key={item} className="flex items-start gap-4">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(107,130,255,0.24)] bg-[rgba(107,130,255,0.12)] text-[11px] font-semibold text-[#cbd7ff]">
                                        0{index + 1}
                                    </div>
                                    <div className="pt-1 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                        {item}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-[34px] border border-[var(--enterprise-border)] bg-[linear-gradient(180deg,rgba(18,25,36,0.98),rgba(12,17,24,0.98))] shadow-[0_22px_60px_rgba(2,6,23,0.32)]">
                    <div className="border-b border-[var(--enterprise-border)] px-6 pb-6 pt-7">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--enterprise-text-dim)]">
                            Auth Surface
                        </div>
                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                            {formTitle}
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                            {formDescription}
                        </p>
                    </div>

                    <div className="px-6 py-6">
                        {children}

                        <div className="mt-6 border-t border-[var(--enterprise-border)] pt-5 text-sm text-[var(--enterprise-text-muted)]">
                            {alternateLabel}{' '}
                            <Link to={alternateLinkTo} className="ui-accent-link font-semibold">
                                {alternateLinkLabel}
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </PublicSiteChrome>
    );
}
