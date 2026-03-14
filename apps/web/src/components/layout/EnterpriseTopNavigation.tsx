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
    { key: 'issues', label: 'Issues', path: '/issues' },
    { key: 'projects', label: 'Projects', path: '/' },
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
                <div className="flex min-w-0 items-center gap-8">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="flex shrink-0 items-center gap-3 text-left"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.25)]">
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
                                    className={`border-b-2 pb-1 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'border-orange-500 text-white'
                                            : 'border-transparent text-slate-500 hover:text-slate-200'
                                    } ${isDisabled ? 'cursor-default opacity-100 hover:text-slate-500' : ''}`}
                                >
                                    {item.label}
                                    {item.key === 'issues' && projectName ? (
                                        <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--enterprise-text-dim)]">
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
                        <div className="relative hidden lg:block">
                            <svg
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
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
                                placeholder="Search traces, users..."
                                className="w-60 rounded-full border border-[#262626] bg-[#111] py-2 pl-9 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-orange-500/60"
                            />
                        </div>
                    ) : null}
                    <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-slate-200"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="1.9"
                                d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.44V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.16c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0"
                            />
                        </svg>
                    </button>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d3b3b] text-xs font-semibold text-emerald-100">
                        {avatarLabel}
                    </div>
                </div>
            </div>
        </header>
    );
}
