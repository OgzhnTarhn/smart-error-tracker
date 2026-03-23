import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import {
    clearDashboardApiKey,
    getDashboardApiKeyOverride,
    getDashboardApiKeySource,
    hasAdminConsoleAccess,
    type DashboardApiKeySource,
} from '../lib/api';

function formatKeySourceLabel(source: DashboardApiKeySource) {
    if (source === 'runtime') return 'Runtime override';
    if (source === 'env') return 'Environment key';
    return 'Not configured';
}

function getKeySourceTone(source: DashboardApiKeySource) {
    if (source === 'runtime') return 'ui-accent-badge';
    if (source === 'env') return 'ui-success-badge';
    return 'ui-warning-badge';
}

function maskSecret(value: string) {
    if (!value) return 'Not set';
    if (value.length <= 10) return value;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function MetricCard({
    eyebrow,
    value,
    detail,
    toneClassName,
}: {
    eyebrow: string;
    value: string;
    detail: string;
    toneClassName: string;
}) {
    return (
        <div className="enterprise-metric-card px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                {eyebrow}
            </div>
            <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClassName}`}>
                {value}
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-[var(--enterprise-text-muted)]">
                {detail}
            </p>
        </div>
    );
}

function DetailRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1 border-b border-[var(--enterprise-border)] py-3 last:border-b-0 last:pb-0 first:pt-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                {label}
            </div>
            <div className={`text-sm text-[var(--enterprise-text)] ${mono ? 'font-mono break-all' : ''}`}>
                {value}
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const navigate = useNavigate();
    const [apiKeySource, setApiKeySource] = useState<DashboardApiKeySource>(getDashboardApiKeySource());
    const [runtimeOverride, setRuntimeOverride] = useState(getDashboardApiKeyOverride());

    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const isLocalApiTarget = apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1');
    const hasRuntimeOverride = Boolean(runtimeOverride);

    const handleClearRuntimeOverride = () => {
        clearDashboardApiKey();
        setRuntimeOverride('');
        setApiKeySource(getDashboardApiKeySource());
    };

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="settings" showSearch={false} />

            <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-7">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="enterprise-chip">Settings</span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${hasAdminConsoleAccess ? 'ui-success-badge' : 'ui-warning-badge'}`}>
                            {hasAdminConsoleAccess ? 'Admin Enabled' : 'Local Draft Mode'}
                        </span>
                    </div>
                    <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                        Workspace controls
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                        Review how this dashboard authenticates, which API target it uses, and
                        whether admin project management is available in the current workspace.
                    </p>
                </section>

                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    <MetricCard
                        eyebrow="Dashboard Auth"
                        value={formatKeySourceLabel(apiKeySource)}
                        detail={
                            apiKeySource === 'runtime'
                                ? 'The browser session is using a locally stored override key.'
                                : apiKeySource === 'env'
                                    ? 'Requests are using the environment-provided dashboard key.'
                                    : 'No dashboard key is configured yet for authenticated requests.'
                        }
                        toneClassName={getKeySourceTone(apiKeySource)}
                    />
                    <MetricCard
                        eyebrow="API Target"
                        value={isLocalApiTarget ? 'Local Endpoint' : 'Custom Endpoint'}
                        detail={`The dashboard currently points to ${apiBaseUrl}.`}
                        toneClassName={isLocalApiTarget ? 'ui-accent-badge' : 'ui-success-badge'}
                    />
                    <MetricCard
                        eyebrow="Admin Console"
                        value={hasAdminConsoleAccess ? 'Connected' : 'Unavailable'}
                        detail={
                            hasAdminConsoleAccess
                                ? 'Project creation and API key generation can run against admin endpoints.'
                                : 'Project creation stays in draft mode until an admin token is configured.'
                        }
                        toneClassName={hasAdminConsoleAccess ? 'ui-success-badge' : 'ui-warning-badge'}
                    />
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <DashboardSectionCard
                        title="Dashboard authentication"
                        description="Runtime overrides take precedence over environment keys."
                        variant="enterprise"
                        contentClassName="p-6"
                        action={hasRuntimeOverride ? (
                            <button
                                type="button"
                                onClick={handleClearRuntimeOverride}
                                className="ui-secondary-button px-3 py-2 text-xs font-semibold text-[var(--enterprise-text)]"
                            >
                                Clear Runtime Key
                            </button>
                        ) : undefined}
                    >
                        <div className="space-y-4">
                            {apiKeySource === 'none' ? (
                                <div className="ui-warning-banner rounded-2xl px-4 py-3 text-sm leading-6">
                                    No dashboard API key is active. Authenticated issue and analytics
                                    requests will fail until a key is connected.
                                </div>
                            ) : null}

                            <div className="rounded-[22px] border border-[var(--enterprise-border)] bg-black/30 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                            Active source
                                        </div>
                                        <div className="mt-2 text-lg font-semibold text-white">
                                            {formatKeySourceLabel(apiKeySource)}
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getKeySourceTone(apiKeySource)}`}>
                                        {apiKeySource === 'none' ? 'Attention' : 'Healthy'}
                                    </span>
                                </div>

                                <div className="mt-5 space-y-1">
                                    <DetailRow label="Runtime override" value={maskSecret(runtimeOverride)} mono />
                                    <DetailRow label="Browser storage" value="localStorage" />
                                    <DetailRow
                                        label="Session behavior"
                                        value={
                                            hasRuntimeOverride
                                                ? 'The local override will continue until it is cleared or replaced.'
                                                : 'The dashboard will read the configured environment key when available.'
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Admin console"
                        description="Controls project creation, API key generation, and admin listing."
                        variant="enterprise"
                        contentClassName="p-6"
                    >
                        <div className="space-y-4">
                            <div className={`rounded-[22px] border p-5 ${hasAdminConsoleAccess ? 'ui-success-panel' : 'ui-warning-panel'}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-lg font-semibold text-white">
                                        {hasAdminConsoleAccess ? 'Admin access is available' : 'Admin access is not configured'}
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${hasAdminConsoleAccess ? 'ui-success-badge' : 'ui-warning-badge'}`}>
                                        {hasAdminConsoleAccess ? 'Ready' : 'Draft Only'}
                                    </span>
                                </div>
                                <p className="mt-3 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                    {hasAdminConsoleAccess
                                        ? 'Project setup can generate real API keys and sync project records from the admin workspace.'
                                        : 'Project creation will stay local until VITE_ADMIN_TOKEN is configured for this dashboard.'}
                                </p>
                            </div>

                            <div className="rounded-[22px] border border-[var(--enterprise-border)] bg-black/30 p-5">
                                <DetailRow
                                    label="Project creation"
                                    value={hasAdminConsoleAccess ? 'Creates backend projects immediately.' : 'Creates local drafts only.'}
                                />
                                <DetailRow
                                    label="API key generation"
                                    value={hasAdminConsoleAccess ? 'Available from setup screens.' : 'Blocked until admin access is enabled.'}
                                />
                                <DetailRow
                                    label="Projects listing"
                                    value={hasAdminConsoleAccess ? 'Reads from admin endpoints and merges local onboarding state.' : 'Shows connected projects and local drafts only.'}
                                />
                            </div>
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="API target"
                        description="The base URL used for dashboard fetches."
                        variant="enterprise"
                        contentClassName="p-6"
                    >
                        <div className="space-y-4">
                            <div className="rounded-[22px] border border-[var(--enterprise-border)] bg-black/30 p-5">
                                <DetailRow label="Base URL" value={apiBaseUrl} mono />
                                <DetailRow label="Transport" value="HTTPS or HTTP via fetch" />
                                <DetailRow
                                    label="Target profile"
                                    value={isLocalApiTarget ? 'Local development API target.' : 'Custom API target configured through the environment.'}
                                />
                            </div>
                            <div className="ui-info-banner rounded-2xl px-4 py-3 text-sm leading-6">
                                Requests attach the dashboard API key through the <code className="font-mono">x-api-key</code> header when a key is available.
                            </div>
                        </div>
                    </DashboardSectionCard>

                    <DashboardSectionCard
                        title="Next actions"
                        description="Jump directly to the screens that usually follow from settings."
                        variant="enterprise"
                        contentClassName="p-6"
                    >
                        <div className="grid gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/projects')}
                                className="ui-primary-button flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-white"
                            >
                                <span>Open projects workspace</span>
                                <span className="text-[10px] uppercase tracking-[0.18em] text-white/70">Projects</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/projects/new')}
                                className="ui-secondary-button flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--enterprise-text)]"
                            >
                                <span>Create a new project</span>
                                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">New</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/issues')}
                                className="ui-secondary-button flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--enterprise-text)]"
                            >
                                <span>Review issue stream</span>
                                <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">Issues</span>
                            </button>
                        </div>
                    </DashboardSectionCard>
                </div>
            </main>
        </div>
    );
}
