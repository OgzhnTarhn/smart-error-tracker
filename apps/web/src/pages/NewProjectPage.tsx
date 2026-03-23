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
            className="ui-primary-button h-9 px-3 text-sm font-semibold"
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
            className="ui-secondary-button h-9 px-3 text-sm font-semibold"
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
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <EnterpriseTopNavigation activeItem="projects" showSearch={false} />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-6">
                    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="enterprise-chip">Create Project</span>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text-muted)]">
                                    First step of the onboarding flow
                                </span>
                            </div>
                            <h1 className="mt-3 text-xl font-semibold tracking-tight text-[var(--enterprise-text)] sm:text-2xl">
                                Start a new project workspace
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Keep the initial form small. The next page will handle SDK setup, API
                                key usage, and the first test event.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <SecondaryButton
                                label="Back to Projects"
                                onClick={() => navigate('/projects')}
                            />
                        </div>
                    </div>
                </section>

                <div className="mx-auto w-full max-w-2xl">
                    <DashboardSectionCard
                        title="Project Details"
                        description="Capture only the minimum information needed for onboarding."
                        contentClassName="p-4"
                        variant="enterprise"
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="project-name"
                                    className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text-muted)]"
                                >
                                    Project Name
                                </label>
                                <input
                                    id="project-name"
                                    type="text"
                                    value={projectName}
                                    onChange={(event) => setProjectName(event.target.value)}
                                    placeholder="checkout-web"
                                    className="ui-input h-9 w-full px-3 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <label
                                        htmlFor="platform"
                                        className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text-muted)]"
                                    >
                                        Platform
                                    </label>
                                    <select
                                        id="platform"
                                        value={platform}
                                        onChange={(event) =>
                                            setPlatform(event.target.value as ProjectPlatform)
                                        }
                                        className="ui-input enterprise-select h-9 w-full px-3 text-sm"
                                    >
                                        {PLATFORM_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs leading-5 text-[var(--enterprise-text-muted)]">
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
                                        className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text-muted)]"
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
                                        className="ui-input enterprise-select h-9 w-full px-3 text-sm"
                                    >
                                        {RUNTIME_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs leading-5 text-[var(--enterprise-text-muted)]">
                                        {
                                            RUNTIME_TYPE_OPTIONS.find(
                                                (option) => option.value === runtimeType,
                                            )?.description
                                        }
                                    </p>
                                </div>
                            </div>

                            {!hasAdminConsoleAccess ? (
                                <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm leading-6">
                                    <code className="font-mono text-amber-100">
                                        VITE_ADMIN_TOKEN
                                    </code>{' '}
                                    is not configured, so this submit will create a local draft
                                    instead of a backend project. You can continue through setup and
                                    connect a real project later.
                                </div>
                            ) : null}

                            {error ? (
                                <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-100">
                                    {error}
                                </div>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
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
