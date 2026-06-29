import { Contact } from './types';

export function formatCurrency(amount: string | number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(amount));
}

export function formatDate(d: string | null) {
    if (!d) return '';
    // Eloquent serializes `date` columns as full ISO strings (e.g. "2026-07-07T00:00:00.000000Z").
    // For bare YYYY-MM-DD values we still append T00:00:00 so they're parsed in local time, not UTC.
    const iso = d.includes('T') ? d : d + 'T00:00:00';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function contactNames(contacts?: Contact[]): string {
    if (!contacts || contacts.length === 0) return '';
    if (contacts.length === 1) return `${contacts[0].first_name} ${contacts[0].last_name}`;
    return `${contacts[0].first_name} ${contacts[0].last_name} +${contacts.length - 1}`;
}

export function getStaleDays(lastActivity: string | null): number {
    if (!lastActivity) return 0;
    const diffMs = Date.now() - new Date(lastActivity).getTime();
    return Math.floor(diffMs / 86400000);
}

export const typeLabels: Record<string, string> = {
    buy: 'Buyer',
    sell: 'Seller',
    lease: 'Lease',
    referral: 'Referral',
    other: 'Other',
};

/**
 * Builds the clip-path polygon that gives a stage column header its chevron shape.
 * - hasLeftNotch: cut a V into the left edge so it visually "receives" the prior stage's point
 * - hasRightPoint: extend a chevron point off the right edge so it flows into the next stage
 */
export function chevronClip(hasLeftNotch: boolean, hasRightPoint: boolean): string | undefined {
    if (hasLeftNotch && hasRightPoint) return 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%, 6px 50%)';
    if (hasLeftNotch) return 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 6px 50%)';
    if (hasRightPoint) return 'polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)';
    return undefined;
}

/**
 * Converts a `#RRGGBB` hex color to an `rgba(r, g, b, a)` string with the given alpha.
 * Used to tint stage headers with each stage's saved color at a consistent opacity.
 */
export function tint(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
