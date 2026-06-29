import { useEffect, useState } from 'react';
import { apiDelete, apiFetch } from '@/utils/api';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import { timeAgo } from '../helpers';

interface SessionRow {
    id: string;
    ip_address: string | null;
    browser: string;
    platform: string;
    device: string;
    last_activity: number;
    is_current: boolean;
}

export default function ActiveDevicesPanel() {
    const [sessions, setSessions] = useState<SessionRow[] | null>(null);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        try {
            const res = await apiFetch(route('crm.security.sessions'));
            setSessions(res.sessions);
        } catch (e: any) {
            setError(e.message || 'Failed to load sessions.');
        }
    }

    useEffect(() => { load(); }, []);

    async function revoke(id: string) {
        if (!confirm('Sign this device out? Anyone on it will be logged out immediately.')) return;
        setRevoking(id);
        try {
            await apiDelete(route('crm.security.sessions.revoke', id));
            setSessions((prev) => prev?.filter((s) => s.id !== id) ?? null);
        } catch (e: any) {
            setError(e.message || 'Failed to revoke session.');
        } finally {
            setRevoking(null);
        }
    }

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-[14px] font-semibold text-[#111315]">Where you're signed in</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5">
                    Sign out of any devices you don't recognize. Your current session is marked below.
                </p>
            </div>
            {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
            {sessions === null ? (
                <div className="text-[12px] text-[#8B9096]">Loading…</div>
            ) : (
                <DataTable>
                    <DataTableHead>
                        <DataTableHeadCell>Device</DataTableHeadCell>
                        <DataTableHeadCell>Browser</DataTableHeadCell>
                        <DataTableHeadCell>IP Address</DataTableHeadCell>
                        <DataTableHeadCell>Last Active</DataTableHeadCell>
                        <DataTableHeadCell align="right" last>Action</DataTableHeadCell>
                    </DataTableHead>
                    <tbody>
                        {sessions.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-10 text-center text-[12px] text-[#8B9096]">No active sessions found.</td></tr>
                        )}
                        {sessions.map((s) => (
                            <DataTableRow key={s.id}>
                                <DataTableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] text-[#111315] font-medium">{s.device || 'Desktop'}</span>
                                        {s.is_current && (
                                            <span className="text-[10px] text-[#0E7C0E] bg-[#E7F6E7] border border-[#0E7C0E33] rounded-full px-2 py-0.5">This device</span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-[#5F656D]">{s.platform}</div>
                                </DataTableCell>
                                <DataTableCell>
                                    <span className="text-[13px] text-[#374151]">{s.browser}</span>
                                </DataTableCell>
                                <DataTableCell>
                                    <span className="text-[13px] text-[#374151] font-mono">{s.ip_address || 'Unknown'}</span>
                                </DataTableCell>
                                <DataTableCell>
                                    <span className="text-[13px] text-[#374151]">{timeAgo(s.last_activity * 1000)}</span>
                                </DataTableCell>
                                <DataTableCell align="right" last>
                                    {!s.is_current ? (
                                        <button
                                            type="button"
                                            onClick={() => revoke(s.id)}
                                            disabled={revoking === s.id}
                                            className="h-7 px-3 text-[12px] font-medium text-[#DC2626] border border-[#DC2626] rounded hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors"
                                        >
                                            {revoking === s.id ? 'Signing out…' : 'Sign out'}
                                        </button>
                                    ) : (
                                        <span className="text-[11px] text-[#8B9096]">—</span>
                                    )}
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </tbody>
                </DataTable>
            )}
        </div>
    );
}
