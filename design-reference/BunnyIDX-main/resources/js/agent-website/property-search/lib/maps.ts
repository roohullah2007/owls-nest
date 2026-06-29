/*
 | Google Maps glue for the search app. The SDK ships no bundled types here, so
 | `google` is `any` off `window`. Exposes the script loader and the custom
 | OverlayView price-pin class the map panel renders.
 */

export function loadGoogleMaps(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if ((window as any).google?.maps) return resolve();
        const s = document.createElement('script');
        // No `drawing` library — DrawingManager was removed from the Maps JS API
        // (v3.65). Polygon draw is implemented manually in MapPanel. `places`
        // powers the Nearby POI markers (schools/hospitals/transit/parks).
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=places`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Google Maps failed to load'));
        document.head.appendChild(s);
    });
}

/* ── Pin type icons ──────────────────────────────────────────────────────
   Small leading glyph on each price pin keyed off a broad property-type
   group. Keyword-matched on the DISPLAY label only (purely cosmetic) — the
   actual type filters always come from the MLS taxonomy, never this map. */

const PIN_SVG = (paths: string) =>
    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const PIN_TYPE_ICONS: Record<string, string> = {
    house: PIN_SVG('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
    condo: PIN_SVG('<path d="M5 21V4h10v17"/><path d="M15 9h4v12"/><path d="M3 21h18"/><path d="M9 8h.01M9 12h.01M9 16h.01"/>'),
    town: PIN_SVG('<path d="M2 21V10l5-4 5 4v11"/><path d="M12 21V10l5-4 5 4v11"/><path d="M2 21h20"/>'),
    land: PIN_SVG('<path d="M12 3 7 10h3l-4 6h12l-4-6h3z"/><path d="M12 16v5"/>'),
    multi: PIN_SVG('<rect x="3" y="9" width="18" height="12"/><path d="M3 9l9-6 9 6"/><path d="M9 21v-5h6v5"/>'),
    commercial: PIN_SVG('<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 13v.01M9 17v.01"/>'),
};

/**
 * Broad-group icon for a listing's property type/subtype label (default:
 * house). Keyword-matched against the MLS sub-type so MiamiRE values like
 * "Condominium", "Villa", "Office", "Unimproved Land", "Quadruplex" all map.
 */
export function pinTypeIcon(typeLabel: string | null): string {
    const t = (typeLabel || '').toLowerCase();
    if (/condo|apartment|co-?op|cooperative|flat/.test(t)) return PIN_TYPE_ICONS.condo;
    if (/town|villa|row ?house|attached/.test(t)) return PIN_TYPE_ICONS.town;
    if (/land|lot|acre|vacant|farm|ranch|agricultur/.test(t)) return PIN_TYPE_ICONS.land;
    if (/multi|duplex|triplex|quadruplex|fourplex|income/.test(t)) return PIN_TYPE_ICONS.multi;
    if (/office|retail|industrial|warehouse|commercial|mixed.?use|hotel|motel|business|special purpose/.test(t)) return PIN_TYPE_ICONS.commercial;
    return PIN_TYPE_ICONS.house;
}

/** Price-change direction for the pin's corner bubble. */
export type PinDelta = 'up' | 'down' | null;

const DELTA_ARROWS: Record<'up' | 'down', string> = {
    up: '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
    down: '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
};

/** Custom OverlayView price bubble — the green "$480k" pills. */
export interface PinCard { photo: string; price: string; facts: string; address: string }

export function makePinClass(g: any): any {
    const Base: any = g.maps.OverlayView;
    return class PricePin extends Base {
        position: any; label: string; href: string; typeIcon: string; delta: PinDelta; div: HTMLElement | null = null;
        sold: boolean; card: PinCard | null;
        constructor(position: any, label: string, href: string, typeIcon = '', delta: PinDelta = null, opts: { sold?: boolean; card?: PinCard | null } = {}) {
            super();
            this.position = position; this.label = label; this.href = href;
            this.typeIcon = typeIcon; this.delta = delta;
            this.sold = !!opts.sold; this.card = opts.card ?? null;
        }
        onAdd() {
            const d = document.createElement('div');
            d.className = 'ps-pin' + (this.sold ? ' is-sold' : '');
            if (this.typeIcon) {
                const ico = document.createElement('span');
                ico.className = 'ps-pin-ico';
                ico.innerHTML = this.typeIcon; // static inline SVG constants only
                d.appendChild(ico);
            }
            d.appendChild(document.createTextNode(this.label));
            if (this.delta) {
                const b = document.createElement('span');
                b.className = `ps-pin-delta ps-pin-delta--${this.delta}`;
                b.title = this.delta === 'up' ? 'Price increased' : 'Price reduced';
                b.innerHTML = DELTA_ARROWS[this.delta];
                d.appendChild(b);
            }
            // Hover preview card — plain DOM child shown via CSS :hover.
            if (this.card) {
                const c = document.createElement('div');
                c.className = 'ps-pin-card';
                const img = document.createElement('img');
                img.src = this.card.photo;
                img.alt = '';
                img.loading = 'lazy';
                c.appendChild(img);
                const body = document.createElement('div');
                body.className = 'ps-pin-card-body';
                const priceEl = document.createElement('div');
                priceEl.className = 'ps-pin-card-price';
                priceEl.textContent = this.card.price;
                body.appendChild(priceEl);
                if (this.card.facts) {
                    const facts = document.createElement('div');
                    facts.className = 'ps-pin-card-facts';
                    facts.textContent = this.card.facts;
                    body.appendChild(facts);
                }
                const addr = document.createElement('div');
                addr.className = 'ps-pin-card-addr';
                addr.textContent = this.card.address;
                body.appendChild(addr);
                c.appendChild(body);
                d.appendChild(c);
            }
            d.addEventListener('click', () => { window.location.href = this.href; });
            this.div = d;
            (this as any).getPanes().overlayMouseTarget.appendChild(d);
        }
        draw() {
            if (!this.div) return;
            const p = (this as any).getProjection().fromLatLngToDivPixel(this.position);
            if (p) { this.div.style.left = p.x + 'px'; this.div.style.top = p.y + 'px'; this.div.style.position = 'absolute'; }
        }
        onRemove() { this.div?.remove(); this.div = null; }
        setActive(on: boolean) { this.div?.classList.toggle('is-active', on); }
    };
}
