import type { ReactNode } from 'react';
import type { IssueLevelFilter, IssueStatusFilter } from './types';

interface IssueFilterBarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    status: IssueStatusFilter;
    onStatusChange: (value: IssueStatusFilter) => void;
    environment: string;
    onEnvironmentChange: (value: string) => void;
    level: IssueLevelFilter;
    onLevelChange: (value: IssueLevelFilter) => void;
    release: string;
    onReleaseChange: (value: string) => void;
    environmentOptions: string[];
    releaseOptions: string[];
    onClearFilters?: () => void;
    activeFilterCount?: number;
    resultCountLabel?: string;
    variant?: 'default' | 'enterprise';
}

export default function IssueFilterBar({
    searchValue,
    onSearchChange,
    status,
    onStatusChange,
    environment,
    onEnvironmentChange,
    level,
    onLevelChange,
    release,
    onReleaseChange,
    environmentOptions,
    releaseOptions,
    onClearFilters,
    activeFilterCount = 0,
    resultCountLabel,
    variant = 'default',
}: IssueFilterBarProps) {
    const environmentDisabled = environmentOptions.length === 0;
    const releaseDisabled = releaseOptions.length === 0;
    const isEnterprise = variant === 'enterprise';

    return (
        <div
            className={`mb-6 ${
                isEnterprise
                    ? 'enterprise-panel rounded-[24px] p-5 sm:p-6'
                    : 'rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4'
            }`}
        >
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex-1">
                        {isEnterprise ? (
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Filter workspace
                                    </div>
                                    <div className="mt-1 text-sm text-[var(--enterprise-text-muted)]">
                                        Narrow issue groups by status, environment, level, release, or title.
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {resultCountLabel ? (
                                        <span className="enterprise-chip">{resultCountLabel}</span>
                                    ) : null}
                                    {activeFilterCount > 0 && onClearFilters ? (
                                        <button
                                            type="button"
                                            onClick={onClearFilters}
                                            className="rounded-xl border border-[#303030] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300 transition-colors hover:border-slate-200 hover:text-white"
                                        >
                                            Clear filters
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div className="relative min-w-[260px]">
                            <svg
                                className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${
                                    isEnterprise
                                        ? 'text-[var(--enterprise-text-dim)]'
                                        : 'text-slate-500'
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                            <input
                                type="text"
                                value={searchValue}
                                onChange={(event) => onSearchChange(event.target.value)}
                                placeholder="Search by title or fingerprint..."
                                className={`w-full py-3 pl-10 pr-4 text-sm outline-none ${
                                    isEnterprise
                                        ? 'enterprise-panel-soft rounded-2xl border border-[var(--enterprise-border)] text-white placeholder:text-[var(--enterprise-text-dim)] focus:border-orange-500/40'
                                        : 'rounded-xl border border-slate-700 bg-slate-900/70 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20'
                                }`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <FilterSelect
                            value={status}
                            onChange={(value) => onStatusChange(value as IssueStatusFilter)}
                            variant={variant}
                        >
                            <option value="all">All status</option>
                            <option value="open">Open</option>
                            <option value="resolved">Resolved</option>
                            <option value="ignored">Ignored</option>
                        </FilterSelect>

                        <FilterSelect
                            value={environment}
                            onChange={onEnvironmentChange}
                            disabled={environmentDisabled}
                            variant={variant}
                        >
                            <option value="all">All environments</option>
                            {environmentOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </FilterSelect>

                        <FilterSelect
                            value={level}
                            onChange={(value) => onLevelChange(value as IssueLevelFilter)}
                            variant={variant}
                        >
                            <option value="all">All levels</option>
                            <option value="error">Error</option>
                            <option value="warn">Warn</option>
                            <option value="info">Info</option>
                        </FilterSelect>

                        <FilterSelect
                            value={release}
                            onChange={onReleaseChange}
                            disabled={releaseDisabled}
                            variant={variant}
                        >
                            <option value="all">All releases</option>
                            {releaseOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </FilterSelect>
                    </div>
                </div>

                {isEnterprise && activeFilterCount > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--enterprise-text-dim)]">
                            Active filters
                        </span>
                        {status !== 'all' ? <FilterPill label={`Status: ${status}`} /> : null}
                        {environment !== 'all' ? <FilterPill label={`Env: ${environment}`} /> : null}
                        {level !== 'all' ? <FilterPill label={`Level: ${level}`} /> : null}
                        {release !== 'all' ? <FilterPill label={`Release: ${release}`} /> : null}
                        {searchValue.trim() ? (
                            <FilterPill label={`Search: ${searchValue.trim()}`} />
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function FilterPill({ label }: { label: string }) {
    return (
        <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-[var(--enterprise-text-muted)]">
            {label}
        </span>
    );
}

interface FilterSelectProps {
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
    disabled?: boolean;
    variant?: 'default' | 'enterprise';
}

function FilterSelect({
    value,
    onChange,
    children,
    disabled = false,
    variant = 'default',
}: FilterSelectProps) {
    const isEnterprise = variant === 'enterprise';

    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            style={isEnterprise ? { colorScheme: 'dark' } : undefined}
            className={`min-w-[150px] px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                isEnterprise
                    ? 'enterprise-select enterprise-panel-soft rounded-xl border border-[var(--enterprise-border)] pr-8 font-medium text-white focus:border-orange-500/40 focus:outline-none'
                    : 'rounded-lg border border-slate-700 bg-slate-900/70 text-slate-100 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
            }`}
        >
            {children}
        </select>
    );
}
