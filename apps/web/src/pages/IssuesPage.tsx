import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

type IssueStatus = 'all' | 'open' | 'resolved' | 'ignored';

type ErrorGroup = {
    id: string;
    fingerprint: string;
    title: string;
    status: string;
    eventCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
};

export default function IssuesPage() {
    const [issues, setIssues] = useState<ErrorGroup[]>([]);
    const [statusFilter, setStatusFilter] = useState<IssueStatus>('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchIssues = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = statusFilter === 'all' ? '/groups' : `/groups?status=${statusFilter}`;
            const data = await apiFetch(endpoint);
            if (data.ok) {
                setIssues(data.groups || []);
            } else {
                setError(data.error || 'Failed to fetch issues');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [statusFilter]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return '#ef4444'; // red
            case 'resolved': return '#22c55e'; // green
            case 'ignored': return '#9ca3af'; // gray
            default: return '#3b82f6'; // blue
        }
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 24, fontFamily: 'system-ui' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ margin: 0 }}>Issues</h1>
                <button
                    onClick={fetchIssues}
                    disabled={loading}
                    style={{ padding: '8px 16px', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div style={{ marginBottom: 24 }}>
                {(['all', 'open', 'resolved', 'ignored'] as IssueStatus[]).map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        style={{
                            marginRight: 8,
                            padding: '6px 12px',
                            borderRadius: 16,
                            border: '1px solid #ccc',
                            background: statusFilter === status ? '#e5e7eb' : 'transparent',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {error ? (
                <div style={{ padding: 16, background: '#fee2e2', color: '#b91c1c', borderRadius: 8, marginBottom: 16 }}>
                    <b>Error:</b> {error}
                </div>
            ) : loading && issues.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>Loading issues...</div>
            ) : issues.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280', border: '1px dashed #ccc', borderRadius: 8 }}>
                    No issues yet
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                    {issues.map((issue) => (
                        <div key={issue.id} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <b style={{ fontSize: '1.1rem' }}>{issue.title}</b>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: 12,
                                        fontSize: '0.8rem',
                                        background: getStatusColor(issue.status),
                                        color: 'white',
                                        textTransform: 'capitalize'
                                    }}>
                                        {issue.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#6b7280', display: 'flex', gap: 16 }}>
                                    <span>Count: <b>{issue.eventCount}</b></span>
                                    <span>Last seen: {formatDate(issue.lastSeenAt)}</span>
                                    <span>First seen: {formatDate(issue.firstSeenAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
