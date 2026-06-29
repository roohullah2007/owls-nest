import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IdxConnection, AvailableMls, MlsRequest } from '../Index';

// User-facing status labels — phrased around what we're doing FOR the user,
// not the internal workflow stage.
const statusConfig: Record<string, { bg: string; text: string; label: string; hint: string }> = {
    pending: { bg: '#FFFBEB', text: '#D97706', label: 'Submitted', hint: "We've received your request — we'll start processing soon." },
    in_process: { bg: '#EBF5FF', text: '#1693C9', label: 'Processing paperwork', hint: "We're filing the paperwork with your MLS on your behalf." },
    completed: { bg: '#F5F3FF', text: '#7C36EE', label: 'Awaiting MLS approval', hint: 'Paperwork is in. Waiting on the MLS to confirm.' },
    integrated: { bg: '#ECFDF5', text: '#059669', label: 'Active', hint: 'Your connection is live and ready to use.' },
    denied: { bg: '#FEF2F2', text: '#DC2626', label: 'Could not approve', hint: '' },
};

interface Props {
    connections: IdxConnection[];
    availableMlses: AvailableMls[];
    mlsRequests: MlsRequest[];
    showAddConnection: boolean;
    setShowAddConnection: (v: boolean) => void;
}

export default function ConnectionsTab({ connections, availableMlses, mlsRequests, setShowAddConnection }: Props) {
    const [requestingMls, setRequestingMls] = useState<AvailableMls | null>(null);

    // MLSes the user has an OPEN request or active connection for — those rows
    // are surfaced above. Denied requests don't block — the user can re-apply.
    const occupiedSlugs = new Set([
        ...mlsRequests.filter((r) => r.status !== 'denied').map((r) => r.mls?.slug).filter(Boolean) as string[],
        ...connections.map((c) => c.mls_slug),
    ]);
    const browsableMlses = availableMlses.filter((m) => !occupiedSlugs.has(m.slug));

    const openRequests = mlsRequests.filter((r) => r.status !== 'integrated' && r.status !== 'denied');
    const integratedRequests = mlsRequests.filter((r) => r.status === 'integrated');

    return (
        <div className="space-y-6">
            {/* Active connections — already integrated */}
            {connections.length > 0 && (
                <section>
                    <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Active connections</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {connections.map((c) => (
                            <ConnectionCard key={c.id} connection={c} />
                        ))}
                    </div>
                </section>
            )}

            {/* Open requests */}
            {openRequests.length > 0 && (
                <section>
                    <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Pending requests</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {openRequests.map((r) => <RequestCard key={r.id} request={r} />)}
                    </div>
                </section>
            )}

            {/* Denied requests (collapsed details) */}
            {mlsRequests.filter((r) => r.status === 'denied').length > 0 && (
                <section>
                    <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Denied</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {mlsRequests.filter((r) => r.status === 'denied').map((r) => <RequestCard key={r.id} request={r} />)}
                    </div>
                </section>
            )}

            {/* Browse available MLSes */}
            <section>
                <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Available MLSes</p>
                {browsableMlses.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-8 text-center">
                        {availableMlses.length === 0 ? (
                            <>
                                <p className="text-sm font-medium text-[#111315]">No MLSes available yet</p>
                                <p className="text-xs text-[#8B9096] mt-1">Our team is onboarding MLSes. Check back soon.</p>
                            </>
                        ) : (
                            <p className="text-xs text-[#8B9096]">You've requested or integrated every MLS we currently offer.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {browsableMlses.map((m) => (
                            <MlsCard key={m.slug} mls={m} onRequest={() => setRequestingMls(m)} />
                        ))}
                    </div>
                )}
            </section>

            {requestingMls && (
                <RequestForm
                    mls={requestingMls}
                    availableMlses={availableMlses}
                    onClose={() => setRequestingMls(null)}
                />
            )}
        </div>
    );
}

function MlsCard({ mls, onRequest }: { mls: AvailableMls; onRequest: () => void }) {
    return (
        <div className="bg-white border border-[#E4E7EB] rounded-xl p-4 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    {mls.logo ? (
                        <img src={mls.logo} alt="" className="h-8 max-w-[64px] object-contain shrink-0" />
                    ) : (
                        <div className="h-8 w-8 rounded bg-[#F3F4F6] shrink-0" />
                    )}
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111315] truncate">{mls.name}</p>
                        {mls.region && <p className="text-[10px] text-[#8B9096]">{mls.region}</p>}
                    </div>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold ${mls.monthly_fee_cents === 0 ? 'text-[#059669]' : 'text-[#111315]'}`}>
                    {mls.monthly_fee_label}
                </span>
            </div>

            {/* Only highlight VOW — IDX is implied. */}
            {mls.has_vow_feed && (
                <div className="flex items-center gap-1 mb-3">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#FEF3C7] text-[#D97706]">VOW</span>
                </div>
            )}

            <button
                onClick={onRequest}
                className="mt-auto h-8 px-3 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors"
            >
                Request connection
            </button>
        </div>
    );
}

function RequestCard({ request }: { request: MlsRequest }) {
    const cfg = statusConfig[request.status];
    return (
        <div className="bg-white border border-[#E4E7EB] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    {request.mls?.logo ? (
                        <img src={request.mls.logo} alt="" className="h-8 max-w-[64px] object-contain shrink-0" />
                    ) : (
                        <div className="h-8 w-8 rounded bg-[#F3F4F6] shrink-0" />
                    )}
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111315] truncate">{request.mls?.name}</p>
                        <p className="text-[10px] text-[#8B9096]">Requested {new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                    {cfg.label}
                </span>
            </div>

            {/* Status hint — explains what's happening for the user */}
            {cfg.hint && request.status !== 'denied' && (
                <p className="text-[11px] text-[#5F656D] mb-2">{cfg.hint}</p>
            )}

            {/* MLS-specific setup notes from admin (paperwork warnings, etc.) */}
            {request.mls?.setup_notes && request.status !== 'integrated' && request.status !== 'denied' && (
                <div className="mt-2 mb-2 px-3 py-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-md">
                    <p className="text-[10px] text-[#92400E] whitespace-pre-line">{request.mls.setup_notes}</p>
                </div>
            )}

            {request.feed_types_requested.includes('vow') && (
                <div className="flex items-center gap-1 mb-2">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#FEF3C7] text-[#D97706]">VOW</span>
                </div>
            )}
            {request.status === 'denied' && request.denied_reason && (
                <p className="text-[11px] text-[#DC2626] mt-2">Reason: {request.denied_reason}</p>
            )}
            {request.status === 'pending' && (
                <button
                    onClick={() => {
                        if (confirm('Cancel this request?')) router.delete(route('crm.idx.connection-requests.destroy', request.id), { preserveScroll: true });
                    }}
                    className="mt-2 text-[10px] font-medium text-[#8B9096] hover:text-[#DC2626]"
                >
                    Cancel request
                </button>
            )}
        </div>
    );
}

function ConnectionCard({ connection }: { connection: IdxConnection }) {
    return (
        <div className="bg-white border border-[#E4E7EB] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    {connection.logo_url ? (
                        <img src={connection.logo_url} alt="" className="h-8 max-w-[64px] object-contain shrink-0" />
                    ) : (
                        <div className="h-8 w-8 rounded bg-[#F3F4F6] shrink-0" />
                    )}
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111315] truncate">{connection.display_name}</p>
                        {connection.region && <p className="text-[10px] text-[#8B9096]">{connection.region}</p>}
                    </div>
                </div>
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${connection.test_status === 'passed' ? 'bg-[#ECFDF5] text-[#059669]' : connection.test_status === 'failed' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                    {connection.test_status === 'passed' ? 'Connected' : connection.test_status === 'failed' ? 'Error' : 'Untested'}
                </span>
            </div>
            {/* VOW is highlighted; IDX is the default and doesn't need its own pill */}
            {(connection.feed_types || []).includes('vow') && (
                <div className="flex items-center gap-1 mb-1">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#FEF3C7] text-[#D97706]">VOW</span>
                </div>
            )}
            {(connection.agent_id || connection.office_id) && (
                <div className="flex items-center gap-1 text-[10px] text-[#5F656D]">
                    {connection.agent_id && <span>Agent: {connection.agent_id}</span>}
                    {connection.office_id && <span>· Office: {connection.office_id}</span>}
                </div>
            )}
        </div>
    );
}

function RequestForm({ mls, availableMlses, onClose }: { mls: AvailableMls; availableMlses: AvailableMls[]; onClose: () => void }) {
    const m = availableMlses.find((x) => x.slug === mls.slug) || mls;
    const defaultFeeds = [m.has_idx_feed ? 'idx' : null].filter(Boolean) as string[];

    const { data, setData, post, processing, errors } = useForm({
        mls_provider_id: m.id,
        feed_types: defaultFeeds,
        is_principal_broker: false,
        brokerage_name: '',
        principal_broker_name: '',
        principal_broker_email: '',
        idx_domain: '',
        user_notes: '',
    });

    function toggleFeed(feed: string) {
        setData('feed_types', data.feed_types.includes(feed)
            ? data.feed_types.filter((f) => f !== feed)
            : [...data.feed_types, feed]);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('crm.idx.connection-requests.store'), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    const inputClass = 'block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]';
    const labelClass = 'block text-xs font-medium text-[#5F656D] mb-1.5';

    // Lock body scroll while modal is open + close on Escape.
    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    // Portal to <body> so the backdrop covers the full viewport regardless of
    // any ancestor's stacking / transform / overflow context.
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] bg-white shadow-2xl border border-[#E4E7EB] rounded-xl flex flex-col">
                <div className="flex items-center justify-between px-5 h-12 border-b border-[#E4E7EB] shrink-0">
                    <h2 className="text-sm font-semibold text-[#111315]">Request {m.name}</h2>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#111315]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={submit} className="flex-1 overflow-y-auto">
                    <div className="p-5 space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg">
                            {m.logo ? <img src={m.logo} alt="" className="h-8 max-w-[64px] object-contain" /> : <div className="h-8 w-8 rounded bg-[#E4E7EB]" />}
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[#111315] truncate">{m.name}</p>
                                <p className="text-[11px] text-[#8B9096]">{[m.region, m.country].filter(Boolean).join(' · ')}</p>
                            </div>
                            <span className={`text-[11px] font-semibold ${m.monthly_fee_cents === 0 ? 'text-[#059669]' : 'text-[#111315]'}`}>{m.monthly_fee_label}</span>
                        </div>

                        {m.monthly_fee_cents > 0 && (
                            <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
                                <p className="text-[11px] text-[#92400E]">
                                    This MLS has a pass-through fee of <strong>{m.monthly_fee_label}</strong>. You won't be charged until your connection is active.
                                </p>
                            </div>
                        )}

                        {m.setup_notes && (
                            <div className="p-3 bg-[#EBF5FF] border border-[#BFDBFE] rounded-lg">
                                <div className="flex items-start gap-2">
                                    <svg className="h-4 w-4 text-[#1693C9] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                                    </svg>
                                    <div>
                                        <p className="text-[11px] font-semibold text-[#1693C9] mb-0.5">What to expect</p>
                                        <p className="text-[11px] text-[#1E40AF] whitespace-pre-line">{m.setup_notes}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={labelClass}>Feeds *</label>
                            <div className="grid grid-cols-2 gap-2">
                                {m.has_idx_feed && (
                                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${data.feed_types.includes('idx') ? 'border-[#1693C9] bg-[#EBF5FF]' : 'border-[#E4E7EB]'}`}>
                                        <input type="checkbox" checked={data.feed_types.includes('idx')} onChange={() => toggleFeed('idx')} className="rounded text-[#1693C9]" />
                                        <div>
                                            <p className="text-xs font-medium text-[#111315]">IDX</p>
                                            <p className="text-[10px] text-[#8B9096]">Public listings</p>
                                        </div>
                                    </label>
                                )}
                                {m.has_vow_feed && (
                                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${data.feed_types.includes('vow') ? 'border-[#1693C9] bg-[#EBF5FF]' : 'border-[#E4E7EB]'}`}>
                                        <input type="checkbox" checked={data.feed_types.includes('vow')} onChange={() => toggleFeed('vow')} className="rounded text-[#1693C9]" />
                                        <div>
                                            <p className="text-xs font-medium text-[#111315]">VOW</p>
                                            <p className="text-[10px] text-[#8B9096]">Logged-in members only</p>
                                        </div>
                                    </label>
                                )}
                            </div>
                            {errors.feed_types && <p className="mt-1 text-[11px] text-red-500">{errors.feed_types}</p>}
                        </div>

                        {/* ─── Broker authorization ─── */}
                        <div className="space-y-3 pt-2 border-t border-[#F3F4F6]">
                            <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg border border-[#E4E7EB] hover:bg-[#F9FAFB] transition-colors">
                                <input
                                    type="checkbox"
                                    checked={data.is_principal_broker}
                                    onChange={(e) => setData('is_principal_broker', e.target.checked)}
                                    className="mt-0.5 rounded text-[#1693C9]"
                                />
                                <div>
                                    <p className="text-xs font-medium text-[#111315]">I am also the Designated Principal Broker with my MLS</p>
                                    <p className="text-[10px] text-[#8B9096] mt-0.5">Check this if you're the broker of record for your brokerage.</p>
                                </div>
                            </label>

                            <div>
                                <label className={labelClass}>Brokerage name *</label>
                                <input
                                    type="text"
                                    value={data.brokerage_name}
                                    onChange={(e) => setData('brokerage_name', e.target.value)}
                                    placeholder="e.g. Coldwell Banker Realty"
                                    required
                                    className={inputClass}
                                />
                                {errors.brokerage_name && <p className="text-[11px] text-red-500 mt-1">{errors.brokerage_name}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Principal Broker of Record *</label>
                                <input
                                    type="text"
                                    value={data.principal_broker_name}
                                    onChange={(e) => setData('principal_broker_name', e.target.value)}
                                    placeholder="e.g. Jane Smith"
                                    required
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">Designated Principal Broker listed at your MLS for your brokerage.</p>
                                {errors.principal_broker_name && <p className="text-[11px] text-red-500 mt-1">{errors.principal_broker_name}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>Principal Broker email address *</label>
                                <input
                                    type="email"
                                    value={data.principal_broker_email}
                                    onChange={(e) => setData('principal_broker_email', e.target.value)}
                                    placeholder="broker@brokerage.com"
                                    required
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">Please note: Your broker may be required to authorize your IDX Agreement, per your Association's policy.</p>
                                {errors.principal_broker_email && <p className="text-[11px] text-red-500 mt-1">{errors.principal_broker_email}</p>}
                            </div>

                            <div>
                                <label className={labelClass}>IDX website domain</label>
                                <input
                                    type="text"
                                    value={data.idx_domain}
                                    onChange={(e) => setData('idx_domain', e.target.value)}
                                    placeholder="e.g. www.yoursite.com"
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">The domain where listings will be embedded. Most MLSes pre-approve per domain.</p>
                            </div>

                            <div>
                                <label className={labelClass}>Notes for our team</label>
                                <textarea
                                    value={data.user_notes}
                                    onChange={(e) => setData('user_notes', e.target.value)}
                                    rows={2}
                                    placeholder="Anything special we should know."
                                    className="block w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9] resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#E4E7EB] shrink-0">
                        <button type="button" onClick={onClose} className="h-8 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] rounded-lg">Cancel</button>
                        <button type="submit" disabled={processing || data.feed_types.length === 0} className="h-8 px-5 bg-[#1693C9] text-white text-xs font-semibold rounded-lg hover:bg-[#1380AF] disabled:opacity-50">
                            {processing ? 'Submitting…' : 'Submit request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}
