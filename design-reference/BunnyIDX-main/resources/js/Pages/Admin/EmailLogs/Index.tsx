import AdminLayout from '@/Layouts/AdminLayout';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';

interface LogRow {
    id: number;
    recipient: string | null;
    sender: string | null;
    subject: string | null;
    status: string;
    provider: string | null;
    branded: boolean;
    template_type: string | null;
    quota_category: string | null;
    provider_message_id: string | null;
    sent_at: string | null;
    delivered_at: string | null;
    opened_at: string | null;
    last_opened_at: string | null;
    clicked_at: string | null;
    last_clicked_at: string | null;
    bounce_reason: string | null;
    complaint_at: string | null;
    failed_reason: string | null;
    error_message: string | null;
    created_at: string | null;
}

interface EventRow {
    id: number;
    event_type: string;
    recipient: string | null;
    clicked_url: string | null;
    occurred_at: string | null;
    created_at: string | null;
}

interface Suppression {
    id: number;
    email: string;
    reason: string | null;
    source: string | null;
    suppressed_at: string | null;
    created_at: string | null;
}

interface Paginator<T> {
    data: T[];
    prev_page_url: string | null;
    next_page_url: string | null;
    from: number | null;
    to: number | null;
    total: number;
}

interface Option { value: string; label: string }

interface Props {
    logs: Paginator<LogRow>;
    filters: { status: string | null; template: string | null; q: string | null; date_from: string | null; date_to: string | null };
    statusOptions: Option[];
    templateOptions: string[];
    suppressions: Suppression[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
    queued: { bg: '#F3F4F6', text: '#5F656D' },
    sent: { bg: '#EBF5FF', text: '#1693C9' },
    delivered: { bg: '#E7F6E7', text: '#0E7C0E' },
    bounced: { bg: '#FFF7ED', text: '#B45309' },
    complained: { bg: '#FEF2F2', text: '#DC2626' },
    failed: { bg: '#FEF2F2', text: '#DC2626' },
};

function StatusBadge({ status }: { status: string }) {
    const c = statusColors[status] || statusColors.queued;
    return (
        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize" style={{ backgroundColor: c.bg, color: c.text }}>
            {status}
        </span>
    );
}

function fmt(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminEmailLogsIndex({ logs, filters, statusOptions, templateOptions, suppressions }: Props) {
    const [view, setView] = useState<'logs' | 'suppressions'>('logs');
    const [status, setStatus] = useState(filters.status || '');
    const [template, setTemplate] = useState(filters.template || '');
    const [q, setQ] = useState(filters.q || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const [detail, setDetail] = useState<{ log: LogRow; events: EventRow[] } | null>(null);
    const [loadingId, setLoadingId] = useState<number | null>(null);

    function applyFilters() {
        router.get(route('admin.email-logs'), {
            status: status || undefined,
            template: template || undefined,
            q: q || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true, preserveScroll: true });
    }

    async function openDetail(log: LogRow) {
        setLoadingId(log.id);
        try {
            const { data } = await axios.get(route('admin.email-logs.show', log.id));
            setDetail(data);
        } finally {
            setLoadingId(null);
        }
    }

    return (
        <AdminLayout active="email-logs" title="Admin · Email Logs"
            header={
                <>
                    <h1 className="text-lg font-normal text-[#111315]">Email Delivery</h1>
                    <div className="flex-1" />
                    <div className="inline-flex rounded-lg border border-[#E4E7EB] bg-white p-0.5 text-[12px]">
                        <button
                            onClick={() => setView('logs')}
                            className={`px-3 py-1 rounded-md font-medium ${view === 'logs' ? 'bg-[#1693C9] text-white' : 'text-[#5F656D]'}`}
                        >
                            Delivery Logs
                        </button>
                        <button
                            onClick={() => setView('suppressions')}
                            className={`px-3 py-1 rounded-md font-medium ${view === 'suppressions' ? 'bg-[#1693C9] text-white' : 'text-[#5F656D]'}`}
                        >
                            Suppressions ({suppressions.length})
                        </button>
                    </div>
                </>
            }
        >
            {view === 'logs' ? (
                <>
                    {/* Filters */}
                    <div className="bg-white border border-[#E4E7EB] rounded-xl p-4 flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Recipient</label>
                            <input
                                type="text" value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                                placeholder="Search email"
                                className="block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className="block h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9]">
                                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Template / category</label>
                            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="block h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9]">
                                <option value="">All templates</option>
                                {templateOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">From</label>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="block h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9]" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">To</label>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="block h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9]" />
                        </div>
                        <button onClick={applyFilters} className="h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF]">Apply</button>
                    </div>

                    {logs.data.length === 0 ? (
                        <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-12 text-center">
                            <p className="text-sm text-[#8B9096]">No email logs match.</p>
                        </div>
                    ) : (
                        <DataTable>
                            <DataTableHead>
                                <DataTableHeadCell>Sent</DataTableHeadCell>
                                <DataTableHeadCell>Recipient</DataTableHeadCell>
                                <DataTableHeadCell>Sender</DataTableHeadCell>
                                <DataTableHeadCell>Template</DataTableHeadCell>
                                <DataTableHeadCell>Status</DataTableHeadCell>
                                <DataTableHeadCell>Delivered</DataTableHeadCell>
                                <DataTableHeadCell>Opened</DataTableHeadCell>
                                <DataTableHeadCell>Clicked</DataTableHeadCell>
                                <DataTableHeadCell>Reason</DataTableHeadCell>
                                <DataTableHeadCell align="right" last>{''}</DataTableHeadCell>
                            </DataTableHead>
                            <tbody>
                                {logs.data.map((log) => (
                                    <DataTableRow key={log.id}>
                                        <DataTableCell className="text-[12px] text-[#5F656D] whitespace-nowrap">{fmt(log.sent_at || log.created_at)}</DataTableCell>
                                        <DataTableCell>
                                            <span className="text-[13px] text-[#111315]">{log.recipient || '—'}</span>
                                            {log.branded && <span className="ml-1.5 text-[9px] font-semibold px-1 py-0.5 rounded bg-[#F5F3FF] text-[#7C36EE]">Branded</span>}
                                        </DataTableCell>
                                        <DataTableCell className="text-[12px] text-[#5F656D]">{log.sender || '—'}</DataTableCell>
                                        <DataTableCell className="text-[12px] text-[#5F656D]">{log.template_type || log.quota_category || '—'}</DataTableCell>
                                        <DataTableCell><StatusBadge status={log.status} /></DataTableCell>
                                        <DataTableCell className="text-[12px] text-[#5F656D] whitespace-nowrap">{fmt(log.delivered_at)}</DataTableCell>
                                        <DataTableCell className="text-[12px] text-[#5F656D] whitespace-nowrap">{fmt(log.opened_at)}</DataTableCell>
                                        <DataTableCell className="text-[12px] text-[#5F656D] whitespace-nowrap">{fmt(log.clicked_at)}</DataTableCell>
                                        <DataTableCell className="text-[12px] text-[#DC2626] max-w-[180px] truncate">{log.bounce_reason || log.failed_reason || (log.complaint_at ? 'Complaint' : '') || '—'}</DataTableCell>
                                        <DataTableCell align="right" last>
                                            <button onClick={() => openDetail(log)} className="text-[11px] font-medium text-[#1693C9] hover:underline disabled:opacity-40" disabled={loadingId === log.id}>
                                                {loadingId === log.id ? '…' : 'View'}
                                            </button>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </tbody>
                        </DataTable>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between text-[12px] text-[#8B9096]">
                        <span>{logs.from || 0}–{logs.to || 0} of {logs.total}</span>
                        <div className="flex items-center gap-2">
                            {logs.prev_page_url
                                ? <Link href={logs.prev_page_url} preserveScroll className="h-8 px-3 inline-flex items-center border border-[#E4E7EB] rounded-lg text-[#5F656D] hover:bg-[#F7F8FB]">Prev</Link>
                                : <span className="h-8 px-3 inline-flex items-center border border-[#F0F1F3] rounded-lg text-[#C8CCD1]">Prev</span>}
                            {logs.next_page_url
                                ? <Link href={logs.next_page_url} preserveScroll className="h-8 px-3 inline-flex items-center border border-[#E4E7EB] rounded-lg text-[#5F656D] hover:bg-[#F7F8FB]">Next</Link>
                                : <span className="h-8 px-3 inline-flex items-center border border-[#F0F1F3] rounded-lg text-[#C8CCD1]">Next</span>}
                        </div>
                    </div>
                </>
            ) : (
                /* Suppressions */
                suppressions.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-12 text-center">
                        <p className="text-sm text-[#8B9096]">No suppressed addresses.</p>
                    </div>
                ) : (
                    <DataTable>
                        <DataTableHead>
                            <DataTableHeadCell>Email</DataTableHeadCell>
                            <DataTableHeadCell>Reason</DataTableHeadCell>
                            <DataTableHeadCell>Source</DataTableHeadCell>
                            <DataTableHeadCell align="right" last>Suppressed</DataTableHeadCell>
                        </DataTableHead>
                        <tbody>
                            {suppressions.map((s) => (
                                <DataTableRow key={s.id}>
                                    <DataTableCell className="text-[13px] text-[#111315]">{s.email}</DataTableCell>
                                    <DataTableCell className="text-[12px] text-[#5F656D] capitalize">{s.reason || '—'}</DataTableCell>
                                    <DataTableCell className="text-[12px] text-[#5F656D]">{s.source || '—'}</DataTableCell>
                                    <DataTableCell align="right" last className="text-[12px] text-[#5F656D] whitespace-nowrap">{fmt(s.suppressed_at || s.created_at)}</DataTableCell>
                                </DataTableRow>
                            ))}
                        </tbody>
                    </DataTable>
                )
            )}

            {detail && <DetailPanel detail={detail} onClose={() => setDetail(null)} />}
        </AdminLayout>
    );
}

function DetailPanel({ detail, onClose }: { detail: { log: LogRow; events: EventRow[] }; onClose: () => void }) {
    const { log, events } = detail;
    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
            <div className="bg-white h-full w-full max-w-md overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-[#E4E7EB] px-5 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-[#111315]">Email detail</h2>
                        <p className="text-[11px] text-[#8B9096] truncate max-w-[280px]">{log.subject || '(no subject)'}</p>
                    </div>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#111315] text-lg leading-none">×</button>
                </div>

                <div className="p-5 space-y-5">
                    <dl className="space-y-2 text-[12px]">
                        <Field label="Status"><StatusBadge status={log.status} /></Field>
                        <Field label="Recipient">{log.recipient || '—'}</Field>
                        <Field label="Sender">{log.sender || '—'}</Field>
                        <Field label="Template / category">{log.template_type || log.quota_category || '—'}</Field>
                        <Field label="Provider">{log.provider || '—'}{log.branded ? ' (branded)' : ''}</Field>
                        <Field label="Provider message id"><code className="text-[11px] text-[#5F656D] break-all">{log.provider_message_id || '—'}</code></Field>
                        {log.bounce_reason && <Field label="Bounce reason"><span className="text-[#DC2626]">{log.bounce_reason}</span></Field>}
                        {log.failed_reason && <Field label="Failure reason"><span className="text-[#DC2626]">{log.failed_reason}</span></Field>}
                        {log.error_message && <Field label="Send error"><span className="text-[#DC2626]">{log.error_message}</span></Field>}
                    </dl>

                    <div>
                        <h3 className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Status timeline</h3>
                        <ol className="relative border-l border-[#E4E7EB] ml-1 space-y-3">
                            <TimelineItem label="Sent" at={log.sent_at} />
                            <TimelineItem label="Delivered" at={log.delivered_at} />
                            <TimelineItem label="First opened" at={log.opened_at} />
                            <TimelineItem label="First clicked" at={log.clicked_at} />
                            <TimelineItem label="Complaint" at={log.complaint_at} />
                        </ol>
                    </div>

                    <div>
                        <h3 className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Webhook events ({events.length})</h3>
                        {events.length === 0 ? (
                            <p className="text-[12px] text-[#8B9096]">No events received yet.</p>
                        ) : (
                            <ul className="space-y-2">
                                {events.map((ev) => (
                                    <li key={ev.id} className="rounded-lg border border-[#E4E7EB] px-3 py-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-medium text-[#111315]">{ev.event_type}</span>
                                            <span className="text-[11px] text-[#8B9096]">{fmt(ev.occurred_at || ev.created_at)}</span>
                                        </div>
                                        {ev.clicked_url && (
                                            <a href={ev.clicked_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block text-[11px] text-[#1693C9] hover:underline break-all">
                                                {ev.clicked_url}
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <dt className="text-[#8B9096] shrink-0">{label}</dt>
            <dd className="text-[#111315] text-right break-words">{children}</dd>
        </div>
    );
}

function TimelineItem({ label, at }: { label: string; at: string | null }) {
    return (
        <li className="ml-3">
            <span className={`absolute -left-[5px] mt-1.5 h-2 w-2 rounded-full ${at ? 'bg-[#1693C9]' : 'bg-[#E4E7EB]'}`} />
            <div className="flex items-center justify-between">
                <span className={`text-[12px] ${at ? 'text-[#111315]' : 'text-[#C8CCD1]'}`}>{label}</span>
                <span className="text-[11px] text-[#8B9096]">{fmt(at)}</span>
            </div>
        </li>
    );
}
