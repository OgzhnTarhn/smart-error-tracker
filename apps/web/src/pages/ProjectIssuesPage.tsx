import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useAdminProjects } from '../hooks/useAdminProjects';
import { useDashboardProjectContext } from '../hooks/useDashboardProjectContext';
import { setDashboardApiKey } from '../lib/api';
import { buildProjectCatalog, getStoredProjectRecord } from '../lib/projectRecords';
import IssuesPage from './IssuesPage';

function PrimaryButton({
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

export default function ProjectIssuesPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { projects: adminProjects } = useAdminProjects();
    const {
        project: connectedProject,
        loading: workspaceLoading,
        refresh: refreshWorkspace,
    } = useDashboardProjectContext();
    const [attemptedAutoConnect, setAttemptedAutoConnect] = useState(false);
    const [connectError, setConnectError] = useState<string | null>(null);
    const storedProject = useMemo(
        () => (id ? getStoredProjectRecord(id) : null),
        [id],
    );

    const catalog = useMemo(
        () =>
            buildProjectCatalog({
                adminProjects,
                connectedProject,
            }),
        [adminProjects, connectedProject],
    );

    const project = useMemo(
        () => catalog.find((item) => item.id === id) ?? null,
        [catalog, id],
    );

    useEffect(() => {
        if (
            !id
            || !storedProject?.apiKey
            || connectedProject?.id === id
            || attemptedAutoConnect
        ) {
            return;
        }

        let active = true;
        setAttemptedAutoConnect(true);
        setConnectError(null);
        setDashboardApiKey(storedProject.apiKey);

        void refreshWorkspace()
            .then((ok) => {
                if (!active || ok) return;
                setConnectError('Saved API key could not reconnect this project.');
            })
            .catch((err: unknown) => {
                if (!active) return;
                setConnectError(
                    err instanceof Error
                        ? err.message
                        : 'Saved API key could not reconnect this project.',
                );
            });

        return () => {
            active = false;
        };
    }, [
        attemptedAutoConnect,
        connectedProject?.id,
        id,
        refreshWorkspace,
        storedProject?.apiKey,
    ]);

    if (!id) {
        return <Navigate to="/projects" replace />;
    }

    if (connectedProject?.id === id) {
        return <IssuesPage />;
    }

    const isAutoConnecting =
        Boolean(storedProject?.apiKey)
        && connectedProject?.id !== id
        && !connectError
        && (workspaceLoading || attemptedAutoConnect);

    if (isAutoConnecting) {
        return (
            <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
                <EnterpriseTopNavigation activeItem="issues" showSearch={false} />
                <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 md:px-8 md:py-6">
                    <div className="enterprise-panel-soft h-64 animate-pulse rounded-md" />
                </main>
            </div>
        );
    }

    return (
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <EnterpriseTopNavigation activeItem="issues" showSearch={false} />

            <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 md:px-8 md:py-6">
                <DashboardSectionCard
                    title="Project Issues"
                    description="This route keeps the issues workspace anchored to project setup."
                    contentClassName="p-4"
                    variant="enterprise"
                >
                    <div className="space-y-3">
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--enterprise-text)]">
                                {project?.name ?? 'Project issues workspace'}
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                {project?.isDraft
                                    ? 'This is a local draft. Generate a real project and API key before issues can load from the backend.'
                                    : storedProject?.apiKey
                                        ? 'A saved API key exists for this project, but the dashboard is not yet connected to it.'
                                        : 'This project does not have a saved raw API key in the browser yet. Open setup and generate or paste one before entering the issues view.'}
                            </p>
                        </div>

                        {connectedProject ? (
                            <div className="rounded-md border border-[var(--enterprise-border)] bg-[#16181b] px-3.5 py-3 text-sm text-[var(--enterprise-text-muted)]">
                                Dashboard is currently connected to{' '}
                                <span className="text-[var(--enterprise-text)]">
                                    {connectedProject.name}
                                </span>
                                .
                            </div>
                        ) : null}

                        {connectError ? (
                            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-100">
                                {connectError}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-2">
                            <PrimaryButton
                                label="Open Setup"
                                onClick={() => navigate(`/projects/${id}/setup`)}
                            />
                            <SecondaryButton
                                label="Back to Projects"
                                onClick={() => navigate('/projects')}
                            />
                            <SecondaryButton
                                label="Open Main Issues"
                                onClick={() => navigate('/issues')}
                            />
                        </div>
                    </div>
                </DashboardSectionCard>
            </main>
        </div>
    );
}
