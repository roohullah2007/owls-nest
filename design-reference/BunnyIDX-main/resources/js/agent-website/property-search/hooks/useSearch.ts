import { useEffect, useMemo, useState } from 'react';
import { EMPTY_FILTERS, Filters, PsBounds, PsConfig, PsResponse, StatusMode, toQueryPayload } from '../types';
import { searchListings } from '../lib/api';

/**
 * All search state + the data fetch. Filter/sort/polygon changes reset
 * to page 1; the location text is debounced; in-flight requests are aborted
 * when superseded. Listing status lives inside Filters (statusMode).
 */
export function useSearch(cfg: PsConfig) {
    // ?q= / ?transaction= / ?min_price= / ?max_price= / ?beds= / ?baths= /
    // ?property_type= / ?property_subtypes= / ?status= seed the search — the
    // marketing pages' hero (incl. per-tab default filters) + community
    // quick-search land here.
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q')?.trim() || '';
    const numParam = (key: string) => {
        const v = urlParams.get(key)?.trim() || '';
        return /^\d+(\.\d+)?$/.test(v) ? v : '';
    };
    // Repeated (?k=a&k=b) or comma-joined (?k=a,b) values → string[].
    const listParam = (key: string) =>
        urlParams.getAll(key).flatMap((v) => v.split(',')).map((v) => v.trim()).filter(Boolean);
    const initialClass = urlParams.get('property_type')?.trim() || '';
    const initialSubtypes = listParam('property_subtypes');
    const statusParam = urlParams.get('status')?.trim();
    const initialStatus: StatusMode | undefined =
        statusParam === 'all' || statusParam === 'sold' || statusParam === 'active' ? statusParam : undefined;
    const [filters, setFilters] = useState<Filters>({
        ...EMPTY_FILTERS,
        ...(urlParams.get('transaction') === 'rent' ? { transaction: 'rent' as const } : {}),
        ...(initialStatus ? { statusMode: initialStatus } : {}),
        propClass: initialClass,
        types: initialSubtypes,
        minPrice: numParam('min_price'),
        maxPrice: numParam('max_price'),
        minBeds: numParam('beds'),
        minBaths: numParam('baths'),
    });
    const [searchText, setSearchText] = useState(initialQuery);
    const [debouncedText, setDebouncedText] = useState(initialQuery);
    const [sort, setSort] = useState('recommended');
    const [page, setPage] = useState(1);
    const [polygon, setPolygon] = useState<number[][] | null>(null);
    /** Map viewport box from "search as I move the map" — polygon wins over it. */
    const [bounds, setBounds] = useState<PsBounds | null>(null);
    const [data, setData] = useState<PsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = window.setTimeout(() => setDebouncedText(searchText), 450);
        return () => window.clearTimeout(t);
    }, [searchText]);

    const payload = useMemo(
        () => toQueryPayload(filters, debouncedText, sort, polygon, bounds),
        [filters, debouncedText, sort, polygon, bounds],
    );
    const payloadKey = JSON.stringify(payload);

    // Any filter change returns to the first page.
    useEffect(() => { setPage(1); }, [payloadKey]);

    useEffect(() => {
        let alive = true;
        const ctrl = new AbortController();
        setLoading(true);
        searchListings(cfg.endpoint, payload, page, ctrl.signal)
            .then((d) => { if (alive) { setData(d); setLoading(false); } })
            .catch(() => { if (alive) setLoading(false); });
        return () => { alive = false; ctrl.abort(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [payloadKey, page, cfg.endpoint]);

    /** Human-readable summary of the active query (stored on Save Search leads). */
    const filtersSummary = useMemo(
        () => Object.entries(payload)
            .filter(([k]) => k !== 'sort')
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : typeof v === 'object' ? 'map area' : v}`)
            .join('; '),
        [payloadKey], // eslint-disable-line react-hooks/exhaustive-deps
    );

    return {
        filters, setFilters,
        searchText, setSearchText,
        sort, setSort,
        page, setPage,
        polygon, setPolygon,
        bounds, setBounds,
        data, loading,
        filtersSummary,
    };
}
