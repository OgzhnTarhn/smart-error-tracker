import { Link } from 'react-router-dom';
import PublicSiteChrome from '../components/public/PublicSiteChrome';

function NarrativeSection({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="border-t border-[var(--enterprise-border)] py-6 first:border-t-0 first:pt-0 last:pb-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                {eyebrow}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--enterprise-text-muted)] md:text-base">
                {description}
            </p>
        </div>
    );
}

export default function LandingPage() {
    return (
        <PublicSiteChrome>
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-10 md:px-6 xl:px-8 xl:py-12">
                <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                    <div className="max-w-3xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cbd7ff]">
                            Public Entry Layer
                        </div>
                        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white md:text-7xl">
                            Error tracking for teams that want signal, not noise.
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--enterprise-text-muted)] md:text-lg">
                            Smart Error Tracker turns raw production failures into an operational flow:
                            monitor event volume, group repeated issues, inspect stack traces, review AI
                            guidance, and move into project setup without bouncing between tools.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                to="/demo"
                                className="ui-primary-button px-5 py-3 text-sm font-semibold text-white"
                            >
                                Open Demo Access
                            </Link>
                            <Link
                                to="/product"
                                className="ui-secondary-button px-5 py-3 text-sm font-semibold text-[var(--enterprise-text)]"
                            >
                                Explore Product Flow
                            </Link>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[34px] border border-[var(--enterprise-border)] bg-[linear-gradient(180deg,rgba(18,25,36,0.96),rgba(9,13,19,0.98))] p-6 shadow-[0_20px_55px_rgba(2,6,23,0.32)]">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                            Product Sequence
                        </div>
                        <div className="mt-5 space-y-5">
                            <div className="border-l border-[rgba(107,130,255,0.28)] pl-4">
                                <div className="text-sm font-semibold text-white">Detect live pressure</div>
                                <p className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    Watch the event curve, identify spike days, and understand where issue volume is concentrating.
                                </p>
                            </div>
                            <div className="border-l border-[rgba(107,130,255,0.28)] pl-4">
                                <div className="text-sm font-semibold text-white">Triage grouped failures</div>
                                <p className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    Open grouped issues, compare repeats, review source maps, and move into issue detail without losing context.
                                </p>
                            </div>
                            <div className="border-l border-[rgba(107,130,255,0.28)] pl-4">
                                <div className="text-sm font-semibold text-white">Improve future prevention</div>
                                <p className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    Turn repeated fixes and issue history into operational guidance for the next incident.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="text-sm leading-8 text-[var(--enterprise-text-muted)] md:text-base">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                            Why this exists
                        </div>
                        <p className="mt-4">
                            Most error dashboards stop at "something failed." This product is trying to
                            connect the full path from incoming event pressure to grouped issue context,
                            then into setup, source maps, fix memory, and prevention insight.
                        </p>
                        <p className="mt-5">
                            Public visitors should understand that value before they ever hit a login
                            wall. The actual workspace stays private, but the reason to care about the
                            product should be visible immediately.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-[34px] border border-[var(--enterprise-border)] bg-[linear-gradient(180deg,rgba(17,24,35,0.96),rgba(10,14,20,0.98))] p-7">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                            Access model
                        </div>
                        <div className="mt-5 grid gap-6">
                            <div>
                                <div className="text-lg font-semibold text-white">Public pages</div>
                                <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                    Landing, product explanation, and demo entry stay open so anyone can understand what the platform does.
                                </p>
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-white">Private workspace</div>
                                <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                    Project creation, issue streams, setup flows, and settings remain part of the internal dashboard experience.
                                </p>
                            </div>
                            <div>
                                <div className="text-lg font-semibold text-white">Demo user path</div>
                                <p className="mt-2 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                    A dedicated demo session can enter the existing demo project directly, so visitors can see the real workspace flow without creating an account first.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-[34px] border border-[var(--enterprise-border)] px-6 py-8 md:px-8">
                    <NarrativeSection
                        eyebrow="Monitor"
                        title="Observe the event curve, not just the existence of issues."
                        description="The workspace focuses on volume, trend shape, peak days, and route-level pressure so teams can see when errors are rising before triage becomes chaotic."
                    />
                    <NarrativeSection
                        eyebrow="Investigate"
                        title="Open grouped issue detail with context that stays connected."
                        description="Stack traces, source maps, release tags, environment context, issue history, and related fixes all stay inside the same operational flow."
                    />
                    <NarrativeSection
                        eyebrow="Act"
                        title="Move from debugging into prevention instead of repeating the same fix cycle."
                        description="The product is opinionated about turning what the team already learned into the next better response, not just documenting the last failure."
                    />
                </section>

                <section className="grid gap-6 rounded-[34px] border border-[var(--enterprise-border)] bg-[linear-gradient(180deg,rgba(18,25,36,0.95),rgba(10,14,20,0.98))] px-6 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                            Next step
                        </div>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                            Enter through the demo flow or continue into auth.
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--enterprise-text-muted)] md:text-base">
                            If you want to inspect the seeded workspace immediately, use the demo path.
                            If you want the standard entry points, continue into login or register.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/demo"
                            className="ui-primary-button px-5 py-3 text-sm font-semibold text-white"
                        >
                            Continue as Demo
                        </Link>
                        <Link
                            to="/login"
                            className="ui-secondary-button px-5 py-3 text-sm font-semibold text-[var(--enterprise-text)]"
                        >
                            Open Login
                        </Link>
                    </div>
                </section>
            </div>
        </PublicSiteChrome>
    );
}
