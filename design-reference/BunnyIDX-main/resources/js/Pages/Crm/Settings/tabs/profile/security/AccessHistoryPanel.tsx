import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import { formatDateTime } from '../helpers';

interface HistoryRow {
    id: number;
    event: string;
    ip_address: string | null;
    browser: string | null;
    platform: string | null;
    device: string | null;
    occurred_at: string;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
    login: { label: 'Sign in', color: 'text-[#0E7C0E]' },
    logout: { label: 'Sign out', color: 'text-[#5F656D]' },
    failed: { label: 'Failed sign-in', color: 'text-[#DC2626]' },
    '2fa_failed': { label: 'Failed 2FA', color: 'text-[#DC2626]' },
};

export default function AccessHistoryPanel() {
    const [entries, setEntries] = useState<HistoryRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiFetch(route('crm.security.access-history'))
            .then((res) => setEntries(res.entries))
            .catch((e: any) => setError(e.message || 'Failed to load history.'));
    }, []);

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-[14px] font-semibold text-[#111315]">Recent activity</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5">
                    Most recent 50 sign-in events on your account.
                </p>
            </div>
            {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}
            {entries === null ? (
                <div className="text-[12px] text-[#8B9096]">Loading…</div>
            ) : (
                <DataTable>
                    <DataTableHead>
                        <DataTableHeadCell>Event</DataTableHeadCell>
                        <DataTableHeadCell>Browser</DataTableHeadCell>
                        <DataTableHeadCell>Device</DataTableHeadCell>
                        <DataTableHeadCell>IP Address</DataTableHeadCell>
                        <DataTableHeadCell align="right" last>When</DataTableHeadCell>
                    </DataTableHead>
                    <tbody>
                        {entries.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-10 text-center text-[12px] text-[#8B9096]">No activity recorded yet.</td></tr>
                        )}
                        {entries.map((e) => {
                            const lbl = EVENT_LABELS[e.event] || { label: e.event, color: 'text-[#5F656D]' };
                            return (
                                <DataTableRow key={e.id}>
                                    <DataTableCell>
                                        <span className={`text-[13px] font-medium ${lbl.color}`}>{lbl.label}</span>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span className="text-[13px] text-[#374151]">{e.browser || '—'}</span>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span className="text-[13px] text-[#374151]">{[e.device, e.platform].filter(Boolean).join(' · ') || '—'}</span>
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span className="text-[13px] text-[#374151] font-mono">{e.ip_address || 'Unknown'}</span>
                                    </DataTableCell>
                                    <DataTableCell align="right" last>
                                        <span className="text-[12px] text-[#5F656D]">{formatDateTime(e.occurred_at)}</span>
                                    </DataTableCell>
                                </DataTableRow>
                            );
                        })}
                    </tbody>
                </DataTable>
            )}
        </div>
    );
}
