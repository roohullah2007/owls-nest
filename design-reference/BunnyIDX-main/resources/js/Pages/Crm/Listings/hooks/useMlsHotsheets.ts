import { router } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import type { Hotsheet, ListingsView } from '../types';
import { fromHotsheetFilters, toHotsheetFilters } from '../helpers/hotsheetMapping';
import type { MlsFilterState } from '../helpers/buildMlsSearchPayload';

/**
 * Setters the hook needs to apply a saved hotsheet back onto the page's
 * filter state. Defined as one bag so the call site doesn't grow to 22
 * positional args.
 */
export interface HotsheetFilterSetters {
    setMlsQuery: (v: string) => void;
    setMlsCity: (v: string) => void;
    setMlsCounty: (v: string) => void;
    setMlsNeighborhood: (v: string) => void;
    setMlsSubdivision: (v: string) => void;
    setMlsMinPrice: (v: string) => void;
    setMlsMaxPrice: (v: string) => void;
    setMlsMinBeds: (v: string) => void;
    setMlsMinBaths: (v: string) => void;
    setMlsMinSqft: (v: string) => void;
    setMlsMaxSqft: (v: string) => void;
    setMlsMinLotAcres: (v: string) => void;
    setMlsMaxLotAcres: (v: string) => void;
    setMlsMinYearBuilt: (v: string) => void;
    setMlsMaxYearBuilt: (v: string) => void;
    setMlsPropertyType: (v: string) => void;
    setMlsPropertySubtype: (v: string) => void;
    setMlsStatus: (v: string) => void;
    setMlsAgentId: (v: string) => void;
    setMlsOfficeId: (v: string) => void;
    setMlsRecentlyReducedDays: (v: string) => void;
    setMlsOpenHouseWithinDays: (v: string) => void;
    setMlsMaxHoaFee: (v: string) => void;
    setMlsPolygon: (v: [number, number][] | null) => void;
}

interface Args {
    /** Live read of every active MLS filter — feeds the build/save flow. */
    filterState: MlsFilterState;
    /** Write-side: applied to restore a saved hotsheet's filter values. */
    setters: HotsheetFilterSetters;
    /** Current map/grid/list view + setter — auto-switches to map for polygon hotsheets. */
    listView: ListingsView;
    setListView: (v: ListingsView) => void;
    /** Current tab + URL builder so the hook can route the user appropriately. */
    tab: 'mine' | 'office' | 'all';
    tabUrl: (t: 'mine' | 'office' | 'all') => string;
    /** Side effects the parent owns: clearing caches/results + kicking off a fetch. */
    onAfterApply: (nextPolygon: [number, number][] | null) => void;
}

/**
 * Owns the full hotsheet save / apply / cancel / delete lifecycle plus the
 * tiny prompt form state. The parent only has to wire the filter setters
 * once and provide a single `onAfterApply` to clear caches + refetch — every
 * other detail of round-tripping a saved search lives here.
 */
export function useMlsHotsheets({
    filterState, setters, listView, setListView, tab, tabUrl, onAfterApply,
}: Args) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [saving, setSaving] = useState(false);

    const build = useCallback(() => toHotsheetFilters(filterState), [filterState]);

    const apply = useCallback((h: Hotsheet) => {
        const { state, polygon } = fromHotsheetFilters(h.filters);
        setters.setMlsQuery(state.query);
        setters.setMlsCity(state.city);
        setters.setMlsCounty(state.county);
        setters.setMlsNeighborhood(state.neighborhood);
        setters.setMlsSubdivision(state.subdivision);
        setters.setMlsMinPrice(state.minPrice);
        setters.setMlsMaxPrice(state.maxPrice);
        setters.setMlsMinBeds(state.minBeds);
        setters.setMlsMinBaths(state.minBaths);
        setters.setMlsMinSqft(state.minSqft);
        setters.setMlsMaxSqft(state.maxSqft);
        setters.setMlsMinLotAcres(state.minLotAcres);
        setters.setMlsMaxLotAcres(state.maxLotAcres);
        setters.setMlsMinYearBuilt(state.minYearBuilt);
        setters.setMlsMaxYearBuilt(state.maxYearBuilt);
        setters.setMlsPropertyType(state.propertyType);
        setters.setMlsPropertySubtype(state.propertySubtype);
        setters.setMlsStatus(state.status);
        setters.setMlsAgentId(state.agentId);
        setters.setMlsOfficeId(state.officeId);
        setters.setMlsRecentlyReducedDays(state.recentlyReducedDays);
        setters.setMlsOpenHouseWithinDays(state.openHouseWithinDays);
        setters.setMlsMaxHoaFee(state.maxHoaFee);
        setters.setMlsPolygon(polygon);

        // Polygon hotsheets only make visual sense on the map — jump there.
        if (polygon && listView !== 'map') setListView('map');

        router.get(
            tabUrl(tab),
            { hotsheet: h.id },
            { preserveState: true, preserveScroll: true, only: ['activeHotsheetId'] },
        );

        // Defer to the next tick so the just-written state settles before
        // the caller's fetch sees it. The explicit polygon argument exists
        // for exactly this race.
        setTimeout(() => onAfterApply(polygon), 0);
    }, [setters, listView, setListView, tab, tabUrl, onAfterApply]);

    // `name` comes from HotsheetSavePrompt's local input state — keeping it
    // out of the hook means typing doesn't re-render the entire Listings page
    // on every keystroke (which was causing perceptible input lag).
    const save = useCallback((name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setSaving(true);
        router.post(
            route('crm.listings.hotsheets.store'),
            {
                name: trimmed,
                scope: 'personal',
                filters: build() as any,
            },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setShowPrompt(false);
                    setSaving(false);
                },
                onError: () => setSaving(false),
            },
        );
    }, [build]);

    const cancel = useCallback(() => {
        setShowPrompt(false);
    }, []);

    const startAdd = useCallback(() => {
        setShowPrompt(true);
        // Hotsheets are MLS-only — switch to the All tab so the user can
        // actually save / see one. No-op when already there.
        if (tab !== 'all') {
            router.get(tabUrl('all'), {}, { preserveScroll: true, preserveState: true });
        }
    }, [tab, tabUrl]);

    const remove = useCallback((id: number) => {
        if (!confirm('Delete this hotsheet?')) return;
        router.delete(route('crm.listings.hotsheets.destroy', id), {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    /**
     * Patch an existing hotsheet. Callers pick which fields to send:
     *  - `{ name }` to rename
     *  - `{ filters: 'current' }` to overwrite with the live filter state
     *  - both to rename + re-save in a single round-trip
     */
    const update = useCallback((id: number, payload: { name?: string; filters?: 'current' }) => {
        const body: Record<string, unknown> = {};
        if (payload.name !== undefined) body.name = payload.name.trim();
        if (payload.filters === 'current') body.filters = build();
        if (Object.keys(body).length === 0) return;
        router.patch(route('crm.listings.hotsheets.update', id), body as any, {
            preserveState: true,
            preserveScroll: true,
        });
    }, [build]);

    return {
        showPrompt, setShowPrompt,
        saving,
        build, apply, save, cancel, startAdd, remove, update,
    };
}
