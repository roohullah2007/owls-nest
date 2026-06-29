import { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Connect / verify / remove a custom domain for a landing page — written for a
 * non-technical user: plain language, a clear 3-step guide, friendly statuses,
 * and the DNS details tucked behind copy buttons + a "where do I add this?" help.
 * Same API as before (/api/landing-page-editor/{uuid}/domain); UX-only layer.
 */
interface DnsRecord { type: string; host: string; value: string; purpose: string }
interface DomainState {
    custom_domain: string | null;
    domain_status: string | null;
    domain_last_checked_at: string | null;
    dns_records: DnsRecord[];
}
interface VerifyResult { verified: boolean; pointing?: boolean; hostname_status?: string | null; ssl_status?: string | null }

const POLL_MS = 20000;
const MAX_POLLS = 15;

// Plain-language label for each DNS field — no "host/target" jargon.
const FIELD_LABEL: Record<string, string> = { type: 'Record type', host: 'Name', value: 'Points to' };

function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
    return (
        <div>
            <div className="mb-1 text-[11px] font-medium text-[#8B9096]">{label}</div>
            <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border border-[#E4E7EB] bg-white px-2.5 py-1.5 font-mono text-[12px] text-[#111315]">{value}</code>
                <button type="button" onClick={onCopy} className={`shrink-0 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${copied ? 'border-green-200 bg-green-50 text-green-700' : 'border-[#C8CCD1] text-[#1693C9] hover:bg-[#F3F4F6]'}`}>
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
}

function StepDot({ n, done }: { n: number; done?: boolean }) {
    return (
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${done ? 'bg-green-100 text-green-700' : 'bg-[#E0F2FE] text-[#1693C9]'}`}>
            {done ? '✓' : n}
        </span>
    );
}

export default function DomainModal({ uuid, slug, customDomain, onClose }: { uuid: string; slug: string; customDomain: string | null; onClose: () => void }) {
    const publicUrl = `${window.location.origin}/l/${slug}`;
    const apiBase = `/api/landing-page-editor/${uuid}/domain`;

    const [state, setState] = useState<DomainState | null>(null);
    const [domain, setDomain] = useState(customDomain ?? '');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ kind: 'info' | 'error' | 'success'; text: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [changing, setChanging] = useState(false); // "change domain" toggle when connected

    const copy = (text: string, key: string) => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(key);
            window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
        }).catch(() => undefined);
    };

    useEffect(() => {
        axios.get(apiBase).then((res) => setState(res.data)).catch(() => setState(null));
    }, [apiBase]);

    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [busy, onClose]);

    // Auto-check while we're waiting for the domain to go live (bounded + paused on hidden tab).
    useEffect(() => {
        if (state?.domain_status !== 'pending' || !state?.custom_domain) return;
        let polls = 0;
        let id = 0;
        const tick = async () => {
            if (document.hidden) return;
            if (polls >= MAX_POLLS) { window.clearInterval(id); return; }
            polls += 1;
            try {
                const res = await axios.post<DomainState & { result?: VerifyResult }>(`${apiBase}/verify`);
                setState(res.data);
                if (res.data.result?.verified) setNotice({ kind: 'success', text: 'Your domain is connected and your page is live.' });
            } catch { /* transient — keep checking */ }
        };
        id = window.setInterval(tick, POLL_MS);
        return () => window.clearInterval(id);
    }, [state?.domain_status, state?.custom_domain, apiBase]);

    async function run(action: () => Promise<{ data: DomainState & { result?: VerifyResult } }>, opts?: { onDone?: () => void }) {
        setBusy(true);
        setNotice(null);
        try {
            const res = await action();
            setState(res.data);
            setDomain(res.data.custom_domain ?? '');
            if (res.data.result) {
                setNotice(res.data.result.verified
                    ? { kind: 'success', text: 'Your domain is connected and your page is live.' }
                    : { kind: 'info', text: "Not connected yet. After you add the record at your provider it can take a few minutes — we'll keep checking, or tap “Verify domain” again shortly." });
            }
            opts?.onDone?.();
        } catch (e) {
            const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            setNotice({ kind: 'error', text: err.response?.data?.errors ? Object.values(err.response.data.errors).flat()[0] : err.response?.data?.message ?? 'Something went wrong. Please try again.' });
        } finally {
            setBusy(false);
        }
    }

    const status = state?.domain_status ?? null;
    const isConnected = status === 'connected';
    const isPending = status === 'pending';
    const hasDomain = !!state?.custom_domain;

    const noticeStyle = notice?.kind === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : notice?.kind === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-[#E4E7EB] bg-[#F9FAFB] text-[#5F656D]';

    return (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-3 py-6 sm:p-4 sm:py-10" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[#E4E7EB] bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#E4E7EB] px-5 py-4">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[#111315]">Use your own web address</h2>
                        <p className="text-[11px] text-[#8B9096]">Show this page on your domain instead of our link.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#8B9096] hover:bg-[#F3F4F6] hover:text-[#111315] disabled:opacity-40">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                </div>

                {/* ───────── CONNECTED: success state ───────── */}
                {isConnected && !changing ? (
                    <div className="p-5">
                        <div className="rounded-xl border border-green-200 bg-[#F0FAF5] p-5 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                            </div>
                            <p className="text-[15px] font-semibold text-[#111315]">Domain connected</p>
                            <p className="mt-1 text-[12px] text-[#5F656D]">Your page is live and secured with SSL.</p>
                            <a href={`https://${state!.custom_domain}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1693C9] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1380AF]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                                Visit your page
                            </a>
                            <p className="mt-3 break-all font-mono text-[12px] text-[#5F656D]">https://{state!.custom_domain}</p>
                        </div>
                        <p className="mt-3 text-center text-[11px] text-[#8B9096]">Our link still works too: <span className="font-mono">{publicUrl}</span></p>
                        <div className="mt-4 flex items-center justify-center gap-4">
                            <button type="button" onClick={() => { setChanging(true); setNotice(null); }} className="text-[12px] font-medium text-[#1693C9] hover:text-[#1380AF]">Change domain</button>
                            <span className="text-[#E4E7EB]">·</span>
                            <button type="button" onClick={() => run(() => axios.delete(apiBase), { onDone: () => setChanging(false) })} disabled={busy} className="text-[12px] font-medium text-red-500 hover:text-red-600 disabled:opacity-40">Remove domain</button>
                        </div>
                        {notice && <div className={`mt-3 rounded-lg border px-3 py-2 text-[12px] ${noticeStyle}`}>{notice.text}</div>}
                    </div>
                ) : (
                    /* ───────── NOT CONNECTED: guided setup ───────── */
                    <div className="p-5">
                        {!hasDomain && (
                            <p className="mb-4 rounded-lg bg-[#F0F9FF] px-3 py-2.5 text-[12px] leading-relaxed text-[#0B6E99]">
                                Right now your page lives at <span className="font-mono">{publicUrl}</span>. Connect a domain you own (like <span className="font-mono">offer.yourbrand.com</span>) to use it as the address instead.
                            </p>
                        )}

                        {/* Step 1 — enter domain */}
                        <div className="flex gap-3">
                            <StepDot n={1} done={hasDomain} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-[#111315]">Enter your domain</p>
                                <p className="mb-2 text-[11px] text-[#8B9096]">Type the web address you want to use. No “https://” needed.</p>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        type="text"
                                        value={domain}
                                        onChange={(e) => setDomain(e.target.value)}
                                        placeholder="offer.yourbrand.com"
                                        disabled={busy}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        className="h-10 w-full flex-1 rounded-lg border border-[#C8CCD1] px-3 text-[13px] focus:border-[#1693C9] focus:outline-none disabled:opacity-60"
                                    />
                                    <button type="button" onClick={() => run(() => axios.post(apiBase, { domain }), { onDone: () => setChanging(false) })} disabled={busy || !domain.trim()} className="h-10 shrink-0 rounded-lg bg-[#1693C9] px-4 text-[13px] font-semibold text-white hover:bg-[#1380AF] disabled:opacity-40">
                                        {busy ? 'Saving…' : hasDomain ? 'Update domain' : 'Connect domain'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {notice && !hasDomain && <div className={`mt-3 rounded-lg border px-3 py-2 text-[12px] ${noticeStyle}`}>{notice.text}</div>}

                        {hasDomain && (
                            <>
                                {/* Step 2 — add the record */}
                                <div className="mt-5 flex gap-3">
                                    <StepDot n={2} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-semibold text-[#111315]">Add {state!.dns_records.length > 1 ? 'these settings' : 'this setting'} at your domain provider</p>
                                        <p className="mb-3 text-[11px] text-[#8B9096]">Sign in where you bought your domain (GoDaddy, Namecheap, Cloudflare…) and copy {state!.dns_records.length > 1 ? 'the values' : 'the value'} below into a new record.</p>

                                        <div className="space-y-3">
                                            {state!.dns_records.map((r) => (
                                                <div key={`${r.type}-${r.host}`} className="space-y-2.5 rounded-lg border border-[#E4E7EB] bg-[#F9FAFB] p-3">
                                                    <CopyRow label={FIELD_LABEL.type} value={r.type} copied={copied === `${r.type}-type`} onCopy={() => copy(r.type, `${r.type}-type`)} />
                                                    <CopyRow label={FIELD_LABEL.host} value={r.host} copied={copied === `${r.type}-host`} onCopy={() => copy(r.host, `${r.type}-host`)} />
                                                    <CopyRow label={FIELD_LABEL.value} value={r.value} copied={copied === `${r.type}-value`} onCopy={() => copy(r.value, `${r.type}-value`)} />
                                                </div>
                                            ))}
                                        </div>

                                        <button type="button" onClick={() => setShowHelp((s) => !s)} className="mt-2.5 flex items-center gap-1 text-[12px] font-medium text-[#1693C9] hover:text-[#1380AF]">
                                            <svg className={`h-3.5 w-3.5 transition-transform ${showHelp ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
                                            Where do I add this?
                                        </button>
                                        {showHelp && (
                                            <div className="mt-2 space-y-2 rounded-lg border border-[#E4E7EB] bg-white p-3 text-[11px] leading-relaxed text-[#5F656D]">
                                                <p>1. Log in to the website where you bought your domain.</p>
                                                <p>2. Find <span className="font-medium text-[#111315]">DNS</span> settings (sometimes called “DNS”, “Name servers”, or “Advanced DNS”).</p>
                                                <p>3. Add a new record and paste the <span className="font-medium text-[#111315]">Record type</span>, <span className="font-medium text-[#111315]">Name</span>, and <span className="font-medium text-[#111315]">Points to</span> values above. Save.</p>
                                                <p className="text-[#8B9096]">Using Cloudflare? Turn the orange cloud <span className="font-medium">grey (DNS only)</span> for this record so we can secure it for you.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 3 — verify */}
                                <div className="mt-5 flex gap-3">
                                    <StepDot n={3} done={false} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-semibold text-[#111315]">We turn it on</p>
                                        <p className="text-[11px] text-[#8B9096]">After you save the record, we check it and switch on secure (SSL) automatically.</p>

                                        <div className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] ${isPending ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#E4E7EB] bg-[#F9FAFB] text-[#5F656D]'}`}>
                                            {isPending ? (
                                                <>
                                                    <svg className="h-4 w-4 shrink-0 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
                                                    <span>Checking your domain… this can take a few minutes.</span>
                                                </>
                                            ) : (
                                                <span>Not connected yet — add the record above, then tap Verify.</span>
                                            )}
                                        </div>

                                        {notice && <div className={`mt-3 rounded-lg border px-3 py-2 text-[12px] ${noticeStyle}`}>{notice.text}</div>}

                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <button type="button" onClick={() => run(() => axios.post(`${apiBase}/verify`))} disabled={busy} className="h-9 rounded-lg bg-[#111315] px-4 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">{busy ? 'Checking…' : 'Verify domain'}</button>
                                            <button type="button" onClick={() => run(() => axios.delete(apiBase), { onDone: () => { setChanging(false); setDomain(''); } })} disabled={busy} className="text-[12px] font-medium text-red-500 hover:text-red-600 disabled:opacity-40">Remove domain</button>
                                            {state!.domain_last_checked_at && <span className="ml-auto text-[11px] text-[#8B9096]">Checked {new Date(state!.domain_last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
