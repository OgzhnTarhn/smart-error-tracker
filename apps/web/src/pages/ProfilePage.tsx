import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardSectionCard from '../components/dashboard/DashboardSectionCard';
import EnterpriseTopNavigation from '../components/layout/EnterpriseTopNavigation';
import { useAuth } from '../context/AuthContext';
import {
    getAuthProfile,
    type AuthCurrentSession,
} from '../lib/api';
import type { AuthProjectSummary } from '../lib/authSession';

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function formatDateTime(value: string | null | undefined) {
    if (!value) return 'Unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unavailable';
    return DATE_TIME_FORMATTER.format(date);
}

function PrimaryButton({
    label,
    onClick,
    disabled = false,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="ui-primary-button h-9 px-3 text-sm font-semibold"
        >
            {label}
        </button>
    );
}

function SecondaryButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="ui-secondary-button h-9 px-3 text-sm font-semibold"
        >
            {label}
        </button>
    );
}

function DetailRow({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1 border-b border-[var(--enterprise-border)] py-3 last:border-b-0 last:pb-0 first:pt-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                {label}
            </div>
            <div className={`text-sm text-[var(--enterprise-text)] ${mono ? 'font-mono break-all' : ''}`}>
                {value}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const navigate = useNavigate();
    const { session, updateProfile, changePassword } = useAuth();
    const [name, setName] = useState(session?.user.name ?? '');
    const [email, setEmail] = useState(session?.user.email ?? '');
    const [mode, setMode] = useState<'demo' | 'member'>(session?.mode ?? 'member');
    const [project, setProject] = useState<AuthProjectSummary | null>(session?.project ?? null);
    const [currentSession, setCurrentSession] = useState<AuthCurrentSession | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [profileNotice, setProfileNotice] = useState<string | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        setName(session?.user.name ?? '');
        setEmail(session?.user.email ?? '');
        setMode(session?.mode ?? 'member');
        setProject(session?.project ?? null);
    }, [session?.mode, session?.project, session?.user.email, session?.user.name]);

    useEffect(() => {
        let active = true;
        setLoadingProfile(true);
        setProfileError(null);

        void getAuthProfile()
            .then((response) => {
                if (!active) return;
                if (!response.ok || !response.user || !response.mode) {
                    throw new Error(response.error ?? 'Profile could not be loaded.');
                }

                setName(response.user.name);
                setEmail(response.user.email);
                setMode(response.mode);
                setProject(response.project ?? null);
                setCurrentSession(response.currentSession ?? null);
            })
            .catch((error: unknown) => {
                if (!active) return;
                setProfileError(
                    error instanceof Error ? error.message : 'Profile could not be loaded.',
                );
            })
            .finally(() => {
                if (active) {
                    setLoadingProfile(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);

    const isDemoMode = mode === 'demo';

    const handleSaveProfile = async () => {
        if (!name.trim() || !email.trim()) {
            setProfileNotice(null);
            setProfileError('Name and email are required.');
            return;
        }

        setSavingProfile(true);
        setProfileError(null);
        setProfileNotice(null);

        try {
            const nextSession = await updateProfile({
                name,
                email,
            });
            setName(nextSession.user.name);
            setEmail(nextSession.user.email);
            setMode(nextSession.mode);
            setProject(nextSession.project ?? null);
            setProfileNotice('Profile details were updated.');
        } catch (error: unknown) {
            setProfileError(
                error instanceof Error ? error.message : 'Profile could not be updated.',
            );
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword.trim() || !newPassword.trim()) {
            setPasswordNotice(null);
            setPasswordError('Current password and new password are required.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordNotice(null);
            setPasswordError('New password confirmation does not match.');
            return;
        }

        setSavingPassword(true);
        setPasswordError(null);
        setPasswordNotice(null);

        try {
            await changePassword({
                currentPassword,
                newPassword,
            });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordNotice('Password changed successfully.');
        } catch (error: unknown) {
            setPasswordError(
                error instanceof Error ? error.message : 'Password could not be changed.',
            );
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="enterprise-shell min-h-screen text-[var(--enterprise-text)]">
            <EnterpriseTopNavigation activeItem="profile" showSearch={false} />

            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
                <section className="border-b border-[var(--enterprise-border-strong)] pb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="enterprise-chip">Profile</span>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${isDemoMode ? 'ui-warning-badge' : 'ui-success-badge'}`}>
                                    {isDemoMode ? 'Demo Session' : 'Member Account'}
                                </span>
                            </div>
                            <h1 className="mt-3 text-xl font-semibold tracking-tight text-[var(--enterprise-text)] sm:text-2xl">
                                Account profile
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--enterprise-text-muted)]">
                                Manage workspace identity details and basic session security from one
                                place.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <SecondaryButton
                                label="Open Projects"
                                onClick={() => navigate('/projects')}
                            />
                            <SecondaryButton
                                label="Workspace Settings"
                                onClick={() => navigate('/settings')}
                            />
                        </div>
                    </div>
                </section>

                {profileError ? (
                    <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm">
                        {profileError}
                    </div>
                ) : null}

                {isDemoMode ? (
                    <div className="ui-warning-banner rounded-md px-3.5 py-3 text-sm leading-6">
                        Demo access stays read-only here. Use a member account to update identity
                        details or password settings.
                    </div>
                ) : null}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                    <DashboardSectionCard
                        title="Identity"
                        description="Keep account details aligned with the workspace."
                        contentClassName="p-6"
                        variant="enterprise"
                    >
                        {loadingProfile ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="enterprise-panel-soft h-11 rounded-md" />
                                <div className="enterprise-panel-soft h-11 rounded-md" />
                                <div className="enterprise-panel-soft h-28 rounded-md" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Full name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        disabled={isDemoMode || savingProfile}
                                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        disabled={isDemoMode || savingProfile}
                                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                                    />
                                </div>

                                <div className="rounded-[22px] border border-[var(--enterprise-border)] bg-black/30 p-5">
                                    <div className="space-y-1">
                                        <DetailRow
                                            label="Account mode"
                                            value={isDemoMode ? 'Demo access' : 'Member workspace account'}
                                        />
                                        <DetailRow
                                            label="Active project"
                                            value={project?.name ?? 'No project currently connected'}
                                        />
                                        <DetailRow
                                            label="Project key"
                                            value={project?.key ?? 'Unavailable'}
                                            mono
                                        />
                                    </div>
                                </div>

                                {profileNotice ? (
                                    <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-200">
                                        {profileNotice}
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                    <PrimaryButton
                                        label={savingProfile ? 'Saving...' : 'Save Profile'}
                                        onClick={() => void handleSaveProfile()}
                                        disabled={isDemoMode || savingProfile}
                                    />
                                </div>
                            </div>
                        )}
                    </DashboardSectionCard>

                    <div className="space-y-6">
                        <DashboardSectionCard
                            title="Password"
                            description="Rotate the member password used for dashboard access."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Current password
                                    </label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) => setCurrentPassword(event.target.value)}
                                        disabled={isDemoMode || savingPassword}
                                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        New password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        disabled={isDemoMode || savingPassword}
                                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--enterprise-text-dim)]">
                                        Confirm new password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        disabled={isDemoMode || savingPassword}
                                        className="ui-input mt-2 h-11 w-full px-4 text-sm"
                                    />
                                </div>

                                {passwordError ? (
                                    <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-100">
                                        {passwordError}
                                    </div>
                                ) : null}

                                {passwordNotice ? (
                                    <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-200">
                                        {passwordNotice}
                                    </div>
                                ) : null}

                                <PrimaryButton
                                    label={savingPassword ? 'Saving...' : 'Change Password'}
                                    onClick={() => void handleChangePassword()}
                                    disabled={isDemoMode || savingPassword}
                                />
                            </div>
                        </DashboardSectionCard>

                        <DashboardSectionCard
                            title="Current Session"
                            description="Basic telemetry for the authenticated browser session."
                            contentClassName="p-6"
                            variant="enterprise"
                        >
                            <div className="space-y-1">
                                <DetailRow
                                    label="Session started"
                                    value={formatDateTime(currentSession?.createdAt)}
                                />
                                <DetailRow
                                    label="Last seen"
                                    value={formatDateTime(currentSession?.lastSeenAt)}
                                />
                                <DetailRow
                                    label="Expires"
                                    value={formatDateTime(currentSession?.expiresAt)}
                                />
                            </div>
                        </DashboardSectionCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
