import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/' },
    { label: 'Issues', path: '/issues' },
] as const;

function isActivePath(pathname: string, itemPath: string) {
    if (itemPath === '/') {
        return pathname === '/' || pathname === '/dashboard';
    }
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function DashboardNavbar() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <nav className="dash-navbar px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-8">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 group cursor-pointer"
                >
                    <svg className="w-7 h-7 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 19h20L12 2zm0 4l6.5 11h-13L12 6z" />
                    </svg>
                    <span className="text-base font-bold text-white">Smart Error Tracker</span>
                </button>
                <div className="hidden md:flex items-center gap-1">
                    {NAV_ITEMS.map((item) => {
                        const active = isActivePath(pathname, item.path);
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => navigate(item.path)}
                                className={`px-3 py-1.5 text-sm rounded-md transition-colors cursor-pointer ${active
                                    ? 'text-orange-400 bg-orange-500/10'
                                    : 'text-[var(--dash-text-muted)] hover:text-white'
                                    }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="dash-search hidden sm:flex items-center gap-2 px-3 py-2 w-52">
                    <svg className="w-4 h-4 text-[var(--dash-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-sm text-[var(--dash-text-dim)]">Search events...</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-xs font-bold text-white">
                    U
                </div>
            </div>
        </nav>
    );
}
