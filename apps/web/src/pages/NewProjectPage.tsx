import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { createAdminProject, hasAdminConsoleAccess } from '../lib/api';
import {
    createDraftProjectRecord,
    PLATFORM_OPTIONS,
    RUNTIME_TYPE_OPTIONS,
    type ProjectPlatform,
    type ProjectRuntimeType,
    upsertStoredProjectRecord,
} from '../lib/projectRecords';

function PrimaryButton({
    label,
    onClick,
    disabled = false,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-full border border-orange-400/20 bg-orange-500/15 px-5 py-3 text-sm font-semibold text-orange-100 transition-colors hover:border-orange-400/30 hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {label}
        </button>
    );
}

function SecondaryButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-full border border-[var(--enterprise-border)] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[var(--enterprise-text-muted)] transition-colors hover:border-white/12 hover:text-white"
        >
            {label}
        </button>
    );
}

export default function NewProjectPage() {
    const navigate = useNavigate();
    const [projectName, setProjectName] = useState('');
    const [platform, setPlatform] = useState<ProjectPlatform>('react');
    const [runtimeType, setRuntimeType] = useState<ProjectRuntimeType>('frontend');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        const trimmedName = projectName.trim();
        if (!trimmedName) {
            setError('Project name is required.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            if (hasAdminConsoleAccess) {
                const response = await createAdminProject({
                    name: trimmedName,
                    label: runtimeType,
                });

                if (!response.ok || !response.project) {
                    throw new Error(response.error ?? 'Project could not be created.');
                }

                upsertStoredProjectRecord(response.project.id, {
                    name: response.project.name,
                    key: response.project.key,
                    platform,
                    runtimeType,
                    apiKey: response.apiKey,
                    keyLabel: runtimeType,
                    createdAt: new Date().toISOString(),
                    isDraft: false,
                });

                navigate(`/projects/${response.project.id}/setup`);
                return;
            }

            const draftProject = createDraftProjectRecord({
                name: trimmedName,
                platform,
                runtimeType,
            });

            navigate(`/projects/${draftProject.projectId}/setup`);
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : 'Project could not be created.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="projects" showSearch={false} />

            <main className="mx-auto max-w-[920px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-7">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="enterprise-chip">Create Project</span>
                                <span className="text-xs text-[var(--enterprise-text-muted)]">
                                    First step of the onboarding flow
                                </span>
                            </div>
                            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-[2.5rem]">
                                Start a new project workspace
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                Keep the initial form small. The next page will handle SDK setup, API
                                key usage, and the first test event.
                            </p>
                        </div>

                        <SecondaryButton
                            label="Back to Projects"
                            onClick={() => navigate('/projects')}
                        />
                    </div>
                </section>

                <div className="mt-6">
                    <DashboardSectionCard
                        title="Project Details"
                        description="Capture only the minimum information needed for onboarding."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label
                                    htmlFor="project-name"
                                    className="text-sm font-semibold text-white"
                                >
                                    Project Name
                                </label>
                                <input
                                    id="project-name"
                                    type="text"
                                    value={projectName}
                                    onChange={(event) => setProjectName(event.target.value)}
                                    placeholder="checkout-web"
                                    className="w-full rounded-2xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-3.5 text-[15px] text-white outline-none placeholder:text-[var(--enterprise-text-dim)] focus:border-orange-500/35"
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="platform"
                                        className="text-sm font-semibold text-white"
                                    >
                                        Platform
                                    </label>
                                    <select
                                        id="platform"
                                        value={platform}
                                        onChange={(event) =>
                                            setPlatform(event.target.value as ProjectPlatform)
                                        }
                                        className="enterprise-select w-full rounded-2xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-3.5 text-[15px] outline-none focus:border-orange-500/35"
                                    >
                                        {PLATFORM_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                        {
                                            PLATFORM_OPTIONS.find(
                                                (option) => option.value === platform,
                                            )?.description
                                        }
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="runtime-type"
                                        className="text-sm font-semibold text-white"
                                    >
                                        Runtime Type
                                    </label>
                                    <select
                                        id="runtime-type"
                                        value={runtimeType}
                                        onChange={(event) =>
                                            setRuntimeType(
                                                event.target.value as ProjectRuntimeType,
                                            )
                                        }
                                        className="enterprise-select w-full rounded-2xl border border-[var(--enterprise-border)] bg-black/35 px-4 py-3.5 text-[15px] outline-none focus:border-orange-500/35"
                                    >
                                        {RUNTIME_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                        {
                                            RUNTIME_TYPE_OPTIONS.find(
                                                (option) => option.value === runtimeType,
                                            )?.description
                                        }
                                    </p>
                                </div>
                            </div>

                            {!hasAdminConsoleAccess ? (
                                <div className="rounded-[20px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-7 text-amber-100">
                                    <code className="font-mono text-amber-50">
                                        VITE_ADMIN_TOKEN
                                    </code>{' '}
                                    is not configured, so this submit will create a temporary local
                                    draft instead of a backend project. The setup page will still
                                    render the full onboarding flow.
                                </div>
                            ) : null}

                            {error ? (
                                <div className="rounded-[20px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                    {error}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap gap-3 pt-2">
                                <PrimaryButton
                                    label={submitting ? 'Creating...' : 'Create Project'}
                                    onClick={() => void handleSubmit()}
                                    disabled={submitting}
                                />
                                <SecondaryButton
                                    label="Cancel"
                                    onClick={() => navigate('/projects')}
                                />
                            </div>
                        </div>
                    </DashboardSectionCard>
                </div>
            </main>
        </div>
    );
}
