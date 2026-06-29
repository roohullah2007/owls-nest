/*
 | Merge-field substitution for site-owner-authored content blocks
 | ({{address}}, {{price}}, …). Values come from the live listing + the site
 | agent, so one template reads localized on every listing page. Output stays
 | PLAIN TEXT — blocks render via text nodes (never raw HTML).
 */

import { PsListing } from '../types';
import { cityFrom } from './detail';

export interface PsDetailBlock {
    id: string;
    enabled?: boolean;
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    position?: 'after_gallery' | 'after_description' | 'before_comparables' | 'sidebar';
    /** Empty/absent = show for every status. */
    statuses?: Array<'active' | 'pending' | 'sold'>;
}

export interface PsGridCard {
    id: string;
    enabled?: boolean;
    title?: string;
    body?: string;
    cta_text?: string;
    cta_url?: string;
    /** Background photo URL (absolute — relative storage paths are resolved server-side). */
    image?: string;
    /** 1-based position inside the results grid. */
    slot?: number;
}

/** Broad status group for the block's "show when…" condition. */
export function statusGroup(statusLabel: string): 'active' | 'pending' | 'sold' {
    const l = statusLabel.toLowerCase();
    if (l.includes('sold') || l.includes('closed')) return 'sold';
    if (l.includes('pending') || l.includes('contract')) return 'pending';
    return 'active';
}

/** Substitute {{merge_fields}} in owner-authored copy. Unknown fields are kept verbatim. */
export function mergeFields(
    template: string,
    l: PsListing,
    agent?: { name?: string | null; phone?: string | null },
): string {
    const values: Record<string, string> = {
        address: l.address,
        city: cityFrom(l.address),
        price: l.price_formatted,
        beds: l.beds != null ? String(l.beds) : '',
        baths: l.baths ?? '',
        sqft: l.sqft ?? '',
        status: l.status_label,
        property_type: l.property_type ?? '',
        mls_number: l.mls_number,
        agent_name: agent?.name ?? '',
        agent_phone: agent?.phone ?? '',
    };

    return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (raw, key: string) => {
        const v = values[key.toLowerCase()];
        return v !== undefined && v !== '' ? v : raw;
    });
}

/** Blocks visible for this listing at this position, merge fields applied. */
export function blocksFor(
    blocks: PsDetailBlock[] | undefined,
    position: PsDetailBlock['position'],
    l: PsListing,
    agent?: { name?: string | null; phone?: string | null },
): Array<PsDetailBlock & { title: string; body: string }> {
    if (!blocks?.length) return [];
    const group = statusGroup(l.status_label);

    return blocks
        .filter((b) => b.enabled !== false
            && (b.position ?? 'after_description') === position
            && (!b.statuses?.length || b.statuses.includes(group)))
        .map((b) => ({
            ...b,
            title: mergeFields(b.title ?? '', l, agent),
            body: mergeFields(b.body ?? '', l, agent),
        }))
        .filter((b) => b.title || b.body);
}
