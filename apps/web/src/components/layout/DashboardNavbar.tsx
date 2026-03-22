import { useLocation, useNavigate } from 'react-router-dom';

type NavItemKey = 'dashboard' | 'projects' | 'issues' | 'settings';

interface DashboardNavbarProps {
    activeItem?: NavItemKey;
    projectName?: string;
}

const NAV_ITEMS: Array<{ key: NavItemKey; label: string; path?: string }> = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { key: 'projects', label: 'Projects', path: '/projects' },
    { key: 'issues', label: 'Issues', path: '/issues' },
    { key: 'settings', label: 'Settings', path: '/settings' },
];

function resolveActiveItem(pathname: string): NavItemKey {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/issues' || pathname.startsWith('/issues/')) return 'issues';
    if (pathname === '/settings') return 'settings';
    return 'projects';
}

export default function DashboardNavbar({
    activeItem,
    projectName,
}: DashboardNavbarProps) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const resolvedActiveItem = activeItem ?? resolveActiveItem(pathname);

    return (
        <nav className="dash-navbar z-40 border-b border-[var(--dash-border)] bg-[#111315]">
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-6 text-[var(--dash-text)]">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <svg className="h-7 w-7 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
                        </svg>
                        <span className="text-base font-bold text-[var(--dash-text)]">Smart Error Tracker</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {NAV_ITEMS.map((item) => {
                            const isActive = resolvedActiveItem === item.key;
                            const isDisabled = !item.path;

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => item.path && navigate(item.path)}
                                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${isActive
                                        ? 'border-[var(--dash-border-strong)] bg-[#1a1d20] text-[var(--dash-text)]'
                                        : isDisabled
                                            ? 'border-transparent text-[var(--dash-text-dim)] cursor-default'
                                            : 'border-transparent text-[var(--dash-text-muted)] hover:border-[var(--dash-border)] hover:bg-[#1a1d20] hover:text-[var(--dash-text)]'
                                        }`}
                                >
                                    <span className="font-medium">{item.label}</span>
                                    {item.key === 'issues' && projectName ? (
                                        <span className="ml-2 rounded bg-[#1a1d20] px-1.5 py-0.5 text-[10px] text-[var(--dash-text-dim)]">
                                            {projectName}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--dash-border)] bg-[#1a1d20] text-xs font-bold text-[var(--dash-text)]">
                    U
                </div>
            </div>
        </nav>
    );
}
