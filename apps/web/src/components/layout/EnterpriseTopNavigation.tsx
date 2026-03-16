import { useNavigate } from 'react-router-dom';

type NavItemKey = 'dashboard' | 'projects' | 'issues' | 'alerts';

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
    { key: 'alerts', label: 'Alerts' },
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
            <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-5 py-3 md:px-6 xl:px-8">
                <div className="flex min-w-0 items-center gap-6 xl:gap-8">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="flex shrink-0 items-center gap-3 text-left"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-500/15 text-orange-200 shadow-[0_0_18px_rgba(249,115,22,0.18)]">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M7 17V9m5 8V5m5 12v-6"
                                />
                            </svg>
                        </div>
                        <div className="hidden leading-none sm:block">
                            <div className="text-sm font-bold uppercase tracking-[0.04em] text-white">
                                Smart Error Tracker
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-[var(--enterprise-text-dim)]">
                                Enterprise Monitor
                            </div>
                        </div>
                    </button>

                    <nav className="hidden items-center gap-6 md:flex">
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
                                    className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'border-orange-500/30 bg-orange-500/12 text-white shadow-[0_10px_24px_rgba(249,115,22,0.08)]'
                                            : 'border-transparent text-[var(--enterprise-text-muted)] hover:border-white/8 hover:bg-white/[0.04] hover:text-white'
                                    } ${isDisabled ? 'cursor-default opacity-70 hover:border-transparent hover:bg-transparent hover:text-[var(--enterprise-text-muted)]' : ''}`}
                                >
                                    {item.label}
                                    {item.key === 'issues' && projectName ? (
                                        <span className="ml-2 rounded-full border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] text-[var(--enterprise-text-dim)]">
                                            {projectName}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    {showSearch ? (
                        <div className="relative hidden xl:block">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--enterprise-text-dim)]"
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
                                className="w-72 rounded-full border border-[var(--enterprise-border)] bg-[#0d0d0d] py-2.5 pl-9 pr-4 text-sm text-slate-200 outline-none placeholder:text-[var(--enterprise-text-dim)] focus:border-orange-500/40"
                            />
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--enterprise-border)] bg-white/[0.03] text-[var(--enterprise-text-muted)] transition-colors hover:text-white"
                    >
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-[#050505]" />
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.9"
                                d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.44V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.16c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0"
                            />
                        </svg>
                    </button>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-gradient-to-br from-[#203133] to-[#162325] text-xs font-semibold text-emerald-100 shadow-[0_10px_28px_rgba(0,0,0,0.2)]">
                        {avatarLabel}
                    </div>
                </div>
            </div>
        </header>
    );
}
