import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAuthAvatarLabel } from '../../lib/authSession';

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
    avatarLabel,
}: EnterpriseTopNavigationProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { isAuthenticated, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const activeNavItem = NAV_ITEMS.find((item) => item.key === activeItem) ?? NAV_ITEMS[0];
    const resolvedAvatarLabel = avatarLabel ?? getAuthAvatarLabel('OG');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const nextSearch = (params.get('search') ?? params.get('q') ?? '').trim();
        setSearchQuery(nextSearch);
    }, [location.pathname, location.search]);

    useEffect(() => {
        if (!isMobileMenuOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMobileMenuOpen]);

    const handleNavigate = (path?: string) => {
        if (!path) return;
        setIsMobileMenuOpen(false);
        navigate(path);
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const normalized = searchQuery.trim();
        const params = new URLSearchParams();
        if (normalized) params.set('search', normalized);

        setIsMobileMenuOpen(false);
        navigate(`/issues${params.toString() ? `?${params.toString()}` : ''}`);
    };

    const handleSignOut = async () => {
        await logout();
        setIsMobileMenuOpen(false);
        navigate('/');
    };

    return (
        <>
            <header className="enterprise-header-glass sticky top-0 z-30 border-b border-[var(--enterprise-border-strong)]">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 md:px-8">
                    <div className="flex min-w-0 items-center gap-3 lg:gap-6">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="flex shrink-0 items-center gap-2.5 text-left"
                            aria-label="Go to dashboard"
                        >
                            <div className="ui-accent-surface flex h-8 w-8 items-center justify-center rounded-md">
                                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M7 17V9m5 8V5m5 12v-6"
                                    />
                                </svg>
                            </div>
                            <div className="min-w-0 leading-none">
                                <div className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-[var(--enterprise-text)] sm:block">
                                    Smart Error Tracker
                                </div>
                                <div className="sm:hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--enterprise-text)]">
                                    Tracker
                                </div>
                                <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)] sm:block">
                                    Enterprise Monitor
                                </div>
                                <div className="sm:hidden mt-1 text-[9px] uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                    {activeNavItem.label}
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
                                        onClick={() => handleNavigate(item.path)}
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

                    <div className="flex items-center gap-2">
                        {showSearch ? (
                            <form onSubmit={handleSearchSubmit} className="relative hidden lg:block">
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
                                    aria-label="Search projects, issues, releases"
                                    placeholder="Search issues, releases, projects"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    autoComplete="off"
                                    className="ui-input h-8 w-56 rounded-md py-1.5 pl-8 pr-3 text-sm xl:w-64"
                                />
                            </form>
                        ) : null}
                        <button
                            type="button"
                            aria-label="Notifications"
                            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-[var(--enterprise-border)] bg-[#16181b] text-[var(--enterprise-text-muted)] transition-colors hover:bg-[#1a1d20] hover:text-[var(--enterprise-text)]"
                        >
                            <span className="ui-accent-dot absolute right-2 top-2 h-2 w-2 rounded-full" />
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.9"
                                    d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.44V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.16c0 .53-.21 1.04-.59 1.41L4 17h5m6 0a3 3 0 11-6 0"
                                />
                            </svg>
                        </button>
                        <button
                            type="button"
                            aria-label="Account"
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--enterprise-border)] bg-[#1a1d20] text-[11px] font-semibold text-[var(--enterprise-text)]"
                        >
                            {resolvedAvatarLabel}
                        </button>
                        {isAuthenticated ? (
                            <button
                                type="button"
                                onClick={() => void handleSignOut()}
                                className="ui-secondary-button hidden px-3 py-2 text-xs font-semibold text-[var(--enterprise-text)] md:inline-flex"
                            >
                                Sign Out
                            </button>
                        ) : null}
                        <button
                            type="button"
                            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                            aria-expanded={isMobileMenuOpen}
                            aria-controls="mobile-enterprise-navigation"
                            onClick={() => setIsMobileMenuOpen((current) => !current)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--enterprise-border)] bg-[#16181b] text-[var(--enterprise-text-muted)] transition-colors hover:bg-[#1a1d20] hover:text-[var(--enterprise-text)] md:hidden"
                        >
                            {isMobileMenuOpen ? (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 7h16M4 12h16M4 17h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {isMobileMenuOpen ? (
                <div className="md:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation overlay"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 z-40 bg-[#05080d]/70 backdrop-blur-sm"
                    />
                    <aside
                        id="mobile-enterprise-navigation"
                        className="enterprise-header-glass fixed inset-x-0 top-14 z-50 border-b border-[var(--enterprise-border-strong)] px-4 pb-5 pt-4 shadow-[0_20px_45px_rgba(2,6,23,0.45)]"
                    >
                        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--enterprise-text-dim)]">
                                        Navigation
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-[var(--enterprise-text)]">
                                        {activeNavItem.label}
                                    </div>
                                </div>
                                {projectName ? (
                                    <span className="enterprise-chip shrink-0">
                                        {projectName}
                                    </span>
                                ) : null}
                            </div>

                            {showSearch ? (
                                <form onSubmit={handleSearchSubmit} className="relative">
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
                                        aria-label="Search projects, issues, releases"
                                        placeholder="Search projects, issues, releases"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        autoComplete="off"
                                        className="ui-input h-10 w-full rounded-xl py-2 pl-10 pr-3 text-sm"
                                    />
                                </form>
                            ) : null}

                            <nav className="grid gap-2">
                                {NAV_ITEMS.map((item) => {
                                    const isActive = item.key === activeItem;
                                    const isDisabled = !item.path;

                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => handleNavigate(item.path)}
                                            disabled={isDisabled}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                                                isActive
                                                    ? 'ui-accent-panel text-white'
                                                    : 'border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] text-[var(--enterprise-text-muted)] hover:text-[var(--enterprise-text)]'
                                            } ${isDisabled ? 'cursor-default opacity-70' : ''}`}
                                        >
                                            <span>{item.label}</span>
                                            <span className={`text-[10px] uppercase tracking-[0.18em] ${isActive ? 'ui-accent-text' : 'text-[var(--enterprise-text-dim)]'}`}>
                                                {isActive ? 'Current' : 'Open'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="flex items-center justify-between rounded-xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] px-4 py-3">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--enterprise-text-dim)]">
                                        Workspace
                                    </div>
                                    <div className="mt-1 text-sm font-medium text-[var(--enterprise-text)]">
                                        {resolvedAvatarLabel} session active
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={
                                        isAuthenticated
                                            ? () => void handleSignOut()
                                            : () => setIsMobileMenuOpen(false)
                                    }
                                    className="ui-secondary-button px-3 py-2 text-xs font-semibold text-[var(--enterprise-text)]"
                                >
                                    {isAuthenticated ? 'Sign Out' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : null}
        </>
    );
}
