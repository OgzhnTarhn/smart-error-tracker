export const ISSUE_STATUS_VALUES = ['open', 'resolved', 'ignored'] as const;
export type IssueStatus = (typeof ISSUE_STATUS_VALUES)[number];
export type IssueStatusFilter = 'all' | IssueStatus;

export const ISSUE_LEVEL_VALUES = ['error', 'warn', 'info'] as const;
export type IssueLevel = (typeof ISSUE_LEVEL_VALUES)[number];
export type IssueLevelFilter = 'all' | IssueLevel;

export interface IssueFilters {
    search: string;
    status: IssueStatusFilter;
    environment: string;
    level: IssueLevelFilter;
    release: string;
}

export interface IssueListItem {
    id: string;
    fingerprint: string;
    title: string;
    status: string;
    isRegression: boolean;
    regressionCount: number;
    lastRegressedAt: string | null;
    eventCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    environment: string | null;
    releaseVersion: string | null;
    level: string | null;
}
