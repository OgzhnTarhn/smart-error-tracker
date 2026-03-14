import { useLocation, useNavigate } from 'react-router-dom';

type NavItemKey = 'dashboard' | 'projects' | 'issues' | 'alerts';

interface DashboardNavbarProps {
    activeItem?: NavItemKey;
    projectName?: string;
}

const NAV_ITEMS: Array<{ key: NavItemKey; label: string; path?: string }> = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { key: 'projects', label: 'Projects', path: '/' },
    { key: 'issues', label: 'Issues', path: '/issues' },
    { key: 'alerts', label: 'Alerts' },
];

function resolveActiveItem(pathname: string): NavItemKey {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/issues' || pathname.startsWith('/issues/')) return 'issues';
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
        <nav className="dash-navbar z-40 border-b border-[var(--dash-border)] bg-[#10101a]">
            <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-6 text-slate-100">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 cursor-pointer"
                    >
                        <svg className="w-7 h-7 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
                        </svg>
                        <span className="text-base font-bold text-white">Smart Error Tracker</span>
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
                                        ? 'border-orange-500/40 bg-orange-500/10 text-orange-300'
                                        : isDisabled
                                            ? 'border-transparent text-[var(--dash-text-dim)] cursor-default'
                                            : 'border-transparent text-[var(--dash-text-muted)] hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <span className="font-medium">{item.label}</span>
                                    {item.key === 'issues' && projectName ? (
                                        <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--dash-text-dim)]">
                                            {projectName}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-xs font-bold text-white">
                    U
                </div>
            </div>
        </nav>
    );
}
