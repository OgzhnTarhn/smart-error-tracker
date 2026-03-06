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
}: IssueFilterBarProps) {
    const environmentDisabled = environmentOptions.length === 0;
    const releaseDisabled = releaseOptions.length === 0;

    return (
        <div className="mb-6 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1 min-w-[260px]">
                    <svg
                        className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
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
                        placeholder="Search by title or message..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <FilterSelect
                        value={status}
                        onChange={(value) => onStatusChange(value as IssueStatusFilter)}
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
        </div>
    );
}

interface FilterSelectProps {
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
    disabled?: boolean;
}

function FilterSelect({
    value,
    onChange,
    children,
    disabled = false,
}: FilterSelectProps) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="min-w-[150px] rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {children}
        </select>
    );
}
