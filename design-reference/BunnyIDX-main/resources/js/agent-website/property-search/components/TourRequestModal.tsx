import { useEffect, useState } from 'react';
import { PsListing } from '../types';
import { onImgError, PHOTO_PLACEHOLDER, statusColor } from '../lib/format';
import { submitShowingRequest, submitTourRequest } from '../lib/api';
import ConsentCheck from './ConsentCheck';

interface Props {
    open: boolean;
    onClose: () => void;
    listing: PsListing;
    /** Dedicated tour endpoint — creates the CRM lead + calendar task. */
    endpoint?: string;
    /** Legacy fallback (plain lead capture) when the tour endpoint is absent. */
    leadEndpoint: string;
    consentText?: string;
    accent: string;
    /** 'tour' (default) = schedule a showing; 'contact' = plain message to the agent. */
    variant?: 'tour' | 'contact';
}

const TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'];

const fmtSlot = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const am = h < 12;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
};

/**
 * "Request a tour" modal — property header (photo, address, price, status),
 * In person / Virtual toggle, date + time pickers, contact details and the
 * consent disclosure. Submits to the tour endpoint, which creates the CRM
 * lead, a timeline activity, and a calendar task for the agent.
 */
export default function TourRequestModal({ open, onClose, listing: l, endpoint, leadEndpoint, consentText, accent, variant = 'tour' }: Props) {
    const isContact = variant === 'contact';
    const [tourType, setTourType] = useState<'in_person' | 'virtual'>('in_person');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setSent(false);
        setError(null);
    }, [open]);

    if (!open) return null;

    const navy = accent || '#022E50';
    const today = new Date().toISOString().slice(0, 10);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const ok = !isContact && endpoint
                ? await submitTourRequest(endpoint, {
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    tour_type: tourType,
                    date,
                    time,
                    message: form.message,
                    property_address: l.address,
                })
                : await submitShowingRequest(leadEndpoint, { ...form, date, propertyAddress: l.address });
            if (ok) setSent(true);
            else setError('Could not send your request. Please try again.');
        } catch {
            setError('Could not send your request. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    const segBtn = (on: boolean): React.CSSProperties => ({
        flex: 1, height: 42, borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
        border: `1.5px solid ${on ? navy : '#d1d5db'}`,
        backgroundColor: on ? navy : '#fff',
        color: on ? '#fff' : '#374151',
    });
    const inputCss: React.CSSProperties = { width: '100%', height: 42, border: '1px solid #d1d5db', borderRadius: 10, padding: '0 12px', fontSize: 14, color: '#111827', backgroundColor: '#fff' };

    return (
        <div className="fixed inset-0 z-[46000] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:py-10" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="relative w-full max-w-[640px] rounded-2xl bg-white p-5 shadow-2xl sm:p-6 ps-tour-modal">
                <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>

                <h3 style={{ fontSize: 19, fontWeight: 800, color: navy, letterSpacing: '-.01em' }}>{isContact ? 'Contact Agent' : 'Request a tour'}</h3>

                {/* Property header */}
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
                    <img src={l.photos[0] || PHOTO_PLACEHOLDER} onError={onImgError} alt={l.address} className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                        <div className="truncate" style={{ fontSize: 13.5, fontWeight: 700, color: '#111315' }}>{l.address}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span style={{ fontSize: 15, fontWeight: 800, color: navy }}>{l.price_formatted}</span>
                            <span className="inline-flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: statusColor(l.status_label) }}>
                                <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: statusColor(l.status_label) }} />
                                {l.status_label}
                            </span>
                        </div>
                    </div>
                </div>

                {sent ? (
                    <div className="py-10 text-center">
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{isContact ? 'Message sent ✓' : 'Tour request sent ✓'}</p>
                        <p className="mt-2" style={{ fontSize: 13, color: '#6b7280' }}>{isContact ? 'The agent will get back to you shortly.' : `The agent will confirm your ${tourType === 'virtual' ? 'virtual' : 'in-person'} tour shortly.`}</p>
                    </div>
                ) : (
                    <>
                        <p className="mt-4" style={{ fontSize: 14, fontWeight: 700, color: '#111315' }}>{isContact ? 'Have a question about this listing?' : 'Interested in this listing?'}</p>
                        <p style={{ fontSize: 12.5, color: '#6b7280' }}>{isContact ? 'Send the agent a message and they’ll get back to you.' : 'Pick a tour type and suggest a date and time that works for you.'}</p>

                        <form onSubmit={submit} className="mt-4 space-y-3">
                            {/* Two columns: tour details left, contact details right
                                (stacks on mobile). */}
                            <div className={`grid grid-cols-1 gap-x-5 gap-y-3 ${isContact ? '' : 'sm:grid-cols-2'}`}>
                                {!isContact && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <button type="button" style={segBtn(tourType === 'in_person')} onClick={() => setTourType('in_person')}>In person</button>
                                        <button type="button" style={segBtn(tourType === 'virtual')} onClick={() => setTourType('virtual')}>Virtual</button>
                                    </div>
                                    <label className="block" style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Choose a date
                                        <input type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputCss, marginTop: 5 }} />
                                    </label>
                                    <label className="block" style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Choose a time
                                        <select value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputCss, marginTop: 5 }}>
                                            <option value="">Any time</option>
                                            {TIME_SLOTS.map((t) => <option key={t} value={t}>{fmtSlot(t)}</option>)}
                                        </select>
                                    </label>
                                </div>
                                )}
                                <div className="space-y-3">
                                    <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputCss} />
                                    <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputCss} />
                                    <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputCss} />
                                    <textarea placeholder={isContact ? 'Your message' : 'Message (optional)'} required={isContact} rows={isContact ? 4 : 2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} style={{ ...inputCss, height: 'auto', padding: 10 }} />
                                </div>
                            </div>
                            <ConsentCheck text={consentText} />
                            {error && <p style={{ fontSize: 12.5, fontWeight: 600, color: '#dc2626' }}>{error}</p>}
                            <button type="submit" disabled={busy} className="flex w-full items-center justify-center rounded-xl text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ height: 46, backgroundColor: navy, fontSize: 14, fontWeight: 700 }}>
                                {busy ? 'Sending…' : (isContact ? 'Send Message' : 'Request this tour')}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
