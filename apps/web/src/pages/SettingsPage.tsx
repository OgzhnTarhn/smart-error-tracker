import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { getDashboardApiKeySource, hasAdminConsoleAccess } from '../lib/api';

export default function SettingsPage() {
    const apiKeySource = getDashboardApiKeySource();

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="settings" showSearch={false} />

            <main className="mx-auto max-w-[1100px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-7">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="enterprise-chip">Settings</span>
                        <span className="text-xs text-[var(--enterprise-text-muted)]">
                            Minimal workspace settings surface
                        </span>
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                        Workspace settings
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                        This first product pass keeps settings intentionally small and focused on the
                        local dashboard workspace.
                    </p>
                </section>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <DashboardSectionCard
                        title="Dashboard API Key Source"
                        description="Shows where the active dashboard key is currently coming from."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="rounded-[20px] border border-[var(--enterprise-border)] bg-black/30 p-5 text-sm text-[var(--enterprise-text-muted)]">
                            Current source: <span className="text-white">{apiKeySource}</span>
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Admin Console"
                        description="Local-only admin controls used by project onboarding."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="rounded-[20px] border border-[var(--enterprise-border)] bg-black/30 p-5 text-sm text-[var(--enterprise-text-muted)]">
                            {hasAdminConsoleAccess
                                ? 'Admin endpoints are enabled in this dashboard environment.'
                                : 'Admin endpoints are disabled. Project creation falls back to local draft mode.'}
                        </div>
                    </DashboardSectionCard>
                </div>
            </main>
        </div>
    );
}
