import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AgentWebsite } from '../../../types';
import { inputClass, cardClass } from '../../../constants';

interface DnsRecord {
    type: string;
    host: string;
    value: string;
    purpose: string;
}

interface DomainState {
    custom_domain: string | null;
    domain_status: string | null;
    domain_last_checked_at: string | null;
    dns_records: DnsRecord[];
}

interface VerifyResult {
    verified: boolean;
    pointing?: boolean;
    hostname_status?: string | null;
    ssl_status?: string | null;
}

// One DNS field (Name / Value) with a one-click copy — registrar UIs differ, so
// letting the owner copy the exact string avoids typos that break verification.
function CopyField({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: () => void }) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <code className="flex-1 truncate font-mono text-[12px] text-[#111315] bg-white border border-[#E4E7EB] rounded px-2 py-1">{value}</code>
            <button type="button" onClick={onCopy} className="shrink-0 text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF]">
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'Pending DNS',
    connected: 'Connected',
};

// While a domain is pending, the SSL cert is provisioned in the background
// (queued job + Cloudflare). Auto-poll so it goes live without the user having
// to click Verify repeatedly — but BOUNDED: slow cadence, capped attempts, and
// paused when the tab is hidden, so it never hammers the server/Cloudflare.
const POLL_MS = 20000;
const MAX_POLLS = 15; // ~5 minutes, then stop and let the user click Verify

export default function DomainSection({ website }: { website: AgentWebsite }) {
    const siteUrl = `${window.location.origin}/site/${website.slug}`;
    const apiBase = `/api/website-editor/${website.id}/domain`;

    const [state, setState] = useState<DomainState | null>(null);
    const [domain, setDomain] = useState(website.custom_domain ?? '');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [sslStatus, setSslStatus] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (text: string, key: string) => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(key);
            window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
        }).catch(() => undefined);
    };

    useEffect(() => {
        axios.get(apiBase).then((res) => setState(res.data)).catch(() => setState(null));
    }, [apiBase]);

    // Auto-poll while pending so background SSL provisioning is reflected live.
    // Bounded: capped attempts, paused when the tab is hidden, and it stops the
    // moment the status leaves "pending" (effect deps change → cleanup).
    useEffect(() => {
        if (state?.domain_status !== 'pending' || !state?.custom_domain) return;
        let polls = 0;
        let id = 0;
        const tick = async () => {
            if (document.hidden) return;            // don't poll a backgrounded tab
            if (polls >= MAX_POLLS) {               // give up after the cap
                window.clearInterval(id);
                return;
            }
            polls += 1;
            try {
                const res = await axios.post<DomainState & { result?: VerifyResult }>(`${apiBase}/verify`);
                setState(res.data);
                setSslStatus(res.data.result?.ssl_status ?? null);
            } catch {
                // transient errors are fine — keep polling
            }
        };
        id = window.setInterval(tick, POLL_MS);
        return () => window.clearInterval(id);
    }, [state?.domain_status, state?.custom_domain, apiBase]);

    async function run(action: () => Promise<{ data: DomainState & { result?: VerifyResult } }>) {
        setBusy(true);
        setNotice(null);
        try {
            const res = await action();
            setState(res.data);
            setDomain(res.data.custom_domain ?? '');
            if (res.data.result) {
                const r = res.data.result;
                setSslStatus(r.ssl_status ?? null);
                if (r.verified) {
                    setNotice('Domain verified — SSL active, your site is live.');
                } else {
                    const detail = r.ssl_status ? ` (SSL: ${r.ssl_status.replace(/_/g, ' ')})` : '';
                    setNotice(`Not connected yet${detail}. DNS/SSL can take a few minutes after you add the record — try Verify again shortly.`);
                }
            }
        } catch (e) {
            const err = e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            setNotice(err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat()[0]
                : err.response?.data?.message ?? 'Something went wrong.');
        } finally {
            setBusy(false);
        }
    }

    const status = state?.domain_status ?? null;
    const isConnected = status === 'connected';

    return (
        <div className={`${cardClass} divide-y divide-[#E4E7EB]`}>
            <div className="p-6">
                <p className="text-[14px] font-semibold text-[#111315] mb-1">{isConnected && state?.custom_domain ? 'Your site is live at' : 'Default URL'}</p>
                {isConnected && state?.custom_domain ? (
                    <a
                        href={`https://${state.custom_domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[13px] text-[#1693C9] font-mono mt-2 bg-[#F0FAF5] px-3 py-2 rounded-lg border border-green-200 hover:underline"
                    >
                        https://{state.custom_domain}
                    </a>
                ) : (
                    <p className="text-[13px] text-[#5F656D] font-mono mt-2 bg-[#F9FAFB] px-3 py-2 rounded-lg border border-[#E4E7EB]">{siteUrl}</p>
                )}
                {isConnected && state?.custom_domain && (
                    <p className="text-[10px] text-[#8B9096] mt-1.5">Default URL: <span className="font-mono">{siteUrl}</span></p>
                )}
            </div>

            <div className="p-6">
                <div className="flex items-center gap-3 mb-1">
                    <p className="text-[14px] font-semibold text-[#111315]">Custom Domain</p>
                    {status && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {STATUS_LABEL[status] ?? status}
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-[#8B9096] mb-3">Point your own domain to this website, then verify the DNS records below.</p>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className={inputClass}
                        placeholder="www.yourdomain.com"
                        disabled={busy}
                    />
                    <button
                        type="button"
                        onClick={() => run(() => axios.post(apiBase, { domain }))}
                        disabled={busy || !domain.trim()}
                        className="shrink-0 h-10 px-4 rounded-lg bg-[#1693C9] text-white text-[13px] font-semibold hover:bg-[#1380AF] disabled:opacity-40"
                    >
                        {state?.custom_domain ? 'Update' : 'Connect'}
                    </button>
                </div>

                {notice && <p className="mt-3 text-[12px] text-[#5F656D]">{notice}</p>}

                {state?.custom_domain && (
                    <>
                        <div className="mt-5">
                            <p className="text-[12px] font-semibold text-[#111315] mb-1">
                                Add {state.dns_records.length > 1 ? 'these records' : 'this record'} at your domain provider
                            </p>
                            <p className="text-[11px] text-[#8B9096] mb-3">
                                Open your DNS provider (Cloudflare, GoDaddy, Namecheap…) and add {state.dns_records.length > 1 ? 'the records' : 'the record'} below. Field names vary by provider — common aliases are shown.
                            </p>

                            <div className="space-y-2">
                                {state.dns_records.map((r) => (
                                    <div key={`${r.type}-${r.host}`} className="rounded-lg border border-[#E4E7EB] bg-[#F9FAFB] p-3">
                                        <div className="grid grid-cols-[96px_1fr] items-center gap-x-3 gap-y-2 text-[12px]">
                                            <span className="text-[#8B9096]">Type</span>
                                            <span className="font-mono font-semibold text-[#111315]">{r.type}</span>

                                            <span className="text-[#8B9096]">Name / Host</span>
                                            <CopyField value={r.host} copied={copied === `${r.type}-host`} onCopy={() => copy(r.host, `${r.type}-host`)} />

                                            <span className="text-[#8B9096]">Value / Target</span>
                                            <CopyField value={r.value} copied={copied === `${r.type}-value`} onCopy={() => copy(r.value, `${r.type}-value`)} />
                                        </div>
                                        {r.purpose && <p className="text-[11px] text-[#8B9096] mt-2">{r.purpose}</p>}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                <svg className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                    <span className="font-semibold">Using Cloudflare?</span> Set <span className="font-semibold">Proxy status</span> to <span className="font-semibold">DNS only</span> (grey cloud — click the orange cloud to turn it grey). We provision SSL and CDN for you; leaving it Proxied will cause SSL errors.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => run(() => axios.post(`${apiBase}/verify`))}
                                disabled={busy}
                                className="h-9 px-4 rounded-lg bg-[#111315] text-white text-[13px] font-semibold hover:bg-black disabled:opacity-40"
                            >
                                {busy ? 'Checking...' : 'Verify DNS'}
                            </button>
                            <button
                                type="button"
                                onClick={() => run(() => axios.delete(apiBase))}
                                disabled={busy}
                                className="text-[13px] font-medium text-red-500 hover:text-red-600 disabled:opacity-40"
                            >
                                Remove
                            </button>
                            {state.domain_last_checked_at && (
                                <span className="ml-auto text-[11px] text-[#8B9096]">Last checked {new Date(state.domain_last_checked_at).toLocaleString()}</span>
                            )}
                        </div>

                        {status === 'pending' ? (
                            <div className="mt-4 flex items-center gap-2 text-[12px] text-[#5F656D]">
                                <svg className="animate-spin h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                                </svg>
                                <span>
                                    Provisioning SSL automatically{sslStatus ? ` (${sslStatus.replace(/_/g, ' ')})` : ''} — checking every few seconds. This can take a few minutes.
                                </span>
                            </div>
                        ) : (
                            <p className="mt-4 text-[10px] text-[#8B9096]">SSL is issued and renewed automatically by Cloudflare.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
