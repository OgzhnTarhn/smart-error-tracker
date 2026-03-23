import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute() {
    const location = useLocation();
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="enterprise-shell flex min-h-screen items-center justify-center text-[var(--enterprise-text)]">
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] px-5 py-4">
                    <div className="h-5 w-5 rounded-full border-2 border-[var(--enterprise-accent-primary)] border-t-transparent animate-spin" />
                    <span className="text-sm text-[var(--enterprise-text-muted)]">
                        Checking workspace access...
                    </span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }

    return <Outlet />;
}
