import type { ContactDto } from './types';

/** Capitalize underscore_separated_strings → "Underscore Separated Strings". */
export function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Friendly relative time: "just now", "5m ago", "2h 14m ago". */
export function elapsedSince(iso: string | null): string {
    if (!iso) return '—';
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m ago`;
}

/** Replace {{token}} tokens in script bodies/intros with contact data. */
export function fillTokens(template: string | null, contact: ContactDto | null): string {
    if (!template) return '';
    if (!contact) return template;
    const tokens: Record<string, string> = {
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        full_name: `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim(),
        email: contact.email ?? '',
        phone: contact.phone ?? contact.mobile ?? '',
        type: contact.type ?? '',
        status: contact.status ?? '',
        lead_score: contact.lead_score != null ? String(contact.lead_score) : '',
    };
    return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key) => tokens[key.toLowerCase()] ?? '');
}

/** USD currency, no cents. */
export function formatCurrency(n: number): string {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

/** Short, friendly preview of a saved-search filter object. */
export function summarizeFilters(filters: Record<string, unknown> | null): string {
    if (!filters || typeof filters !== 'object') return 'No filters set';
    const parts: string[] = [];
    const f = filters as Record<string, any>;
    if (f.property_type) parts.push(String(f.property_type));
    if (f.beds) parts.push(`${f.beds}+ bd`);
    if (f.baths) parts.push(`${f.baths}+ ba`);
    if (f.price_min && f.price_max) parts.push(`$${f.price_min}-${f.price_max}`);
    else if (f.price_max) parts.push(`up to $${f.price_max}`);
    if (f.city) parts.push(String(f.city));
    return parts.length ? parts.join(' · ') : 'Saved search';
}

/**
 * Format an ISO date / datetime string to a short, readable label like
 * "May 25" or "May 25, 4:30 PM". Strips year when it matches today's year.
 */
export function formatDueDate(raw: string): string {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const sameYear = d.getFullYear() === new Date().getFullYear();
    const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) };
    const isDateOnly = raw.length <= 10
        || raw.endsWith('T00:00:00.000000Z')
        || raw.endsWith('T00:00:00Z')
        || raw.endsWith('T00:00:00');
    if (isDateOnly) {
        return d.toLocaleDateString(undefined, dateOpts);
    }
    return `${d.toLocaleDateString(undefined, dateOpts)}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}
