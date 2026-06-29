// Client-side filter + sort pipeline for Property Search. A faithful port of the
// original page's `__psApply` logic (design-reference/property-search.html): same
// fields, same matching rules, same sort orders, same deterministic "price
// changed" / virtual-tour flags so results match the static site exactly.
import type { SearchListing } from '@/types/search-listing';

export type SortKey =
    'recommended' | 'price-asc' | 'price-desc' | 'beds' | 'year';

export type StatusKey = 'all' | 'active' | 'sold' | 'changed';

export type TourKey = 'virtual' | 'floor' | 'open';

export interface FilterState {
    q: string;
    priceMin: number | null;
    priceMax: number | null;
    builtMin: number | null;
    builtMax: number | null;
    sqftMin: number | null;
    sqftMax: number | null;
    beds: number;
    baths: number;
    /** Selected MLS sub-type labels (e.g. "Single Family"). Empty === all. */
    types: string[];
    status: StatusKey;
    sort: SortKey;
    tours: TourKey[];
}

export const DEFAULT_FILTERS: FilterState = {
    q: '',
    priceMin: null,
    priceMax: null,
    builtMin: null,
    builtMax: null,
    sqftMin: null,
    sqftMax: null,
    beds: 0,
    baths: 0,
    types: [],
    status: 'all',
    sort: 'recommended',
    tours: [],
};

// Deterministic per-listing boolean used by the original for the synthetic
// "price changed" status and the virtual-tour / floor-plan / open-house chips.
function psFlag(listing: SearchListing, key: string): boolean {
    const z = (listing.address || '') + '|' + key;
    let h = 0;

    for (let i = 0; i < z.length; i++) {
        h = (h * 31 + z.charCodeAt(i)) >>> 0;
    }

    return h % 3 === 0;
}

export function filterListings(
    all: SearchListing[],
    st: FilterState,
): SearchListing[] {
    const f = all.filter((p) => {
        if (st.priceMin != null && p.priceNum < st.priceMin) {
            return false;
        }

        if (st.priceMax != null && p.priceNum > st.priceMax) {
            return false;
        }

        if (st.beds && p.beds < st.beds) {
            return false;
        }

        if (st.baths && p.baths < st.baths) {
            return false;
        }

        if (st.builtMin != null && p.year && p.year < st.builtMin) {
            return false;
        }

        if (st.builtMax != null && p.year && p.year > st.builtMax) {
            return false;
        }

        if (st.sqftMin != null && p.sqftNum && p.sqftNum < st.sqftMin) {
            return false;
        }

        if (st.sqftMax != null && p.sqftNum && p.sqftNum > st.sqftMax) {
            return false;
        }

        if (st.types.length) {
            const t = ((p.subType || p.propType || '') + '').toLowerCase();

            if (t) {
                const ok = st.types.some(
                    (x) => t.indexOf(String(x).toLowerCase()) >= 0,
                );

                if (!ok) {
                    return false;
                }
            }
        }

        if (st.q) {
            const hay = (
                (p.address || '') +
                ' ' +
                (p.town || '')
            ).toLowerCase();

            if (hay.indexOf(st.q.toLowerCase()) < 0) {
                return false;
            }
        }

        if (st.status !== 'all') {
            const sold = /sold/i.test(p.status || '');

            if (st.status === 'active' && sold) {
                return false;
            }

            if (st.status === 'sold' && !sold) {
                return false;
            }

            if (st.status === 'changed' && !psFlag(p, 'pr')) {
                return false;
            }
        }

        if (st.tours.length) {
            for (const tour of st.tours) {
                if (!psFlag(p, tour)) {
                    return false;
                }
            }
        }

        return true;
    });

    const sorted = f.slice();

    if (st.sort === 'price-asc') {
        sorted.sort((a, b) => a.priceNum - b.priceNum);
    } else if (st.sort === 'price-desc') {
        sorted.sort((a, b) => b.priceNum - a.priceNum);
    } else if (st.sort === 'beds') {
        sorted.sort((a, b) => b.beds - a.beds);
    } else if (st.sort === 'year') {
        sorted.sort((a, b) => b.year - a.year);
    }

    return sorted;
}

// Mirrors the original filter-count badge: each range/pill/type/query/status/
// tour that differs from the default contributes to the count.
export function countActiveFilters(st: FilterState): number {
    let c = 0;

    if (st.priceMin != null || st.priceMax != null) {
        c++;
    }

    if (st.builtMin != null || st.builtMax != null) {
        c++;
    }

    if (st.sqftMin != null || st.sqftMax != null) {
        c++;
    }

    if (st.beds) {
        c++;
    }

    if (st.baths) {
        c++;
    }

    c += st.types.length;

    if (st.q) {
        c++;
    }

    if (st.status !== 'all') {
        c++;
    }

    c += st.tours.length;

    return c;
}
