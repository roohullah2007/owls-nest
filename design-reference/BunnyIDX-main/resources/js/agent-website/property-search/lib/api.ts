/* JSON client for the site-scoped search + lead endpoints. */

import { PsResponse } from '../types';

const csrf = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)?.content || '';

export async function searchListings(
    endpoint: string,
    filters: Record<string, unknown>,
    page: number,
    signal?: AbortSignal,
): Promise<PsResponse> {
    const res = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ filters, page }),
    });
    const body = await res.json();
    // Server error payloads (e.g. a 500) are JSON too but carry no listings —
    // reject them so the caller's catch path runs instead of the grid crashing.
    if (!Array.isArray(body?.listings)) {
        throw new Error(`search failed (${res.status})`);
    }
    return body as PsResponse;
}

/** Save-search lead capture → the site's contact endpoint (creates a CRM lead). */
export async function submitSaveSearch(
    endpoint: string,
    payload: { name: string; email: string; summary: string },
): Promise<boolean> {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            consent: true, // required checkbox on the form (ConsentCheck)
            interest: 'Property Alerts',
            message: `Saved search from the property search page.\nFilters — ${payload.summary || 'none (all listings)'}`,
        }),
    });
    return res.ok || res.redirected;
}

/* ── Visitor account (favorites / saved searches / activity tracking) ── */

const jsonHeaders = () => ({
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': csrf(),
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
});

/** Favorited listing keys ("mls_slug:listing_id") for the logged-in visitor. */
export async function fetchFavoriteIds(endpoint: string, signal?: AbortSignal): Promise<string[]> {
    const res = await fetch(endpoint, { headers: jsonHeaders(), signal });
    if (!res.ok) return [];
    const body = await res.json();
    return Array.isArray(body.ids) ? body.ids : [];
}

/** Toggle a favorite; resolves to the new state, or null on failure. */
export async function toggleFavorite(
    endpoint: string,
    payload: { mls_slug: string; listing_id: string; snapshot: Record<string, unknown> },
): Promise<boolean | null> {
    try {
        const res = await fetch(endpoint, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) return null;
        const body = await res.json();
        return typeof body.favorited === 'boolean' ? body.favorited : null;
    } catch {
        return null;
    }
}

/** Save the current search to the visitor's account. */
export async function saveAccountSearch(
    endpoint: string,
    payload: { name: string; filters: Record<string, unknown>; search_text: string },
): Promise<boolean> {
    try {
        const res = await fetch(endpoint, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) });
        return res.ok;
    } catch {
        return false;
    }
}

/** Fire-and-forget listing-view tracking (CRM timeline). */
export function trackListingView(endpoint: string, payload: { mls_slug: string; listing_id: string; address: string }): void {
    fetch(endpoint, { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(payload) }).catch(() => { /* non-critical */ });
}

/** Tour request → dedicated endpoint (CRM lead + calendar task + activity). */
export async function submitTourRequest(
    endpoint: string,
    payload: { name: string; email: string; phone: string; tour_type: 'in_person' | 'virtual'; date: string; time: string; message: string; property_address: string },
): Promise<boolean> {
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: jsonHeaders(),
            body: JSON.stringify({ ...payload, time: payload.time || null, consent: true }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/** "Request a showing" lead → the site's contact endpoint (creates a CRM lead). */
export async function submitShowingRequest(
    endpoint: string,
    payload: { name: string; email: string; phone: string; date: string; message: string; propertyAddress: string },
): Promise<boolean> {
    const note = [
        payload.date ? `Preferred date: ${payload.date}` : '',
        payload.message,
    ].filter(Boolean).join('\n');
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf(), 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            consent: true, // required checkbox on the form (ConsentCheck)
            interest: 'Showing Request',
            lead_type: 'buyer',
            property_address: payload.propertyAddress,
            message: note || `Showing request for ${payload.propertyAddress}`,
        }),
    });
    return res.ok || res.redirected;
}
