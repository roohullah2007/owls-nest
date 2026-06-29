import axios from 'axios';
import { useEffect, useState } from 'react';

export interface TaxonomyTerm {
    value: string;
    label: string;
    parent_value?: string;
}

export interface TaxonomyCustomField {
    key: string;
    label: string;
    type: string;
}

export interface MlsTaxonomy {
    propertyTypes: TaxonomyTerm[];
    propertySubtypes: TaxonomyTerm[];
    statuses: TaxonomyTerm[];
    customFields: TaxonomyCustomField[];
    cities: string[];
    counties: string[];
    /** Sub-city neighborhoods keyed by area heading (e.g. "City of Miami"). */
    neighborhoods: Record<string, string[]>;
    /** Subdivisions / developments the MLS indexes (flat list). */
    subdivisions: string[];
    /** ZIP codes the MLS indexes (exact PostalCode values). */
    zipCodes: string[];
    /** Filter keys the MLS actually honours — drives which filter inputs the UI shows. */
    supportedFilters: string[];
}

const EMPTY: MlsTaxonomy = {
    propertyTypes: [],
    propertySubtypes: [],
    statuses: [],
    customFields: [],
    cities: [],
    counties: [],
    neighborhoods: {},
    subdivisions: [],
    zipCodes: [],
    supportedFilters: [],
};

// Module-level cache keyed by sorted slug list. Taxonomy rarely changes within a
// session, so a single fetch per slug-set is enough.
const cache = new Map<string, Promise<MlsTaxonomy>>();

function cacheKey(slugs: string[]): string {
    return [...slugs].sort().join(',');
}

function fetchTaxonomy(slugs: string[]): Promise<MlsTaxonomy> {
    const key = cacheKey(slugs);
    const cached = cache.get(key);
    if (cached) return cached;

    const url = slugs.length === 0
        ? '/api/v1/mls/taxonomy'
        : `/api/v1/mls/taxonomy?slugs=${encodeURIComponent(slugs.join(','))}`;

    const promise = axios.get(url).then((res) => {
        const d = res.data || {};
        return {
            propertyTypes: (d.property_types || []) as TaxonomyTerm[],
            propertySubtypes: (d.property_subtypes || []) as TaxonomyTerm[],
            statuses: (d.statuses || []) as TaxonomyTerm[],
            customFields: (d.custom_fields || []) as TaxonomyCustomField[],
            cities: (d.cities || []) as string[],
            counties: (d.counties || []) as string[],
            neighborhoods: (d.neighborhoods || {}) as Record<string, string[]>,
            subdivisions: (d.subdivisions || []) as string[],
            zipCodes: (d.zip_codes || []) as string[],
            supportedFilters: (d.supported_filters || []) as string[],
        };
    }).catch(() => EMPTY);

    cache.set(key, promise);
    return promise;
}

/**
 * Fetch the merged taxonomy for the given dataset slugs from the canonical
 * `/api/v1/mls/taxonomy` endpoint. Replaces the hardcoded property-type /
 * status arrays the codebase used to ship in `utils.ts`.
 *
 * Pass an empty array to default to "every dataset the user has connected".
 */
export function useMlsTaxonomy(slugs: string[]): MlsTaxonomy & { loading: boolean } {
    const [state, setState] = useState<MlsTaxonomy>(EMPTY);
    const [loading, setLoading] = useState(true);

    const key = cacheKey(slugs);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchTaxonomy(slugs).then((data) => {
            if (cancelled) return;
            setState(data);
            setLoading(false);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return { ...state, loading };
}

/** Filter subtypes to a given parent property-type value. */
export function subtypesForParent(subtypes: TaxonomyTerm[], parent: string | null | undefined): TaxonomyTerm[] {
    if (!parent) return subtypes;
    return subtypes.filter((s) => !s.parent_value || s.parent_value === parent);
}
