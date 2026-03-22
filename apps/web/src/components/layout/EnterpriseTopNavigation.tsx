import { useNavigate } from 'react-router-dom';

type NavItemKey = 'dashboard' | 'projects' | 'issues' | 'settings';

interface EnterpriseTopNavigationProps {
    activeItem: NavItemKey;
    projectName?: string;
    showSearch?: boolean;
    avatarLabel?: string;
}

const NAV_ITEMS: Array<{
    key: NavItemKey;
    label: string;
    path?: string;
}> = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { key: 'projects', label: 'Projects', path: '/projects' },
    { key: 'issues', label: 'Issues', path: '/issues' },
    { key: 'settings', label: 'Settings', path: '/settings' },
];

export default function EnterpriseTopNavigation({
    activeItem,
    projectName,
    showSearch = true,
    avatarLabel = 'OG',
}: EnterpriseTopNavigationProps) {
    const navigate = useNavigate();

    return (
        <header className="enterprise-header-glass sticky top-0 z-30 border-b border-[var(--enterprise-border-strong)]">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 md:px-8">
                <div className="flex min-w-0 items-center gap-4 lg:gap-6">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="flex shrink-0 items-center gap-2.5 text-left"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-600/25 bg-amber-600/10 text-amber-600">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M7 17V9m5 8V5m5 12v-6"
                                />
                            </svg>
                        </div>
                        <div className="hidden leading-none sm:block">
                            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--enterprise-text)]">
                                Smart Error Tracker
                            </div>
                            <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                                Enterprise Monitor
                            </div>
                        </div>
                    </button>

                    <nav className="hidden items-center gap-2 md:flex">
                        {NAV_ITEMS.map((item) => {
                            const isActive = item.key === activeItem;
                            const isDisabled = !item.path;

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => item.path && navigate(item.path)}
                                    disabled={isDisabled}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'border-[var(--enterprise-border-strong)] bg-[#1a1d20] text-[var(--enterprise-text)]'
                                            : 'border-transparent text-[var(--enterprise-text-muted)] hover:border-[var(--enterprise-border)] hover:bg-[#1a1d20] hover:text-[var(--enterprise-text)]'
                                    } ${isDisabled ? 'cursor-default opacity-70 hover:border-transparent hover:bg-transparent hover:text-[var(--enterprise-text-muted)]' : ''}`}
                                >
                                    {item.label}
                                    {item.key === 'issues' && projectName ? (
                                        <span className="ml-2 rounded-full border border-[var(--enterprise-border)] bg-[#16181b] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--enterprise-text-dim)]">
                                            {projectName}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-2.5">
                    {showSearch ? (
                        <div className="relative hidden xl:block">
                            <svg
                                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--enterprise-text-dim)]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
                                />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search projects, issues, releases"
                                className="ui-input h-8 w-64 rounded-md py-1.5 pl-8 pr-3 text-sm"
                            />
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[var(--enterprise-border)] bg-[#16181b] text-[var(--enterprise-text-muted)] transition-colors hover:bg-[#1a1d20] hover:text-[var(--enterprise-text)]"
                    >
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-600" />
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.9"
                                d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.44V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.16c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0"
                            />
                        </svg>
                    </button>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--enterprise-border)] bg-[#1a1d20] text-[11px] font-semibold text-[var(--enterprise-text)]">
                        {avatarLabel}
                    </div>
                </div>
            </div>
        </header>
    );
}
