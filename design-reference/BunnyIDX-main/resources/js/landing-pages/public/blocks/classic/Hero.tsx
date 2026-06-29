import { useEffect, useRef, useState } from 'react';
import type { BlockProps } from '../../types';
import { Thanks } from '../../Layout';
import { useResolvedBg } from '../../LpImage';
import './Hero.css';

declare global {
    interface Window {
        google?: any;
        lpAutoLoaded?: boolean;
    }
}

export default function Hero({ data, page }: BlockProps) {
    // Guaranteed-loadable hero background (stored → category fallback → generic).
    const heroSrc = useResolvedBg('hero', page, data.image);
    const flow = data.flow ?? 'sell';
    const confirmTitle = flow === 'buyer' ? 'Is this the right area?' : 'Is this the correct home address?';

    const inputRef = useRef<HTMLInputElement>(null);
    const [address, setAddress] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [owner, setOwner] = useState('');
    const [addrInvalid, setAddrInvalid] = useState(false);
    const [ownerInvalid, setOwnerInvalid] = useState(false);

    const flowBase = page.flowUrl;

    // Sellers confirm their home on a map (modal) first; buyers just enter
    // where they're looking and go straight to the buyer questionnaire.
    function start() {
        const addr = address.trim();
        if (!addr) {
            inputRef.current?.focus();
            setAddrInvalid(true);
            return;
        }
        setAddrInvalid(false);
        if (flow === 'buyer') {
            window.location.href = flowBase + '?address=' + encodeURIComponent(addr);
            return;
        }
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
    }

    function confirmNext() {
        if (!owner) {
            setOwnerInvalid(true);
            return;
        }
        const addr = address.trim();
        window.location.href = flowBase + '?address=' + encodeURIComponent(addr) + '&owner=' + encodeURIComponent(owner);
    }

    function editAddr() {
        closeModal();
        inputRef.current?.focus();
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (
            e.key === 'Enter' &&
            !document.querySelector('.pac-container:not([style*="display: none"])')
        ) {
            e.preventDefault();
            start();
        }
    }

    // Toggle the body lock class while the modal is open + Esc to close.
    useEffect(() => {
        if (modalOpen) {
            document.body.classList.add('lp-modal-open');
        } else {
            document.body.classList.remove('lp-modal-open');
        }
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && modalOpen) closeModal();
        };
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('keydown', onEsc);
            document.body.classList.remove('lp-modal-open');
        };
    }, [modalOpen]);

    // Google Places autocomplete on the address input.
    useEffect(() => {
        if (page.submitted || !page.mapsKey) return;

        function attach() {
            const input = inputRef.current;
            if (!input || (input as any).dataset.lpAuto) return;
            if (!window.google?.maps?.places) return;
            (input as any).dataset.lpAuto = '1';
            try {
                const ac = new window.google.maps.places.Autocomplete(input, {
                    types: ['geocode'],
                    componentRestrictions: { country: 'us' },
                    fields: ['formatted_address'],
                });
                ac.addListener('place_changed', () => {
                    const p = ac.getPlace();
                    if (p && p.formatted_address) setAddress(p.formatted_address);
                });
            } catch (e) {
                /* ignore */
            }
        }

        if (window.google?.maps?.places) {
            attach();
            return;
        }

        const src = `https://maps.googleapis.com/maps/api/js?key=${page.mapsKey}&libraries=places`;
        let script = document.querySelector<HTMLScriptElement>('script[data-lp-maps]');
        if (!script) {
            script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.dataset.lpMaps = '1';
            document.head.appendChild(script);
        }
        const onLoad = () => attach();
        script.addEventListener('load', onLoad);
        // In case it's already loaded by the time we attach the listener.
        const poll = window.setInterval(() => {
            if (window.google?.maps?.places) {
                window.clearInterval(poll);
                attach();
            }
        }, 200);
        return () => {
            script?.removeEventListener('load', onLoad);
            window.clearInterval(poll);
        };
    }, [page.submitted, page.mapsKey]);

    const addr = address.trim();
    const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;

    return (
        <section
            className="lp-hero"
            id="hero"
            style={{ backgroundImage: `url('${heroSrc}')` }}
        >
            <div className="lp-container lp-hero-inner">
                <div className="lp-hero-copy">
                    {data.eyebrow && <span className="lp-eyebrow">{data.eyebrow}</span>}
                    <h1>{data.headline ?? 'Save Time and Commission'}</h1>
                    {data.subheadline && <p>{data.subheadline}</p>}

                    {page.submitted ? (
                        <div className="lp-hero-thanks">
                            <Thanks page={page} />
                        </div>
                    ) : (
                        <>
                            <div className="lp-addr-pill">
                                <span className="pin">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder={data.address_placeholder ?? 'Enter your address'}
                                    autoComplete="street-address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    onKeyDown={onKeyDown}
                                    style={addrInvalid ? { boxShadow: '0 0 0 2px #dc2626' } : undefined}
                                />
                                <button type="button" className="lp-btn" onClick={start}>
                                    {data.start_label ?? 'Get Started'}
                                </button>
                            </div>
                            {data.disclaimer && <p className="lp-hero-note">{data.disclaimer}</p>}
                        </>
                    )}
                </div>

                <div aria-hidden="true"></div>
            </div>

            {!page.submitted && (
                <div className="lp-modal" hidden={!modalOpen}>
                    <div className="lp-modal-overlay" onClick={closeModal}></div>
                    <div className="lp-modal-panel">
                        <button type="button" className="lp-modal-x" onClick={closeModal} aria-label="Close">&times;</button>
                        <h3>{confirmTitle}</h3>
                        <div className="lp-modal-map">
                            {modalOpen && (
                                <iframe
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                    title="Map"
                                    src={mapSrc}
                                />
                            )}
                        </div>
                        <div className="lp-modal-addr">{addr}</div>
                        {flow === 'buyer' ? (
                            <>
                                <label className="lp-q-label">Are you currently working with an agent? *</label>
                                <select
                                    className="lp-q-select"
                                    value={owner}
                                    onChange={(e) => { setOwner(e.target.value); setOwnerInvalid(false); }}
                                    style={ownerInvalid ? { borderColor: '#dc2626' } : undefined}
                                >
                                    <option value="">Select an option…</option>
                                    <option value="No, not yet">No, not yet</option>
                                    <option value="Yes">Yes</option>
                                    <option value="I'm just starting to look">I'm just starting to look</option>
                                </select>
                            </>
                        ) : (
                            <>
                                <label className="lp-q-label">Are you the owner of this home? *</label>
                                <select
                                    className="lp-q-select"
                                    value={owner}
                                    onChange={(e) => { setOwner(e.target.value); setOwnerInvalid(false); }}
                                    style={ownerInvalid ? { borderColor: '#dc2626' } : undefined}
                                >
                                    <option value="">Select an option…</option>
                                    <option value="Yes, I'm the owner">Yes, I'm the owner</option>
                                    <option value="No, I'm the agent">No, I'm the agent</option>
                                    <option value="I'm a potential buyer">I'm a potential buyer</option>
                                    <option value="Other">Other</option>
                                </select>
                            </>
                        )}
                        <button type="button" className="lp-btn" onClick={confirmNext}>Continue</button>
                        <div>
                            <button type="button" className="lp-link" onClick={editAddr}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                                Edit address
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
