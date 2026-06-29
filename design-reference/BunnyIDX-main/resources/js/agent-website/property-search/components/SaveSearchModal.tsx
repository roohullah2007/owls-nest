import { useState } from 'react';
import { saveAccountSearch, submitSaveSearch } from '../lib/api';
import ConsentCheck from './ConsentCheck';

interface Props {
    open: boolean;
    onClose: () => void;
    leadEndpoint: string;
    /** Human-readable summary of the active filters, stored on the CRM lead. */
    filtersSummary: string;
    /** Logged-in visitor flow: saves to the account instead of lead capture. */
    authed?: boolean;
    accountEndpoint?: string;
    /** The raw filter payload to persist with an account-saved search. */
    filtersPayload?: Record<string, unknown>;
    searchText?: string;
    /** Marketing-consent disclosure (guest lead-capture form only). */
    consentText?: string;
}

/**
 * "Save this search" — logged-in visitors store it on their account (named,
 * with the filter payload, visible in /account); guests go through the lead
 * capture form (creates a CRM contact).
 */
export default function SaveSearchModal({ open, onClose, leadEndpoint, filtersSummary, authed = false, accountEndpoint, filtersPayload, searchText, consentText }: Props) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [searchName, setSearchName] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

    if (!open) return null;

    const accountMode = authed && !!accountEndpoint;

    function finish(ok: boolean, successText: string) {
        if (ok) {
            setMsg({ text: successText, error: false });
            window.setTimeout(() => { setMsg(null); onClose(); }, 1800);
        } else {
            setMsg({ text: 'Could not save your search. Please try again.', error: true });
        }
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        try {
            if (accountMode && accountEndpoint) {
                const ok = await saveAccountSearch(accountEndpoint, {
                    name: searchName.trim() || (filtersSummary || 'My search').slice(0, 120),
                    filters: filtersPayload || {},
                    search_text: searchText || '',
                });
                finish(ok, 'Saved to your account!');
            } else {
                const ok = await submitSaveSearch(leadEndpoint, { name, email, summary: filtersSummary });
                finish(ok, 'Saved! We’ll be in touch when new homes match.');
            }
        } catch {
            setMsg({ text: 'Could not save your search. Please try again.', error: true });
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="ps-modal">
            <div className="ps-modal-backdrop" onClick={onClose} />
            <div className="ps-modal-card" role="dialog" aria-modal="true" aria-labelledby="ps-save-title">
                <button type="button" className="ps-modal-x" onClick={onClose} aria-label="Close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                <h3 id="ps-save-title">Save this search</h3>
                <p className="ps-modal-sub">
                    {accountMode ? 'Keep this search on your account and revisit it any time.' : 'Get notified when new homes match your search.'}
                </p>
                <form onSubmit={submit}>
                    {accountMode ? (
                        <label>Search name<input type="text" required value={searchName} placeholder={filtersSummary || 'e.g. 3-bed condos in Miami'} onChange={(e) => setSearchName(e.target.value)} /></label>
                    ) : (
                        <>
                            <label>Name<input type="text" required value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} /></label>
                            <label>Email<input type="email" required value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} /></label>
                            <ConsentCheck text={consentText} />
                        </>
                    )}
                    <button type="submit" disabled={busy} className="ps-save-btn" style={{ width: '100%', height: 42, justifyContent: 'center', display: 'flex', alignItems: 'center' }}>
                        {busy ? 'Saving…' : 'Save Search'}
                    </button>
                    {msg && <p className={`ps-modal-msg ${msg.error ? 'is-error' : ''}`}>{msg.text}</p>}
                </form>
            </div>
        </div>
    );
}
