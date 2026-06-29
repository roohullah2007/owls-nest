/*
 | "Villa Serena" — luxury editorial single-listing template (React).
 | Light, minimal, Open Sans, ~2px corners, thin neutral rules, a muted-blue
 | accent (--accent, set by the shell). Driven entirely by the data payload:
 | property snapshot + copy config + agent. No blocks.
 */
import { useState } from 'react';

export interface OpenHouse { date?: string; start?: string; end?: string; label?: string }

export interface Listing {
    source?: string;
    status?: string;
    price?: number | null;
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    lot?: string | null;
    year_built?: number | string | null;
    property_type?: string | null;
    mls_number?: string | null;
    address?: { street?: string; city?: string; state?: string; zip?: string; full?: string };
    photos?: string[];
    floorplans?: string[];
    open_houses?: (OpenHouse | string)[];
    description?: string | null;
    video_url?: string | null;
    compliance?: string | null;
}

export interface Config {
    header_brand?: string;
    brand_eyebrow?: string;
    eyebrow?: string;
    headline?: string;
    tagline?: string;
    cta_button?: string;
    agent_role?: string;
    office?: string;
    pricing_note?: string;
    video_url?: string;
    why_buy?: string;          // newline-separated bullets
    why_buy_title?: string;
    [k: string]: unknown;
}

export interface IdxPageData {
    template: string;
    accent: string;
    submitUrl: string;
    csrf: string;
    submitted: boolean;
    gate: boolean;
    page: { name: string; type: string; slug: string };
    agent: { name?: string; email?: string; phone?: string; photo?: string };
    config: Config;
    listing: Listing;
}

/* ---------- helpers ---------- */
const money = (n?: number | null) => (n != null && (n as any) !== '') ? '$' + Number(n).toLocaleString() : null;
const bathsLabel = (n?: number | null) => (n == null ? null : String(Number(n)).replace(/\.0$/, ''));
const tel = (p?: string) => (p || '').replace(/[^0-9+]/g, '');
const fullAddress = (L: Listing) => {
    const a = L.address || {};
    return a.full || [a.street, a.city, [a.state, a.zip].filter(Boolean).join(' ').trim()].filter(Boolean).join(', ');
};
function toEmbed(url?: string | null): string | null {
    if (!url) return null;
    let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{6,})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1];
    return null;
}

const EYE = 'text-[12px] font-semibold tracking-[0.22em] text-[var(--accent)]';
const H2 = 'm-0 text-[clamp(28px,3.4vw,42px)] font-light tracking-[-0.015em]';
const SHELL = 'mx-auto max-w-[1240px] px-5 sm:px-6 lg:px-10';
const INPUT = 'h-[46px] w-full rounded-sm border border-[#dcdad5] bg-white px-3.5 text-[14.5px] text-[#1c1c1e] outline-none focus:border-[var(--accent)]';

function HiddenFields({ data, message }: { data: IdxPageData; message: string }) {
    return (
        <>
            <input type="hidden" name="_token" value={data.csrf} />
            <input type="hidden" name="lead_type" value={data.page.type === 'seller' ? 'seller' : 'buyer'} />
            <input type="hidden" name="address" value={fullAddress(data.listing)} />
            <input type="hidden" name="message" value={message} />
        </>
    );
}

/* ---------- sections ---------- */
function Nav({ data, links }: { data: IdxPageData; links: [string, string][] }) {
    // Header shows the PROPERTY ADDRESS (no logo / username); compact on mobile.
    const L = data.listing;
    const addr = L.address || {};
    const line = addr.street || fullAddress(L) || data.page.name;
    const sub = [addr.city, addr.state].filter(Boolean).join(', ');
    return (
        <nav className="sticky top-0 z-50 flex h-[60px] items-center justify-between gap-3 border-b border-[#eceae6] bg-white/[0.9] px-5 backdrop-blur-md backdrop-saturate-150 sm:h-[72px] lg:px-10">
            <a href="#top" className="flex min-w-0 flex-col justify-center no-underline">
                <span className="truncate text-[13px] font-semibold tracking-[0.01em] text-[#1c1c1e] sm:text-[15px]">{line}</span>
                {sub && <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)] sm:text-[11px]">{sub}</span>}
            </a>
            <div className="hidden shrink-0 items-center gap-[30px] md:flex">
                {links.map(([href, label]) => (
                    <a key={href} href={href} className="text-[13.5px] font-medium tracking-[0.02em] text-[#56565a] no-underline transition-colors hover:text-[#1c1c1e]">{label}</a>
                ))}
                <a href="#contact" className="inline-flex h-10 items-center rounded-sm bg-[var(--accent)] px-[22px] text-[13.5px] font-semibold tracking-[0.02em] text-white no-underline">Schedule a Tour</a>
            </div>
            <a href="#contact" className="shrink-0 rounded-sm bg-[var(--accent)] px-4 py-2 text-[12.5px] font-semibold text-white no-underline md:hidden">Tour</a>
        </nav>
    );
}

function Hero({ data, onOpen }: { data: IdxPageData; onOpen: (i: number) => void }) {
    const { listing: L, config: c } = data;
    const addr = L.address || {};
    const street = addr.street || '';
    const cityLine = [addr.city, [addr.state, addr.zip].filter(Boolean).join(' ').trim()].filter(Boolean).join(', ');
    const photos = (L.photos || []).filter(Boolean);
    const price = money(L.price);
    const status = L.status || 'For Sale';
    const eyebrow = c.eyebrow || status.toUpperCase();
    const headline = c.headline || street || data.page.name;
    const submitted = data.submitted;
    const gate = data.gate && !submitted;

    const stats = ([
        L.beds != null ? [L.beds, 'BEDROOMS'] : null,
        L.baths != null ? [bathsLabel(L.baths), 'BATHROOMS'] : null,
        L.sqft ? [Number(L.sqft).toLocaleString(), 'SQ FT'] : null,
        L.lot ? [L.lot, 'LOT'] : null,
        L.year_built ? [L.year_built, 'YEAR BUILT'] : null,
    ].filter(Boolean) as [string | number, string][]);

    const message = L.address ? `Requested full details for ${fullAddress(L)}` : `Inquiry via ${data.page.name}`;

    return (
        <section className="pt-3 sm:pt-4">
            {/* HERO — full-width grid-based gallery at the top */}
            {photos.length > 0 ? (
                <div id="gallery" className="relative w-full px-2.5 sm:px-3 lg:px-4">
                    <div className="grid auto-rows-[120px] grid-cols-2 gap-2.5 sm:auto-rows-[160px] lg:auto-rows-[230px] lg:grid-cols-4">
                        {photos.slice(0, 5).map((p, i) => {
                            const locked = gate && i >= 1;
                            return (
                                <div key={i} className={`relative overflow-hidden rounded-sm bg-gray-100 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                                    <img src={p} alt={`Photo ${i + 1}`} onClick={() => !locked && onOpen(i)} className={`h-full w-full object-cover ${locked ? 'scale-105 blur-md' : 'cursor-pointer transition-transform duration-300 hover:scale-[1.02]'}`} />
                                </div>
                            );
                        })}
                    </div>
                    {gate ? (
                        <a href="#contact" className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-sm bg-black/60 px-4 py-2 text-[12.5px] font-semibold tracking-[0.02em] text-white no-underline backdrop-blur">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                            Unlock all {photos.length} photos
                        </a>
                    ) : photos.length > 1 ? (
                        <button type="button" onClick={() => onOpen(0)} className="absolute bottom-3 right-3 rounded-sm bg-black/60 px-4 py-2 text-[12.5px] font-semibold tracking-[0.02em] text-white backdrop-blur">View all {photos.length} photos</button>
                    ) : null}
                </div>
            ) : (
                <div id="gallery" className="flex h-[260px] w-full items-center justify-center bg-[#e9e8e4] text-[13px] text-[#9a9a95] sm:h-[360px]">No photos yet</div>
            )}

            <div className={SHELL}>
            {/* heading + description (left) · offer form (top-aligned with the heading) */}
            <div className="mt-9 grid gap-x-8 gap-y-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
                <div>
                    <div className={`mb-3.5 ${EYE}`}>{eyebrow}</div>
                    <h1 className="m-0 text-[clamp(30px,4.6vw,56px)] font-light leading-[1.05] tracking-[-0.02em]">{headline}</h1>
                    {cityLine && <div className="mt-3 text-[16px] tracking-[0.01em] text-[#6b6b70] sm:text-[17px]">{cityLine}</div>}
                    {c.tagline && <p className="m-0 mt-5 max-w-[600px] text-[17px] font-light leading-[1.7] text-[#3a3a3e] sm:text-[18px]">{c.tagline}</p>}
                    {L.description && (
                        <div className="relative mt-4">
                            <p className={`m-0 max-w-[600px] text-[15.5px] font-light leading-[1.75] text-[#56565a] ${gate ? 'max-h-[12rem] overflow-hidden' : ''}`}>{L.description}</p>
                            {gate && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />}
                        </div>
                    )}
                    {L.description && gate && <a href="#contact" className="mt-2 inline-block text-[13.5px] font-semibold tracking-[0.02em] text-[var(--accent)] no-underline">Read the full description →</a>}
                </div>

                {/* price + lead form */}
                <div className="rounded-sm border border-[#e6e4df] bg-white p-6 shadow-[0_20px_56px_-30px_rgba(0,0,0,0.30)] lg:sticky lg:top-[88px] lg:self-start">
                    <div className="flex items-start justify-between border-b border-[#eceae6] pb-5">
                        <div>
                            <div className="text-[11px] font-semibold tracking-[0.14em] text-[#9a9a95]">OFFERED AT</div>
                            <div className="mt-1 text-[26px] font-light tracking-[-0.01em]">{price || 'Inquire'}</div>
                        </div>
                        <div className="mt-[3px] inline-flex items-center gap-[7px] rounded-full bg-[#edf3ee] px-[11px] py-1.5">
                            <span className="h-[7px] w-[7px] rounded-full bg-[#1f8a5b]" />
                            <span className="text-[11.5px] font-semibold text-[#1f6e4c]">{status}</span>
                        </div>
                    </div>
                    {submitted ? (
                        <div className="px-1 pb-2 pt-[26px] text-center">
                            <div className="mx-auto mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[#edf3ee] text-[22px] text-[#1f8a5b]">✓</div>
                            <div className="text-[18px]">Request received</div>
                            <p className="mx-auto mt-2.5 max-w-[260px] text-[13.5px] leading-[1.55] text-[#6b6b70]">{data.agent.name || 'The listing team'} will contact you within one business day.</p>
                        </div>
                    ) : (
                        <form method="post" action={data.submitUrl}>
                            <HiddenFields data={data} message={message} />
                            <div className="my-5 text-[15px] font-semibold tracking-[0.01em]">Schedule a private showing</div>
                            <div className="flex flex-col gap-[11px]">
                                <input name="name" required placeholder="Full name" className={INPUT} />
                                <input name="email" type="email" required placeholder="Email address" className={INPUT} />
                                <input name="phone" type="tel" required placeholder="Phone number" className={INPUT} />
                            </div>
                            <label className="mt-3.5 flex items-start gap-2.5 text-[11px] leading-[1.5] text-[#9a9a95]">
                                <input type="checkbox" name="consent" value="1" required className="mt-0.5 accent-[var(--accent)]" />
                                <span>I agree to be contacted about this property. Consent is not a condition of purchase.</span>
                            </label>
                            <button type="submit" className="mt-3.5 h-[50px] w-full rounded-sm bg-[var(--accent)] text-[14.5px] font-semibold tracking-[0.02em] text-white">{c.cta_button || 'Schedule a Private Showing'}</button>
                            <p className="mt-3 text-center text-[11.5px] leading-[1.5] text-[#9a9a95]">No obligation. Your details are shared only with the listing team.</p>
                        </form>
                    )}
                </div>
            </div>

            {stats.length > 0 && (
                <div className="mt-12 grid border-y border-[#eceae6]" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0,1fr))` }}>
                    {stats.map(([val, label], i) => (
                        <div key={label} className={`border-r border-[#eceae6] px-3 py-6 last:border-r-0 sm:px-6 sm:py-[30px] ${i === 0 ? 'pl-0' : ''}`}>
                            <div className="text-[24px] font-light tracking-[-0.01em] sm:text-[34px]">{val}</div>
                            <div className="mt-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#9a9a95] sm:text-[12px] sm:tracking-[0.14em]">{label}</div>
                        </div>
                    ))}
                </div>
            )}
            </div>
        </section>
    );
}

function OpenHouse({ data }: { data: IdxPageData }) {
    const ohs = (data.listing.open_houses || []).filter(Boolean);
    if (!ohs.length) return null;
    const fmt = (o: any) => typeof o === 'string' ? o : [o.date, [o.start, o.end].filter(Boolean).join('–')].filter(Boolean).join(' · ');
    return (
        <section id="open-house" className={`${SHELL} pt-[90px]`}>
            <div className="rounded-sm border border-[#a7f3d0] bg-[#ecfdf5] p-6 sm:p-8">
                <div className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.18em] text-[#047857]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                    OPEN HOUSE
                </div>
                <div className="mt-4 flex flex-wrap gap-2.5">
                    {ohs.map((o, i) => (
                        <span key={i} className="inline-flex items-center rounded-sm border border-[#a7f3d0] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#065f46]">{fmt(o)}</span>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Details({ data }: { data: IdxPageData }) {
    const { listing: L, config: c } = data;
    const priceNum = L.price != null && (L.price as any) !== '' ? Number(L.price) : null;
    const sqftNum = L.sqft ? Number(L.sqft) : null;
    const ppsf = priceNum && sqftNum ? '$' + Math.round(priceNum / sqftNum).toLocaleString() : null;
    const rows: [string, string | number][] = [];
    const push = (k: string, v: any) => { if (v != null && v !== '') rows.push([k, v]); };
    push('List price', money(priceNum));
    push('Price / sq ft', ppsf);
    push('Bedrooms', L.beds);
    push('Bathrooms', bathsLabel(L.baths));
    push('Interior', sqftNum ? `${sqftNum.toLocaleString()} sq ft` : null);
    push('Lot', L.lot);
    push('Year built', L.year_built);
    push('Property type', L.property_type);
    push('MLS #', L.mls_number);
    if (!rows.length) return null;
    const status = L.status || 'For Sale';

    return (
        <section id="details" className={`${SHELL} pt-[90px]`}>
            <div className="grid items-start gap-12 lg:grid-cols-2">
                <div>
                    <div className={`mb-3.5 ${EYE}`}>PRICING &amp; AVAILABILITY</div>
                    <h2 className={`${H2} mb-7`}>{priceNum ? `Offered at ${money(priceNum)}` : 'Pricing & availability'}</h2>
                    <div className="inline-flex items-center gap-[9px] rounded-full bg-[#edf3ee] px-4 py-[9px]">
                        <span className="h-2 w-2 rounded-full bg-[#1f8a5b]" />
                        <span className="text-[13.5px] font-semibold tracking-[0.02em] text-[#1f6e4c]">{status} · Accepting private showings</span>
                    </div>
                    <p className="mt-[30px] max-w-[440px] text-[16px] font-light leading-[1.75] text-[#3a3a3e]">{c.pricing_note || 'Shown by appointment only. Qualified buyers and representing agents may request the full offering details below.'}</p>
                </div>
                <div className="rounded-sm border border-[#eceae6]">
                    {rows.map(([label, value], i) => (
                        <div key={label} className={`flex justify-between px-6 py-[18px] sm:px-7 sm:py-[22px] ${i < rows.length - 1 ? 'border-b border-[#eceae6]' : ''}`}>
                            <span className="text-[14.5px] text-[#56565a] sm:text-[15px]">{label}</span>
                            <span className="text-[14.5px] font-semibold sm:text-[15px]">{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function FloorPlans({ data, onOpenPlan }: { data: IdxPageData; onOpenPlan: (src: string) => void }) {
    const plans = (data.listing.floorplans || []).filter(Boolean);
    if (!plans.length) return null;
    return (
        <section id="plans" className={`${SHELL} pt-[90px]`}>
            <div className={`mb-3.5 ${EYE}`}>FLOOR PLANS</div>
            <h2 className={`${H2} mb-9`}>Designed around the view</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((src, i) => (
                    <button key={i} type="button" onClick={() => onOpenPlan(src)} className="overflow-hidden rounded-sm border border-[#e6e4df] bg-[#faf9f7]">
                        <img src={src} alt={`Floor plan ${i + 1}`} className="aspect-[4/3] w-full object-contain" />
                    </button>
                ))}
            </div>
        </section>
    );
}

function WhyBuy({ data }: { data: IdxPageData }) {
    const items = (data.config.why_buy || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!items.length) return null;
    return (
        <section id="why" className="mt-[90px] bg-[#faf9f7]">
            <div className={`${SHELL} py-[88px]`}>
                <div className={`mb-3.5 ${EYE}`}>WHY THIS LISTING</div>
                <h2 className={`${H2} mb-10 max-w-[620px]`}>{data.config.why_buy_title || 'Why buy this home'}</h2>
                <div className="grid gap-px overflow-hidden rounded-sm border border-[#eceae6] bg-[#eceae6] sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((it, i) => (
                        <div key={i} className="bg-white p-7">
                            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
                            </div>
                            <div className="text-[16px] font-light leading-[1.45] text-[#2a2a2e]">{it}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Video({ data }: { data: IdxPageData }) {
    const embed = toEmbed(data.listing.video_url || data.config.video_url);
    if (!embed) return null;
    return (
        <section id="video" className="mx-auto max-w-[1100px] px-5 pt-[90px] sm:px-6 lg:px-10">
            <div className="mb-9">
                <div className={`mb-3.5 ${EYE}`}>FILM</div>
                <h2 className={H2}>A cinematic tour</h2>
            </div>
            <div className="aspect-video overflow-hidden rounded-sm border border-[#e6e4df] bg-black">
                <iframe src={embed} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video tour" />
            </div>
        </section>
    );
}

function TourCta({ data }: { data: IdxPageData }) {
    if (data.submitted) return null;
    return (
        <section className="mt-[90px] bg-[#1c1c1e]">
            <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-10 px-5 py-[72px] sm:px-6 sm:py-[88px] lg:px-10">
                <div>
                    <h2 className="m-0 text-[clamp(26px,3.2vw,40px)] font-light tracking-[-0.015em] text-white">See it in person.</h2>
                    <p className="m-0 mt-3.5 max-w-[520px] text-[16px] font-light leading-[1.6] text-[#a9a9ad] sm:text-[17px]">Private showings are available daily. Schedule a walkthrough at your convenience.</p>
                </div>
                <a href="#contact" className="inline-flex h-[52px] items-center whitespace-nowrap rounded-sm bg-white px-8 text-[15px] font-semibold text-[#1c1c1e] no-underline">Schedule a Tour</a>
            </div>
        </section>
    );
}

function Contact({ data }: { data: IdxPageData }) {
    const { listing: L, config: c, agent } = data;
    const addr = L.address || {};
    const street = addr.street || '';
    const message = L.address ? `Requested a private showing of ${fullAddress(L)}` : `Inquiry via ${data.page.name}`;
    const lbl = 'mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a9a95]';
    return (
        <section id="contact" className={`${SHELL} py-[90px]`}>
            <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.15fr]">
                <div>
                    <div className={`mb-3.5 ${EYE}`}>YOUR AGENT</div>
                    <div className="mt-2 flex items-center gap-5">
                        {agent.photo ? (
                            <img src={agent.photo} alt={agent.name} className="h-[80px] w-[80px] flex-none rounded-full border border-[#e6e4df] object-cover sm:h-[88px] sm:w-[88px]" />
                        ) : (
                            <div className="flex h-[80px] w-[80px] flex-none items-center justify-center rounded-full border border-[#e6e4df] bg-[#f5f4f0] text-[24px] font-light text-[#9a9a95] sm:h-[88px] sm:w-[88px]">{(agent.name || 'A').charAt(0).toUpperCase()}</div>
                        )}
                        <div>
                            <div className="text-[20px] sm:text-[21px]">{agent.name || 'The Listing Team'}</div>
                            {c.agent_role && <div className="mt-[3px] text-[14px] text-[#6b6b70]">{c.agent_role}</div>}
                        </div>
                    </div>
                    <div className="mt-[30px] border-t border-[#eceae6]">
                        {agent.phone && <div className="flex justify-between border-b border-[#eceae6] py-4 text-[15px]"><span className="text-[#9a9a95]">Direct</span><a href={`tel:${tel(agent.phone)}`} className="font-medium no-underline">{agent.phone}</a></div>}
                        {agent.email && <div className="flex justify-between border-b border-[#eceae6] py-4 text-[15px]"><span className="text-[#9a9a95]">Email</span><a href={`mailto:${agent.email}`} className="font-medium no-underline">{agent.email}</a></div>}
                        {c.office && <div className="flex justify-between py-4 text-[15px]"><span className="text-[#9a9a95]">Office</span><span className="font-medium">{c.office}</span></div>}
                    </div>
                </div>
                <div>
                    {data.submitted ? (
                        <div className="rounded-sm border border-[#e6e4df] px-8 py-12 text-center sm:px-10 sm:py-14">
                            <div className="mx-auto mb-[22px] flex h-14 w-14 items-center justify-center rounded-full bg-[#edf3ee] text-[26px] text-[#1f8a5b]">✓</div>
                            <h3 className="m-0 text-[24px] font-light">Request received</h3>
                            <p className="mx-auto mt-3.5 max-w-[360px] text-[15.5px] leading-[1.6] text-[#6b6b70]">Thank you. {agent.name || 'The listing team'} will reach out within one business day to confirm your private showing{street ? ` of ${street}` : ''}.</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="m-0 mb-1.5 text-[clamp(24px,3vw,34px)] font-light tracking-[-0.015em]">Request a private showing</h3>
                            <p className="m-0 mb-[30px] text-[15.5px] text-[#6b6b70]">Tell us a little about your interest and preferred timing.</p>
                            <form method="post" action={data.submitUrl}>
                                <HiddenFields data={data} message={message} />
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="flex flex-col"><label className={lbl}>FULL NAME</label><input name="name" required placeholder="Jane Doe" className={INPUT} /></div>
                                    <div className="flex flex-col"><label className={lbl}>PHONE</label><input name="phone" type="tel" required placeholder="(310) 555-0100" className={INPUT} /></div>
                                    <div className="flex flex-col"><label className={lbl}>EMAIL</label><input name="email" type="email" required placeholder="jane@email.com" className={INPUT} /></div>
                                    <div className="flex flex-col"><label className={lbl}>PREFERRED TIMING</label><input name="timing" placeholder="Weekday afternoons" className={INPUT} /></div>
                                </div>
                                <label className="mt-3.5 flex items-start gap-2.5 text-[11.5px] leading-[1.5] text-[#9a9a95]">
                                    <input type="checkbox" name="consent" value="1" required className="mt-0.5 accent-[var(--accent)]" />
                                    <span>I agree to be contacted about this property. Consent is not a condition of purchase. Msg &amp; data rates may apply.</span>
                                </label>
                                <button type="submit" className="mt-6 h-[52px] w-full rounded-sm bg-[var(--accent)] text-[15px] font-semibold tracking-[0.02em] text-white">{c.cta_button || 'Submit Request'}</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

function Footer({ data }: { data: IdxPageData }) {
    const c = data.config;
    const brand = c.header_brand || data.agent.name || 'Private Listing';
    const full = fullAddress(data.listing);
    const compliance = data.listing.compliance || (c as any).compliance;
    return (
        <footer className="mt-[90px] border-t border-[#eceae6]">
            <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-5 py-10 sm:px-6 lg:px-10">
                <div className="flex flex-col">
                    {full && <span className="text-[15px] font-semibold tracking-[0.01em]">{full}</span>}
                    <span className="text-[13px] text-[#9a9a95]">{brand}</span>
                </div>
                <div className="max-w-[560px] text-[12.5px] text-[#9a9a95] sm:text-right">
                    {compliance || `© ${new Date().getFullYear()} ${brand}. All information deemed reliable but not guaranteed. Equal Housing Opportunity.`}
                </div>
            </div>
        </footer>
    );
}

function Lightbox({ photos, index, onClose, onNav }: { photos: string[]; index: number; onClose: () => void; onNav: (d: number) => void }) {
    return (
        <div onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,20,22,0.94)] p-6 sm:p-12">
            <div className="absolute left-6 top-[26px] font-mono text-[13px] tracking-[0.06em] text-[#cfcfcf] sm:left-10">{index + 1} / {photos.length}</div>
            <div className="absolute right-6 top-[22px] cursor-pointer text-[30px] font-thin leading-none text-white sm:right-9">×</div>
            <div onClick={(e) => { e.stopPropagation(); onNav(-1); }} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer select-none p-3 text-[40px] font-thin text-white sm:left-[34px]">‹</div>
            <div onClick={(e) => { e.stopPropagation(); onNav(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer select-none p-3 text-[40px] font-thin text-white sm:right-[34px]">›</div>
            <img src={photos[index]} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[80vh] max-w-[90vw] rounded-[3px] object-contain" />
        </div>
    );
}

/* ---------- root ---------- */
export default function Template({ data }: { data: IdxPageData }) {
    const [lb, setLb] = useState<number | null>(null);
    const [plan, setPlan] = useState<string | null>(null);
    const photos = (data.listing.photos || []).filter(Boolean);

    const links: [string, string][] = [];
    if (photos.length) links.push(['#gallery', 'Gallery']);
    if ((data.listing.floorplans || []).filter(Boolean).length) links.push(['#plans', 'Floor Plans']);
    links.push(['#details', 'Details']);
    if (toEmbed(data.listing.video_url || data.config.video_url)) links.push(['#video', 'Video']);
    links.push(['#contact', 'Contact']);

    const nav = (d: number) => setLb((p) => (p == null ? p : (p + d + photos.length) % photos.length));

    return (
        <div className="w-full overflow-x-hidden bg-white text-[#1c1c1e] antialiased">
            <span id="top" />
            <Nav data={data} links={links} />
            <Hero data={data} onOpen={setLb} />
            <OpenHouse data={data} />
            <FloorPlans data={data} onOpenPlan={setPlan} />
            <WhyBuy data={data} />
            <Details data={data} />
            <Video data={data} />
            <TourCta data={data} />
            <Contact data={data} />
            <Footer data={data} />
            {lb != null && photos[lb] && <Lightbox photos={photos} index={lb} onClose={() => setLb(null)} onNav={nav} />}
            {plan && (
                <div onClick={() => setPlan(null)} className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(20,20,22,0.94)] p-6 sm:p-12">
                    <div className="absolute right-6 top-[22px] cursor-pointer text-[30px] font-thin leading-none text-white sm:right-9">×</div>
                    <img src={plan} alt="Floor plan" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-[92vw] rounded-[3px] bg-white object-contain" />
                </div>
            )}
        </div>
    );
}
