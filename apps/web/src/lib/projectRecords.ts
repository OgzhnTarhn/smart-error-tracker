import type { AdminProjectListItem, ProjectContext } from './api';

export type ProjectPlatform = 'react' | 'nextjs' | 'nodejs' | 'express' | 'other';
export type ProjectRuntimeType = 'frontend' | 'backend' | 'fullstack';

export interface StoredProjectRecord {
    projectId: string;
    name: string;
    key: string | null;
    platform: ProjectPlatform;
    runtimeType: ProjectRuntimeType;
    createdAt: string;
    apiKey?: string;
    keyLabel?: string;
    isDraft?: boolean;
}

export interface ProjectCatalogItem {
    id: string;
    name: string;
    key: string | null;
    createdAt: string | null;
    apiKeyCount: number;
    platform: ProjectPlatform;
    runtimeType: ProjectRuntimeType;
    apiKey?: string;
    keyLabel?: string;
    isDraft: boolean;
    isConnected: boolean;
}

const STORAGE_KEY = 'smart-error-tracker.project-records';

export const PLATFORM_OPTIONS: Array<{
    value: ProjectPlatform;
    label: string;
    description: string;
}> = [
    {
        value: 'react',
        label: 'React',
        description: 'Browser SDK for React and Vite applications.',
    },
    {
        value: 'nextjs',
        label: 'Next.js',
        description: 'Hybrid setup for client and server surfaces.',
    },
    {
        value: 'nodejs',
        label: 'Node.js',
        description: 'Process-level tracking for services and workers.',
    },
    {
        value: 'express',
        label: 'Express',
        description: 'Express middleware with request context capture.',
    },
    {
        value: 'other',
        label: 'Other',
        description: 'Generic onboarding when the platform is still flexible.',
    },
];

export const RUNTIME_TYPE_OPTIONS: Array<{
    value: ProjectRuntimeType;
    label: string;
    description: string;
}> = [
    {
        value: 'frontend',
        label: 'Frontend',
        description: 'Browser-facing app with client-side errors.',
    },
    {
        value: 'backend',
        label: 'Backend',
        description: 'API, worker, or service runtime.',
    },
    {
        value: 'fullstack',
        label: 'Fullstack',
        description: 'Application with both browser and server execution.',
    },
];

export const PLATFORM_LABELS: Record<ProjectPlatform, string> = {
    react: 'React',
    nextjs: 'Next.js',
    nodejs: 'Node.js',
    express: 'Express',
    other: 'Other',
};

export const RUNTIME_TYPE_LABELS: Record<ProjectRuntimeType, string> = {
    frontend: 'Frontend',
    backend: 'Backend',
    fullstack: 'Fullstack',
};

function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readStoredProjectMap() {
    if (!canUseStorage()) return {} as Record<string, StoredProjectRecord>;

    try {
        const rawValue = window.localStorage.getItem(STORAGE_KEY);
        if (!rawValue) return {};

        const parsed = JSON.parse(rawValue) as Record<string, StoredProjectRecord>;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed;
    } catch {
        return {};
    }
}

function writeStoredProjectMap(projectMap: Record<string, StoredProjectRecord>) {
    if (!canUseStorage()) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projectMap));
}

function createDraftProjectId() {
    const suffix = Math.random().toString(36).slice(2, 8);
    return `draft-${Date.now().toString(36)}-${suffix}`;
}

export function listStoredProjectRecords() {
    return Object.values(readStoredProjectMap()).sort((left, right) => {
        const leftTime = Date.parse(left.createdAt);
        const rightTime = Date.parse(right.createdAt);
        return rightTime - leftTime;
    });
}

export function getStoredProjectRecord(projectId: string) {
    return readStoredProjectMap()[projectId] ?? null;
}

export function upsertStoredProjectRecord(
    projectId: string,
    updates: Partial<Omit<StoredProjectRecord, 'projectId'>>,
) {
    const storedProjectMap = readStoredProjectMap();
    const existing = storedProjectMap[projectId];

    const nextRecord: StoredProjectRecord = {
        projectId,
        name: updates.name ?? existing?.name ?? 'Untitled project',
        key:
            updates.key === undefined
                ? existing?.key ?? null
                : updates.key,
        platform: updates.platform ?? existing?.platform ?? 'other',
        runtimeType: updates.runtimeType ?? existing?.runtimeType ?? 'backend',
        createdAt: updates.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
        apiKey: updates.apiKey ?? existing?.apiKey,
        keyLabel: updates.keyLabel ?? existing?.keyLabel,
        isDraft: updates.isDraft ?? existing?.isDraft ?? false,
    };

    storedProjectMap[projectId] = nextRecord;
    writeStoredProjectMap(storedProjectMap);
    return nextRecord;
}

export function createDraftProjectRecord(input: {
    name: string;
    platform: ProjectPlatform;
    runtimeType: ProjectRuntimeType;
}) {
    const projectId = createDraftProjectId();

    return upsertStoredProjectRecord(projectId, {
        name: input.name.trim(),
        platform: input.platform,
        runtimeType: input.runtimeType,
        createdAt: new Date().toISOString(),
        isDraft: true,
    });
}

export function buildProjectCatalog(input: {
    adminProjects: AdminProjectListItem[];
    connectedProject: ProjectContext | null;
}) {
    const storedProjects = listStoredProjectRecords();
    const storedProjectMap = new Map(
        storedProjects.map((project) => [project.projectId, project]),
    );
    const catalog = new Map<string, ProjectCatalogItem>();
    const connectedProjectId = input.connectedProject?.id ?? null;

    for (const project of input.adminProjects) {
        const storedProject = storedProjectMap.get(project.id);
        catalog.set(project.id, {
            id: project.id,
            name: project.name,
            key: project.key,
            createdAt: project.createdAt,
            apiKeyCount: project.apiKeyCount,
            platform: storedProject?.platform ?? 'other',
            runtimeType: storedProject?.runtimeType ?? 'backend',
            apiKey: storedProject?.apiKey,
            keyLabel: storedProject?.keyLabel,
            isDraft: false,
            isConnected: connectedProjectId === project.id,
        });
    }

    if (input.connectedProject && !catalog.has(input.connectedProject.id)) {
        const storedProject = storedProjectMap.get(input.connectedProject.id);
        catalog.set(input.connectedProject.id, {
            id: input.connectedProject.id,
            name: input.connectedProject.name,
            key: input.connectedProject.key,
            createdAt: storedProject?.createdAt ?? null,
            apiKeyCount: storedProject?.apiKey ? 1 : 0,
            platform: storedProject?.platform ?? 'other',
            runtimeType: storedProject?.runtimeType ?? 'backend',
            apiKey: storedProject?.apiKey,
            keyLabel: storedProject?.keyLabel,
            isDraft: false,
            isConnected: true,
        });
    }

    for (const storedProject of storedProjects) {
        if (catalog.has(storedProject.projectId)) continue;

        catalog.set(storedProject.projectId, {
            id: storedProject.projectId,
            name: storedProject.name,
            key: storedProject.key ?? null,
            createdAt: storedProject.createdAt,
            apiKeyCount: storedProject.apiKey ? 1 : 0,
            platform: storedProject.platform,
            runtimeType: storedProject.runtimeType,
            apiKey: storedProject.apiKey,
            keyLabel: storedProject.keyLabel,
            isDraft: storedProject.isDraft ?? false,
            isConnected: connectedProjectId === storedProject.projectId,
        });
    }

    return Array.from(catalog.values()).sort((left, right) => {
        const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
        const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
        return rightTime - leftTime || left.name.localeCompare(right.name);
    });
}

export function getPlatformLabel(platform: ProjectPlatform) {
    return PLATFORM_LABELS[platform];
}

export function getRuntimeTypeLabel(runtimeType: ProjectRuntimeType) {
    return RUNTIME_TYPE_LABELS[runtimeType];
}
