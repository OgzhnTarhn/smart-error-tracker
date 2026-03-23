import { Link } from 'react-router-dom';
import PublicSiteChrome from '../components/public/PublicSiteChrome';

function FlowRow({
    eyebrow,
    title,
    description,
    asideTitle,
    asideDetail,
}: {
    eyebrow: string;
    title: string;
    description: string;
    asideTitle: string;
    asideDetail: string;
}) {
    return (
        <section className="grid gap-6 border-t border-[var(--enterprise-border)] py-8 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                    {eyebrow}
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    {title}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--enterprise-text-muted)] md:text-base">
                    {description}
                </p>
            </div>

            <div className="border-l border-[rgba(107,130,255,0.24)] pl-5">
                <div className="text-sm font-semibold text-white">{asideTitle}</div>
                <p className="mt-3 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                    {asideDetail}
                </p>
            </div>
        </section>
    );
}

export default function ProductPage() {
    return (
        <PublicSiteChrome>
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-10 md:px-6 xl:px-8 xl:py-12">
                <section className="max-w-4xl">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cbd7ff]">
                        Product Flow
                    </div>
                    <h1 className="mt-5 text-5xl font-semibold tracking-tight text-white md:text-6xl">
                        The product is structured around monitoring, triage, setup, and prevention.
                    </h1>
                    <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--enterprise-text-muted)]">
                        This page is here so visitors can understand the operating model without entering
                        the private dashboard first. The goal is not to show marketing fluff; it is to
                        explain how the workspace actually helps a team respond to production failures.
                    </p>
                </section>

                <section className="rounded-[34px] border border-[var(--enterprise-border)] px-6 py-8 md:px-8">
                    <FlowRow
                        eyebrow="01 Monitor"
                        title="Start with event pressure, not isolated screenshots."
                        description="The workspace begins with totals, trend windows, peak days, top issues, and environment or release distribution. This creates a stable monitoring layer before engineers jump into individual issue detail."
                        asideTitle="What teams see first"
                        asideDetail="Daily volume, issue counts, severity distribution, and the shape of recent error pressure across the selected project."
                    />
                    <FlowRow
                        eyebrow="02 Triage"
                        title="Move from grouped issues into detail without losing context."
                        description="When an issue matters, the flow carries engineers into grouped issue detail, event stacks, source map resolution, status changes, related fixes, and similar historical incidents."
                        asideTitle="Why this matters"
                        asideDetail="Triage is usually where tools become fragmented. Keeping the flow connected reduces handoff and repeated context gathering."
                    />
                    <FlowRow
                        eyebrow="03 Setup"
                        title="Project creation and onboarding are treated like product flows, not admin leftovers."
                        description="Projects, SDK setup, API key handling, and runtime targeting live inside a guided flow so teams can connect applications without leaving the workspace."
                        asideTitle="Operational value"
                        asideDetail="A team can create a project, generate the key, follow setup, and return to monitoring from the same product surface."
                    />
                    <FlowRow
                        eyebrow="04 Prevent"
                        title="Repeated incidents should produce better future responses."
                        description="Issue history, fix memory, similar incidents, and prevention insight all push the workspace beyond passive monitoring. The product should help teams respond better the next time too."
                        asideTitle="Long-term effect"
                        asideDetail="The dashboard becomes a memory system for recurring failures instead of a short-lived list of error screens."
                    />
                </section>

                <section className="grid gap-6 rounded-[34px] border border-[var(--enterprise-border)] bg-[linear-gradient(180deg,rgba(18,25,36,0.94),rgba(10,14,20,0.98))] px-6 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                            Demo path
                        </div>
                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                            Want to see the actual workspace instead of reading about it?
                        </h2>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--enterprise-text-muted)] md:text-base">
                            Use the demo entry point and jump into the seeded project workspace directly.
                        </p>
                    </div>

                    <Link
                        to="/demo"
                        className="ui-primary-button px-5 py-3 text-sm font-semibold text-white"
                    >
                        Open Demo Entry
                    </Link>
                </section>
            </div>
        </PublicSiteChrome>
    );
}
