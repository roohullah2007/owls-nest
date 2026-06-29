import { useRef, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Contact } from '../types';

/**
 * Generic hover-to-reveal popover. The cell shows `triggerContent` inline; after
 * the mouse rests on it for >150ms, a panel appears anchored below with the items
 * passed in `panelContent` (or `panelEmpty` if there's nothing to show).
 *
 * Closing is debounced by 100ms so brief mouseleave→mouseenter (e.g. moving onto
 * the panel itself) doesn't flicker.
 */
export function HoverPreviewCell({
    triggerContent,
    href,
    panelTitle,
    panelEmpty,
    panelContent,
}: {
    triggerContent: React.ReactNode;
    href: string;
    panelTitle: string;
    panelEmpty?: React.ReactNode;
    panelContent: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function onEnter() {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        openTimer.current = setTimeout(() => setOpen(true), 150);
    }
    function onLeave() {
        if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
        closeTimer.current = setTimeout(() => setOpen(false), 100);
    }

    return (
        <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
            <Link href={href} className="block">{triggerContent}</Link>
            {open && (
                <div
                    className="absolute left-0 top-full mt-1 z-40 w-80 bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden"
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                >
                    <div className="px-3 py-2 border-b border-[#F3F4F6] flex items-center justify-between bg-[#F9FAFB]">
                        <p className="text-[11px] font-semibold text-[#5F656D] tracking-wider">{panelTitle}</p>
                        <Link href={href} className="text-[10px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors">View all →</Link>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {panelContent || panelEmpty}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Linked-listings count cell. Shows "N listings · $TOTAL" inline, with a hover panel
 * that lists the first ~5 listings with photo + address + bd/ba.
 */
export function ListingsHoverCell({ contact }: { contact: Contact }) {
    const n = contact.listings_count ?? 0;
    const previews = contact.listings || [];
    const href = route('crm.contacts.tab', [contact.uuid, 'properties']);
    const total = Number(contact.listings_total_value || 0);
    const totalLabel = total >= 1_000_000
        ? `$${(total / 1_000_000).toFixed(total % 1_000_000 === 0 ? 0 : 1)}M`
        : total >= 1_000
            ? `$${Math.round(total / 1_000)}K`
            : total > 0 ? `$${total.toLocaleString()}` : '';

    const trigger = n === 0 ? (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[#8B9096] hover:text-[#1693C9] transition-colors">
            <span className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-[#E4E7EB] bg-white">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 12 2.25 21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg>
            </span>
            <span>None yet</span>
        </span>
    ) : (
        <span className="flex items-center min-w-0 gap-2.5 hover:opacity-80 transition-opacity">
            <span className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-full border border-[#1693C9]/30 bg-[#EBF5FF] text-[#1693C9]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 12 2.25 21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg>
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[#111315] leading-tight">{n} {n === 1 ? 'listing' : 'listings'}</span>
                {totalLabel && <span className="block text-[11px] text-[#059669] font-medium leading-tight mt-0.5">{totalLabel} total</span>}
            </span>
        </span>
    );

    if (n === 0) {
        return <Link href={href} className="block">{trigger}</Link>;
    }

    return (
        <HoverPreviewCell
            triggerContent={trigger}
            href={href}
            panelTitle={`${n} Linked ${n === 1 ? 'Listing' : 'Listings'}${totalLabel ? ` · ${totalLabel}` : ''}`}
            panelContent={
                <ul className="divide-y divide-[#F3F4F6]">
                    {previews.map((l) => {
                        const subtitle = [l.city, l.state_province].filter(Boolean).join(', ');
                        const price = l.price ? `$${Number(l.price).toLocaleString()}` : null;
                        return (
                            <li key={l.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F9FAFB] transition-colors">
                                <span className="shrink-0 h-10 w-12 rounded-[4px] bg-[#F3F4F6] overflow-hidden">
                                    {l.photos && l.photos[0] ? (
                                        <img src={l.photos[0]} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="w-full h-full flex items-center justify-center">
                                            <svg className="h-4 w-4 text-[#C4C9D1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 12 2.25 21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg>
                                        </span>
                                    )}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium text-[#111315] truncate leading-tight">{l.address || l.title}</p>
                                    <p className="text-[10px] text-[#8B9096] truncate leading-tight">{subtitle || '—'}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#5F656D]">
                                        {price && <span className="text-[#059669] font-medium">{price}</span>}
                                        {l.bedrooms != null && <span>{l.bedrooms}bd</span>}
                                        {l.bathrooms != null && <span>{l.bathrooms}ba</span>}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                    {n > previews.length && (
                        <li className="px-3 py-2 text-[11px] text-[#8B9096] bg-[#F9FAFB]">
                            +{n - previews.length} more — click to see all
                        </li>
                    )}
                </ul>
            }
        />
    );
}

/**
 * Saved-searches count cell. Shows "N searches" + first search name; hover panel
 * lists each saved search with a one-line summary of its filters.
 */
export function SearchesHoverCell({ contact }: { contact: Contact }) {
    const n = contact.searches_count ?? 0;
    const previews = contact.searches || [];
    const href = route('crm.contacts.tab', [contact.uuid, 'searches']);

    const trigger = n === 0 ? (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[#8B9096] hover:text-[#1693C9] transition-colors">
            <span className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-[#E4E7EB] bg-white">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </span>
            <span>None yet</span>
        </span>
    ) : (
        <span className="flex items-center min-w-0 gap-2.5 hover:opacity-80 transition-opacity">
            <span className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-full border border-[#7C3AED]/30 bg-[#EDE9FE] text-[#7C3AED]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-[#111315] leading-tight">{n} {n === 1 ? 'search' : 'searches'}</span>
                <span className="block text-[11px] text-[#8B9096] leading-tight mt-0.5">{previews[0]?.name || ''}</span>
            </span>
        </span>
    );

    if (n === 0) {
        return <Link href={href} className="block">{trigger}</Link>;
    }

    function summarize(filters: Record<string, any> | null): string {
        if (!filters) return '';
        const parts: string[] = [];
        if (filters.property_type) parts.push(filters.property_type);
        if (filters.city) parts.push(filters.city);
        if (filters.min_beds) parts.push(`${filters.min_beds}+ bd`);
        if (filters.min_baths) parts.push(`${filters.min_baths}+ ba`);
        if (filters.min_price || filters.max_price) {
            const lo = filters.min_price ? `$${Number(filters.min_price).toLocaleString()}` : '';
            const hi = filters.max_price ? `$${Number(filters.max_price).toLocaleString()}` : '';
            parts.push(lo && hi ? `${lo}–${hi}` : (lo ? `${lo}+` : `Up to ${hi}`));
        }
        return parts.join(' · ');
    }

    return (
        <HoverPreviewCell
            triggerContent={trigger}
            href={href}
            panelTitle={`${n} Saved ${n === 1 ? 'Search' : 'Searches'}`}
            panelContent={
                <ul className="divide-y divide-[#F3F4F6]">
                    {previews.map((s) => (
                        <li key={s.id} className="px-3 py-2 hover:bg-[#F9FAFB] transition-colors">
                            <div className="flex items-start gap-2">
                                <svg className="h-3.5 w-3.5 text-[#7C3AED] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium text-[#111315] truncate leading-tight">{s.name}</p>
                                    {summarize(s.filters) && (
                                        <p className="text-[10px] text-[#8B9096] truncate leading-tight mt-0.5">{summarize(s.filters)}</p>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                    {n > previews.length && (
                        <li className="px-3 py-2 text-[11px] text-[#8B9096] bg-[#F9FAFB]">
                            +{n - previews.length} more — click to see all
                        </li>
                    )}
                </ul>
            }
        />
    );
}
