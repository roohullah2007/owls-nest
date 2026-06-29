import { router } from '@inertiajs/react';
import type { IdxSearch } from '../Index';

function formatPrice(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
}

function buildFilterSummary(filters: Record<string, any>): string {
    const parts: string[] = [];
    if (filters.city) parts.push(`City: ${filters.city}`);
    if (filters.state_province) parts.push(filters.state_province);
    if (filters.postal_code) parts.push(`Zip: ${filters.postal_code}`);
    if (filters.min_price || filters.max_price) {
        const min = filters.min_price ? formatPrice(filters.min_price) : '$0';
        const max = filters.max_price ? formatPrice(filters.max_price) : 'No max';
        parts.push(`${min} – ${max}`);
    }
    if (filters.min_beds) parts.push(`${filters.min_beds}+ beds`);
    if (filters.min_baths) parts.push(`${filters.min_baths}+ baths`);
    if (filters.min_sqft || filters.max_sqft) {
        const min = filters.min_sqft ? `${filters.min_sqft} sqft` : '0 sqft';
        const max = filters.max_sqft ? `${filters.max_sqft} sqft` : 'Any';
        parts.push(`${min} – ${max}`);
    }
    if (filters.property_type) parts.push(filters.property_type);
    if (filters.status) parts.push(filters.status);
    if (filters.query) parts.push(`"${filters.query}"`);
    return parts.join('  ·  ') || 'No filters applied';
}

interface Props {
    search: IdxSearch;
    onEdit: (search: IdxSearch) => void;
    onDuplicate: (search: IdxSearch) => void;
}

export default function SearchCard({ search, onEdit, onDuplicate }: Props) {
    function remove() {
        if (confirm('Delete this search? Widgets linked to it will be unlinked.')) {
            router.delete(route('crm.idx.searches.destroy', search.id), { preserveScroll: true });
        }
    }

    return (
        <div className="bg-white border-b border-[#E4E7EB] px-5 py-4 last:border-b-0 hover:bg-[#FAFBFC] transition-colors">
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                    <div className="h-9 w-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
                        <svg className="h-4 w-4 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#111315]">{search.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#F3F4F6] text-[#5F656D] border border-[#E4E7EB]">
                            {search.mls_slug}
                        </span>
                        {(search.widgets_count ?? 0) > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]">
                                {search.widgets_count} widget{search.widgets_count !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-[#8B9096] mt-1 leading-relaxed">{buildFilterSummary(search.filters)}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        onClick={() => onEdit(search)}
                        className="h-8 w-8 flex items-center justify-center text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6] rounded-lg transition-colors"
                        title="Edit"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onDuplicate(search)}
                        className="h-8 w-8 flex items-center justify-center text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6] rounded-lg transition-colors"
                        title="Duplicate"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                        </svg>
                    </button>
                    <button
                        onClick={remove}
                        className="h-8 w-8 flex items-center justify-center text-[#8B9096] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
