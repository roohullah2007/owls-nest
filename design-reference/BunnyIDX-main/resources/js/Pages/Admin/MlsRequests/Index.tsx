import AdminLayout from '@/Layouts/AdminLayout';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow, LogoSlot } from '@/Components/ui/DataTable';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Status = 'pending' | 'in_process' | 'completed' | 'integrated' | 'denied';

interface MlsProvider {
    id: number;
    slug: string;
    display_name: string;
    logo_url: string | null;
    data_source: 'bridge' | 'realtyna' | 'repliers' | 'paragon';
    monthly_fee_cents: number;
}

interface RequestRow {
    id: number;
    status: Status;
    feed_types_requested: string[];
    agent_mls_id: string | null;
    agent_license_number: string | null;
    nrds_id: string | null;
    office_mls_id: string | null;
    broker_mls_id: string | null;
    brokerage_name: string | null;
    idx_domain: string | null;
    listing_scope: string | null;
    is_principal_broker: boolean;
    principal_broker_name: string | null;
    principal_broker_email: string | null;
    user_notes: string | null;
    admin_notes: string | null;
    denied_reason: string | null;
    created_at: string;
    integrated_at: string | null;
    user: { id: number; name: string; email: string };
    mls_provider: MlsProvider | null;
}

interface Props {
    requests: RequestRow[];
    statuses: Status[];
}

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
    pending: { bg: '#FFFBEB', text: '#D97706', label: 'Pending' },
    in_process: { bg: '#EBF5FF', text: '#1693C9', label: 'In Process' },
    completed: { bg: '#F5F3FF', text: '#7C36EE', label: 'Completed' },
    integrated: { bg: '#ECFDF5', text: '#059669', label: 'Integrated' },
    denied: { bg: '#FEF2F2', text: '#DC2626', label: 'Denied' },
};

export default function AdminMlsRequestsIndex({ requests }: Props) {
    const [selected, setSelected] = useState<RequestRow | null>(null);

    return (
        <AdminLayout active="mls-requests" title="Admin · MLS Requests"
            header={<h1 className="text-lg font-normal text-[#111315]">MLS Connection Requests</h1>}
        >
            {requests.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-12 text-center">
                    <p className="text-sm font-medium text-[#111315]">No requests yet</p>
                    <p className="text-xs text-[#8B9096] mt-1">When users submit MLS connection requests, they'll appear here.</p>
                </div>
            ) : (
                <DataTable>
                    <DataTableHead>
                        <DataTableHeadCell>User</DataTableHeadCell>
                        <DataTableHeadCell>MLS</DataTableHeadCell>
                        <DataTableHeadCell>Feeds</DataTableHeadCell>
                        <DataTableHeadCell>Requested</DataTableHeadCell>
                        <DataTableHeadCell>Status</DataTableHeadCell>
                        <DataTableHeadCell align="right" last>Action</DataTableHeadCell>
                    </DataTableHead>
                    <tbody>
                        {requests.map((r) => {
                            const cfg = statusConfig[r.status];
                            return (
                                <DataTableRow key={r.id} onClick={() => setSelected(r)}>
                                    <DataTableCell>
                                        <p className="text-[13px] font-medium text-[#111315]">{r.user.name}</p>
                                        <p className="text-[10px] text-[#8B9096]">{r.user.email}</p>
                                    </DataTableCell>
                                    <DataTableCell>
                                        {r.mls_provider ? (
                                            <div className="flex items-center gap-3">
                                                <LogoSlot src={r.mls_provider.logo_url} alt={r.mls_provider.display_name} />
                                                <div>
                                                    <p className="text-[13px] text-[#111315]">{r.mls_provider.display_name}</p>
                                                    <p className="text-[10px] text-[#8B9096]">{r.mls_provider.data_source}</p>
                                                </div>
                                            </div>
                                        ) : <span className="text-xs text-[#8B9096]">—</span>}
                                    </DataTableCell>
                                    <DataTableCell>
                                        <div className="flex items-center gap-1">
                                            {r.feed_types_requested.includes('idx') && <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#E6F0FF] text-[#1693C9]">IDX</span>}
                                            {r.feed_types_requested.includes('vow') && <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#FEF3C7] text-[#D97706]">VOW</span>}
                                        </div>
                                    </DataTableCell>
                                    <DataTableCell className="text-xs text-[#5F656D]">
                                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </DataTableCell>
                                    <DataTableCell>
                                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                                            {cfg.label}
                                        </span>
                                    </DataTableCell>
                                    <DataTableCell align="right" last>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelected(r); }}
                                            className="px-2.5 py-1 text-[10px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB]"
                                        >
                                            Open
                                        </button>
                                    </DataTableCell>
                                </DataTableRow>
                            );
                        })}
                    </tbody>
                </DataTable>
            )}

            {selected && <RequestDrawer request={selected} onClose={() => setSelected(null)} />}
        </AdminLayout>
    );
}

function RequestDrawer({ request: r, onClose }: { request: RequestRow; onClose: () => void }) {
    const [mode, setMode] = useState<'view' | 'integrate' | 'deny'>('view');

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-md h-full bg-white shadow-xl flex flex-col">
                <div className="flex items-center justify-between px-5 h-12 border-b border-[#E4E7EB] shrink-0">
                    <h2 className="text-sm font-semibold text-[#111315]">Request #{r.id}</h2>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#111315]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Header */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            {r.mls_provider?.logo_url ? <img src={r.mls_provider.logo_url} alt="" className="h-8 max-w-[80px] object-contain" /> : <div className="h-8 w-8 rounded bg-[#F3F4F6]" />}
                            <div>
                                <p className="text-sm font-semibold text-[#111315]">{r.mls_provider?.display_name}</p>
                                <p className="text-xs text-[#8B9096]">Data source: {r.mls_provider?.data_source}</p>
                            </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ backgroundColor: statusConfig[r.status].bg, color: statusConfig[r.status].text }}>
                            {statusConfig[r.status].label}
                        </span>
                    </div>

                    {/* User */}
                    <div className="pt-3 border-t border-[#F3F4F6]">
                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">User</p>
                        <p className="text-[13px] text-[#111315]">{r.user.name}</p>
                        <p className="text-xs text-[#5F656D]">{r.user.email}</p>
                    </div>

                    {/* Submitted data */}
                    <div className="pt-3 border-t border-[#F3F4F6] space-y-2">
                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Submitted</p>
                        <Detail label="Feeds" value={r.feed_types_requested.join(', ').toUpperCase()} />
                        <Detail label="Brokerage" value={r.brokerage_name} />
                        <Detail label="Principal Broker" value={r.principal_broker_name} />
                        <Detail label="Broker email" value={r.principal_broker_email} />
                        <Detail label="User is broker?" value={r.is_principal_broker ? 'Yes' : 'No'} />
                        <Detail label="IDX domain" value={r.idx_domain} />
                        {/* Legacy fields — populated later by admin once broker authorizes */}
                        {r.agent_mls_id && <Detail label="Agent MLS ID" value={r.agent_mls_id} />}
                        {r.agent_license_number && <Detail label="License #" value={r.agent_license_number} />}
                        {r.user_notes && (
                            <div>
                                <p className="text-[10px] text-[#8B9096]">Notes</p>
                                <p className="text-xs text-[#111315] whitespace-pre-wrap mt-0.5">{r.user_notes}</p>
                            </div>
                        )}
                    </div>

                    {r.admin_notes && (
                        <div className="pt-3 border-t border-[#F3F4F6]">
                            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Admin notes</p>
                            <p className="text-xs text-[#111315] whitespace-pre-wrap">{r.admin_notes}</p>
                        </div>
                    )}

                    {r.denied_reason && (
                        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                            <p className="text-[11px] font-semibold text-[#DC2626] mb-1">Denied reason</p>
                            <p className="text-xs text-[#7F1D1D]">{r.denied_reason}</p>
                        </div>
                    )}

                    {/* Workflow actions */}
                    {r.status !== 'integrated' && r.status !== 'denied' && mode === 'view' && (
                        <div className="pt-3 border-t border-[#F3F4F6] space-y-2">
                            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Move to</p>
                            {r.status === 'pending' && (
                                <ActionButton label="Mark in process" onClick={() => updateStatus(r.id, 'in_process', onClose)} />
                            )}
                            {r.status === 'in_process' && (
                                <ActionButton label="Mark completed" onClick={() => updateStatus(r.id, 'completed', onClose)} />
                            )}
                            {(r.status === 'completed' || r.status === 'in_process') && (
                                <ActionButton label="Integrate (provision connection)" accent="primary" onClick={() => setMode('integrate')} />
                            )}
                            <ActionButton label="Deny" accent="danger" onClick={() => setMode('deny')} />
                        </div>
                    )}

                    {mode === 'integrate' && r.mls_provider && (
                        <IntegrateForm request={r} onCancel={() => setMode('view')} onDone={onClose} />
                    )}
                    {mode === 'deny' && (
                        <DenyForm request={r} onCancel={() => setMode('view')} onDone={onClose} />
                    )}
                </div>
            </div>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="flex justify-between gap-3">
            <span className="text-[10px] text-[#8B9096]">{label}</span>
            <span className="text-xs text-[#111315] text-right">{value || '—'}</span>
        </div>
    );
}

function ActionButton({ label, onClick, accent }: { label: string; onClick: () => void; accent?: 'primary' | 'danger' }) {
    const base = 'w-full h-9 px-4 text-xs font-semibold rounded-lg transition-colors';
    const variant =
        accent === 'primary' ? 'bg-[#1693C9] text-white hover:bg-[#1380AF]' :
        accent === 'danger' ? 'border border-[#FEE2E2] text-[#DC2626] hover:bg-[#FEF2F2]' :
        'border border-[#E4E7EB] text-[#5F656D] hover:bg-[#F9FAFB]';
    return <button onClick={onClick} className={`${base} ${variant}`}>{label}</button>;
}

function updateStatus(id: number, status: Status, onSuccess: () => void) {
    router.patch(route('admin.mls-requests.update', id), { status }, { preserveScroll: true, onSuccess });
}

function IntegrateForm({ request: r, onCancel, onDone }: { request: RequestRow; onCancel: () => void; onDone: () => void }) {
    // Bridge uses a system-wide token from .env — no per-connection key needed.
    // Repliers is BYOK (API key). Realtyna is per-customer: API key + OAuth
    // client ID/secret. Paragon is per-customer OAuth: the login/password ARE the
    // client ID/secret (no separate API key). All stored encrypted on the connection.
    const isBridge = r.mls_provider?.data_source === 'bridge';
    const isRealtyna = r.mls_provider?.data_source === 'realtyna';
    const isParagon = r.mls_provider?.data_source === 'paragon';
    const needsApiKey = !isBridge && !isParagon;
    const needsClientPair = isRealtyna || isParagon;

    const { data, setData, patch, processing, errors } = useForm({
        status: 'integrated' as Status,
        api_key: '',
        client_id: '',
        client_secret: '',
        admin_notes: r.admin_notes ?? '',
    });

    const missingRequired = (needsApiKey && !data.api_key)
        || (needsClientPair && (!data.client_id || !data.client_secret));

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(route('admin.mls-requests.update', r.id), { preserveScroll: true, onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="pt-3 border-t border-[#F3F4F6] space-y-3">
            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Integrate connection</p>

            {isBridge ? (
                <div className="p-3 bg-[#EBF5FF] border border-[#BFDBFE] rounded-lg">
                    <p className="text-[11px] text-[#1693C9] font-medium">Bridge Data Output uses a system-wide token.</p>
                    <p className="text-[11px] text-[#5F656D] mt-0.5">No per-user API key needed — the connection will use the platform's `BRIDGE_SERVER_TOKEN`.</p>
                </div>
            ) : isParagon ? (
                <p className="text-[11px] text-[#5F656D]">
                    Paragon uses the customer's <strong>login</strong> and <strong>password</strong> as the OAuth Client ID / Client Secret. Enter them below — stored encrypted, never shown to the end user.
                </p>
            ) : (
                <p className="text-[11px] text-[#5F656D]">
                    Paste the API key / credentials needed to query this MLS via {r.mls_provider?.data_source}. This key is stored encrypted and never shown to the end user.
                </p>
            )}

            {needsApiKey && (
                <div>
                    <label className="block text-xs font-medium text-[#5F656D] mb-1.5">API key *</label>
                    <input
                        type="text"
                        value={data.api_key}
                        onChange={(e) => setData('api_key', e.target.value)}
                        required
                        placeholder="Provider-specific credential"
                        className="block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                    />
                    {errors.api_key && <p className="mt-1 text-[11px] text-red-500">{errors.api_key}</p>}
                </div>
            )}

            {needsClientPair && (
                <>
                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1.5">{isParagon ? 'Client ID (login) *' : 'Client ID *'}</label>
                        <input
                            type="text"
                            value={data.client_id}
                            onChange={(e) => setData('client_id', e.target.value)}
                            required
                            placeholder={isParagon ? "Paragon login username for this customer" : "Realtyna OAuth client ID for this customer's account"}
                            className="block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                        />
                        {errors.client_id && <p className="mt-1 text-[11px] text-red-500">{errors.client_id}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1.5">{isParagon ? 'Client Secret (password) *' : 'Client Secret *'}</label>
                        <input
                            type="password"
                            value={data.client_secret}
                            onChange={(e) => setData('client_secret', e.target.value)}
                            required
                            placeholder={isParagon ? 'Paragon password' : 'Realtyna OAuth client secret'}
                            className="block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                        />
                        {errors.client_secret && <p className="mt-1 text-[11px] text-red-500">{errors.client_secret}</p>}
                    </div>
                </>
            )}

            <div>
                <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Admin notes</label>
                <textarea
                    value={data.admin_notes}
                    onChange={(e) => setData('admin_notes', e.target.value)}
                    rows={2}
                    className="block w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9] resize-none"
                />
            </div>
            <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={onCancel} className="h-8 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315]">Cancel</button>
                <button
                    type="submit"
                    disabled={processing || missingRequired}
                    className="h-8 px-5 bg-[#1693C9] text-white text-xs font-semibold rounded-lg hover:bg-[#1380AF] disabled:opacity-50"
                >
                    {processing ? 'Integrating…' : 'Integrate'}
                </button>
            </div>
        </form>
    );
}

function DenyForm({ request: r, onCancel, onDone }: { request: RequestRow; onCancel: () => void; onDone: () => void }) {
    const { data, setData, patch, processing } = useForm({
        status: 'denied' as Status,
        denied_reason: '',
        admin_notes: r.admin_notes ?? '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        patch(route('admin.mls-requests.update', r.id), { preserveScroll: true, onSuccess: onDone });
    }

    return (
        <form onSubmit={submit} className="pt-3 border-t border-[#F3F4F6] space-y-3">
            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Deny request</p>
            <div>
                <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Reason (shown to user) *</label>
                <textarea
                    value={data.denied_reason}
                    onChange={(e) => setData('denied_reason', e.target.value)}
                    rows={3}
                    required
                    className="block w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] resize-none"
                />
            </div>
            <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={onCancel} className="h-8 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315]">Cancel</button>
                <button type="submit" disabled={processing || !data.denied_reason} className="h-8 px-5 bg-[#DC2626] text-white text-xs font-semibold rounded-lg hover:bg-[#B91C1C] disabled:opacity-50">
                    {processing ? 'Denying…' : 'Confirm deny'}
                </button>
            </div>
        </form>
    );
}
