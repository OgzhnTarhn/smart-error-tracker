import { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface PublicSiteChromeProps {
    children: ReactNode;
}

const PUBLIC_NAV_ITEMS = [
    { label: 'Home', to: '/' },
    { label: 'Product', to: '/product' },
    { label: 'Demo', to: '/demo' },
];

export default function PublicSiteChrome({ children }: PublicSiteChromeProps) {
    const { session, isAuthenticated, logout } = useAuth();

    return (
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <header className="border-b border-[var(--enterprise-border-strong)]">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-6 xl:px-8">
                    <Link to="/" className="flex items-center gap-3 text-left">
                        <div className="ui-accent-surface flex h-10 w-10 items-center justify-center rounded-xl">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M7 17V9m5 8V5m5 12v-6"
                                />
                            </svg>
                        </div>
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white">
                                Smart Error Tracker
                            </div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                Public Access Layer
                            </div>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {PUBLIC_NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-[rgba(107,130,255,0.14)] text-white'
                                            : 'text-[var(--enterprise-text-muted)] hover:text-white'
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        {isAuthenticated && session ? (
                            <>
                                <span className="ui-accent-badge hidden rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] md:inline-flex">
                                    {session.user.name}
                                </span>
                                <Link
                                    to={session.project ? `/projects/${session.project.id}` : '/projects/new'}
                                    className="ui-secondary-button px-4 py-2 text-sm font-semibold text-[var(--enterprise-text)]"
                                >
                                    Workspace
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => void logout()}
                                    className="ui-secondary-button px-4 py-2 text-sm font-semibold text-[var(--enterprise-text)]"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/demo"
                                    className="ui-secondary-button px-4 py-2 text-sm font-semibold text-[var(--enterprise-text)]"
                                >
                                    Try Demo
                                </Link>
                                <Link
                                    to="/login"
                                    className="ui-secondary-button px-4 py-2 text-sm font-semibold text-[var(--enterprise-text)]"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="ui-primary-button px-4 py-2 text-sm font-semibold text-white"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main>{children}</main>

            <footer className="border-t border-[var(--enterprise-border-strong)]">
                <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-[var(--enterprise-text-muted)] md:flex-row md:items-center md:justify-between md:px-6 xl:px-8">
                    <div>
                        Smart Error Tracker public layer introduces the product before users enter the private dashboard workspace.
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/product" className="ui-accent-link">
                            Product
                        </Link>
                        <Link to="/demo" className="ui-accent-link">
                            Demo Access
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
