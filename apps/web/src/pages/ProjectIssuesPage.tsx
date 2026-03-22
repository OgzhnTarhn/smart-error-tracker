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
            className="rounded-full border border-orange-400/20 bg-orange-500/15 px-5 py-3 text-sm font-semibold text-orange-100 transition-colors hover:border-orange-400/30 hover:bg-orange-500/20"
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
        if (!id || !storedProject?.apiKey || connectedProject?.id === id || attemptedAutoConnect) {
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
        Boolean(storedProject?.apiKey) &&
        connectedProject?.id !== id &&
        !connectError &&
        (workspaceLoading || attemptedAutoConnect);

    if (isAutoConnecting) {
        return (
            <div className="enterprise-shell min-h-screen text-slate-100">
                <EnterpriseTopNavigation activeItem="issues" showSearch={false} />
                <main className="mx-auto max-w-[920px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                    <div className="enterprise-panel-soft h-80 animate-pulse rounded-[30px] border border-[var(--enterprise-border)]" />
                </main>
            </div>
        );
    }

    return (
        <div className="enterprise-shell min-h-screen text-slate-100">
            <EnterpriseTopNavigation activeItem="issues" showSearch={false} />

            <main className="mx-auto max-w-[920px] px-5 py-8 md:px-6 xl:px-8 xl:py-9">
                <DashboardSectionCard
                    title="Project Issues"
                    description="This route keeps the issues workspace anchored to project setup."
                    contentClassName="p-6"
                    variant="enterprise"
                >
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">
                                {project?.name ?? 'Project issues workspace'}
                            </h2>
                            <p className="mt-3 text-sm leading-7 text-[var(--enterprise-text-muted)]">
                                {project?.isDraft
                                    ? 'This is a local draft. Generate a real project and API key before issues can load from the backend.'
                                    : storedProject?.apiKey
                                        ? 'A saved API key exists for this project, but the dashboard is not yet connected to it.'
                                        : 'This project does not have a saved raw API key in the browser yet. Open setup and generate or paste one before entering the issues view.'}
                            </p>
                        </div>

                        {connectedProject ? (
                            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-[var(--enterprise-text-muted)]">
                                Dashboard is currently connected to <span className="text-white">{connectedProject.name}</span>.
                            </div>
                        ) : null}

                        {connectError ? (
                            <div className="rounded-[18px] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-100">
                                {connectError}
                            </div>
                        ) : null}

                        <div className="flex flex-wrap gap-3">
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
