import CrmLayout from '@/Layouts/CrmLayout';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import SearchInput from '@/Components/Crm/SearchInput';
import Avatar from '@/Components/Crm/Avatar';
import Select from '@/Components/Crm/Select';
import Combobox from '@/Components/Crm/Combobox';
import MlsNotice from '@/Components/Crm/MlsNotice';
import { useMlsTaxonomy } from '@/hooks/useMlsTaxonomy';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
    Hotsheet,
    HotsheetFilters,
    IdxConnection,
    Listing,
    ListingsTab,
    ListingsView,
    MlsListing,
    MlsSortKey,
    OfficeConfig,
    PaginatedListings,
    CustomFieldDef,
    SavedView,
    TeamInfo,
    Column,
} from './types';
import {
    builtInColumns,
    capitalize,
    formatDate,
    formatPrice,
    formatStatusLabel,
    getInitialColumns,
    getMlsSortValue,
    getStatusColors,
    getTypeColors,
    joinField,
    mlsTableColumns,
    MLS_MIN_PRICE_OPTIONS,
    MLS_MAX_PRICE_OPTIONS,
    stateName,
    STORAGE_KEY,
    typeToMlsPropertyType,
} from './utils';
import BulkActionBar from './components/BulkActionBar';
import HotsheetSavePrompt from './components/HotsheetSavePrompt';
import TintBadge from './components/TintBadge';
import Lightbox from './components/Lightbox';
import ListingDetailDrawer from './components/ListingDetailDrawer';
import ListingsSidebar from './components/ListingsSidebar';
import MlsDetailDrawer from './components/MlsDetailDrawer';
import MlsPagination from './components/MlsPagination';
import MlsExpandedDetails from './components/MlsExpandedDetails';
import MlsFiltersModal from './components/MlsFiltersModal';
import MlsGridView from './components/MlsGridView';
import MlsHalfMapView from './components/MlsHalfMapView';
import MlsCell from './components/MlsCell';
import ListingCell from './components/ListingCell';
import MlsActiveFiltersBar from './components/MlsActiveFiltersBar';
import SavedViewsBar from './components/SavedViewsBar';
import ColumnsSettingsDropdown from './components/ColumnsSettingsDropdown';
import MlsSearchBar from './components/MlsSearchBar';
import { useMlsHotsheets } from './hooks/useMlsHotsheets';
import { buildMlsSearchPayload, MlsFilterState } from './helpers/buildMlsSearchPayload';
import { mergeMlsAutocomplete } from './helpers/mergeMlsAutocomplete';
import NewListingModal from './components/NewListingModal';
import OfficeConfigModal from './components/OfficeConfigModal';
import SortIcon from './components/SortIcon';
import StatusBadge from './components/StatusBadge';
import ViewModeToggle from './components/ViewModeToggle';

// ─── Page Props ──────────────────────────────────────────────

interface NewListingOptions {
    contacts: { id: number; first_name: string; last_name: string }[];
    deals: { id: number; title: string }[];
    tags: { id: number; name: string; color: string }[];
    googleMapsApiKey: string | null;
}

interface Props {
    listings: PaginatedListings;
    filters: { search?: string; listing_type?: string; status?: string; sort?: string; direction?: string };
    tab: ListingsTab;
    listingTypes: string[];
    listingStatuses: string[];
    customFields: CustomFieldDef[];
    idxConnections: IdxConnection[];
    savedViews: SavedView[];
    hotsheets: Hotsheet[];
    team: TeamInfo | null;
    isTeamAdmin: boolean;
    officeConfig: OfficeConfig;
    activeHotsheetId: number | null;
    newListingOptions: NewListingOptions;
}

const TAB_LABELS: Record<ListingsTab, string> = {
    mine: 'My Listings',
    office: 'Office Listings',
    all: 'MLS Listings',
};

// ─── Main Component ─────────────────────────────────────────

export default function ListingsIndex({ listings, filters, tab, listingTypes, listingStatuses, customFields, idxConnections, savedViews, hotsheets, team, isTeamAdmin, officeConfig, activeHotsheetId, newListingOptions }: Props) {
    const { auth } = usePage<PageProps>().props;
    const hasConnections = idxConnections.length > 0;
    // mls_slug → user-facing MLS name (e.g. "miamire" → "Miami Realtors"),
    // threaded through to listing cards so each result shows which MLS it
    // came from when more than one connection is configured.
    const mlsSlugToName = useMemo(() => {
        const m: Record<string, string> = {};
        idxConnections.forEach((c) => { m[c.mls_slug] = c.display_name; });
        return m;
    }, [idxConnections]);
    const officeId = officeConfig.office_id;
    const officeNeedsConfig = tab === 'office' && !officeId;
    const showMlsSection = hasConnections && tab !== 'mine';
    // All Listings = MLS only. My Listings = CRM only. Office = MLS office,
    // plus manually-added team listings only when at least one exists.
    const showCrmSection = tab === 'mine' || (tab === 'office' && listings.total > 0);

    const allColumns: Column[] = [
        ...builtInColumns,
        ...customFields.map((cf) => ({
            key: `cf_${cf.key}`,
            label: cf.label,
            sortable: false,
            defaultVisible: true,
            width: 130,
            isCustom: true,
        })),
    ];

    // Type filter mapping from own listing types to MLS property types
    const typeToMlsPropertyType: Record<string, string> = {
        residential: 'Residential',
        condominium: 'Condominium',
        condo: 'Condominium',
        commercial: 'Commercial',
        land: 'Land',
        multi_family: 'Multi-Family',
        multifamily: 'Multi-Family',
        rental: 'Rental',
        townhouse: 'Townhouse',
    };
    const [search, setSearch] = useState(filters.search || '');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showNewListingModal, setShowNewListingModal] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getInitialColumns(allColumns));
    // (Columns dropdown owns its own open / active-tab state.)
    const [newType, setNewType] = useState('');
    const [newStatus, setNewStatus] = useState('');

    const newFieldForm = useForm({ label: '', type: 'text' as string });

    // MLS state. 0 = "All MLSes" (gateway fans out across every connected
    // MLS) — the default on the All Listings tab when the user has more than
    // one connection; picking a specific MLS in the dropdown scopes the search.
    const [mlsConnectionId, setMlsConnectionId] = useState<number>(
        tab === 'all' && idxConnections.length > 1 ? 0 : (idxConnections[0]?.id ?? 0),
    );
    // Slug of the MLS the user has selected in the dropdown — used to scope
    // taxonomy (counties / cities / property types / statuses) so switching
    // from Miami Realtors → Stellar MLS actually swaps the filter options
    // instead of showing a merged list of every connected MLS.
    const selectedMlsSlug = useMemo(
        () => idxConnections.find((c) => c.id === mlsConnectionId)?.mls_slug ?? null,
        [idxConnections, mlsConnectionId],
    );
    const mlsTaxonomy = useMlsTaxonomy(selectedMlsSlug ? [selectedMlsSlug] : []);
    const [mlsQuery, setMlsQuery] = useState('');
    const [mlsCity, setMlsCity] = useState('');
    const [mlsMinPrice, setMlsMinPrice] = useState('');
    const [mlsMaxPrice, setMlsMaxPrice] = useState('');
    const [mlsMinBeds, setMlsMinBeds] = useState('');
    const [mlsMinBaths, setMlsMinBaths] = useState('');
    const [mlsCities, setMlsCities] = useState<string[]>([]);
    const [mlsAddresses, setMlsAddresses] = useState<string[]>([]);
    const [mlsSubtypes, setMlsSubtypes] = useState<string[]>([]);
    // Reseed the city autocomplete whenever the selected MLS's taxonomy
    // changes. Replace (not merge) so cities from a previously-selected MLS
    // don't bleed into the new one's suggestions when switching connections.
    useEffect(() => {
        setMlsCities(mlsTaxonomy.cities);
    }, [mlsTaxonomy.cities]);
    const [mlsShowFiltersModal, setMlsShowFiltersModal] = useState(false);
    // (Search bar owns its own address/city focus flags internally.)
    const [mlsPropertyType, setMlsPropertyType] = useState('');
    const [mlsPropertySubtype, setMlsPropertySubtype] = useState('');
    const [mlsAgentId, setMlsAgentId] = useState('');
    const [mlsOfficeId, setMlsOfficeId] = useState('');
    const [mlsStatus, setMlsStatus] = useState('');
    const [mlsSubdivision, setMlsSubdivision] = useState('');
    const [mlsMinSqft, setMlsMinSqft] = useState('');
    const [mlsMaxSqft, setMlsMaxSqft] = useState('');
    const [mlsMinLotAcres, setMlsMinLotAcres] = useState('');
    const [mlsMaxLotAcres, setMlsMaxLotAcres] = useState('');
    const [mlsMinYearBuilt, setMlsMinYearBuilt] = useState('');
    const [mlsMaxYearBuilt, setMlsMaxYearBuilt] = useState('');
    // Polygon search — [lat, lng] pairs. Converted to GeoJSON [lng, lat]
    // ordering when shipped to the backend's MlsGeoQuery.
    const [mlsPolygon, setMlsPolygon] = useState<[number, number][] | null>(null);
    // Price Reduced within last N days. Empty string = off.
    const [mlsRecentlyReducedDays, setMlsRecentlyReducedDays] = useState('');
    // Has Open House within next N days. Empty string = off.
    const [mlsOpenHouseWithinDays, setMlsOpenHouseWithinDays] = useState('');
    // Cap HOA / monthly maintenance fee.
    const [mlsMaxHoaFee, setMlsMaxHoaFee] = useState('');
    // County + Neighborhood — fed by taxonomy from the MLS dataset.
    const [mlsCounty, setMlsCounty] = useState('');
    const [mlsNeighborhood, setMlsNeighborhood] = useState('');
    const [mlsResults, setMlsResults] = useState<MlsListing[]>([]);
    const [mlsTotal, setMlsTotal] = useState(0);
    const [mlsPage, setMlsPage] = useState(1);
    const [mlsSearching, setMlsSearching] = useState(false);
    const [mlsError, setMlsError] = useState('');
    const [mlsLoaded, setMlsLoaded] = useState(false);
    const [mlsExpandedId, setMlsExpandedId] = useState<string | null>(null);
    const [mlsSelectedIds, setMlsSelectedIds] = useState<string[]>([]);
    const [mlsSort, setMlsSort] = useState<MlsSortKey>('');
    const [mlsSortDir, setMlsSortDir] = useState<'asc' | 'desc'>('asc');

    // MLS cache keyed by property type to avoid re-fetching on tab switch
    const mlsCacheRef = useRef<Map<string, { results: MlsListing[]; total: number }>>(new Map());

    // Detail drawers (right-side panels)
    const [detailMlsId, setDetailMlsId] = useState<string | null>(null);
    const [detailListingId, setDetailListingId] = useState<number | null>(null);

    // Lightbox state
    const [lightboxPhotos, setLightboxPhotos] = useState<string[] | null>(null);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Hover detail popover
    const [mlsHoverId, setMlsHoverId] = useState<string | null>(null);
    const [mlsHoverPos, setMlsHoverPos] = useState<{ top: number; left: number } | null>(null);
    const mlsHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Saved views
    const [showSaveView, setShowSaveView] = useState(false);
    const [saveViewName, setSaveViewName] = useState('');
    const [savingView, setSavingView] = useState(false);

    // Hotsheets — always personal scope. Add flow: click sidebar button → switch to MLS Listings → show save prompt banner.
    // (hotsheet prompt state + handlers come from useMlsHotsheets below.)

    // Office ID modal (auto-opens when Office tab is active without a configured office id).
    const [officeIdInput, setOfficeIdInput] = useState(officeConfig.office_id || '');
    const [savingOfficeId, setSavingOfficeId] = useState(false);
    const [showOfficeConfigModal, setShowOfficeConfigModal] = useState(officeNeedsConfig);
    useEffect(() => { setOfficeIdInput(officeConfig.office_id || ''); }, [officeConfig.office_id]);
    useEffect(() => { if (officeNeedsConfig) setShowOfficeConfigModal(true); }, [officeNeedsConfig]);

    // View mode (All Listings tab)
    const [listView, setListView] = useState<ListingsView>('list');

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    // Lock body scroll when filters modal open
    useEffect(() => {
        if (mlsShowFiltersModal) { document.body.style.overflow = 'hidden'; }
        else { document.body.style.overflow = ''; }
        return () => { document.body.style.overflow = ''; };
    }, [mlsShowFiltersModal]);

    // Auto-load MLS listings on mount when connections exist
    useEffect(() => {
        if (hasConnections && !mlsLoaded) {
            fetchMls(1);
        }
    }, [mlsConnectionId]);

    // Refetch when switching into/out of map view since per_page differs (20 vs 100).
    // Skip the very first render so we don't double-fetch alongside the mount effect.
    const listViewRef = useRef(listView);
    useEffect(() => {
        if (listViewRef.current === listView) return;
        listViewRef.current = listView;
        if (hasConnections && mlsLoaded) {
            fetchMls(1);
        }
    }, [listView]);

    const activeColumns = allColumns.filter((c) => visibleColumns.includes(c.key));
    const checkboxWidth = 36;
    const totalWidth = checkboxWidth + activeColumns.reduce((sum, c) => sum + c.width, 0);
    // Sort MLS results client-side — memoized so the 1000-item sort doesn't
    // re-run on every parent render (e.g. on every keystroke in the save-as-
    // hotsheet name input).
    const sortedMlsResults = useMemo(() => {
        if (!mlsSort) return mlsResults;
        return [...mlsResults].sort((a, b) => {
            const va = getMlsSortValue(a, mlsSort);
            const vb = getMlsSortValue(b, mlsSort);
            const cmp = va < vb ? -1 : va > vb ? 1 : 0;
            return mlsSortDir === 'asc' ? cmp : -cmp;
        });
    }, [mlsResults, mlsSort, mlsSortDir]);

    // ─── My Listings helpers ───────────────────────────────────

    function getParams(overrides: Record<string, string | undefined> = {}) {
        return { tab, search: filters.search, listing_type: filters.listing_type, status: filters.status, sort: filters.sort, direction: filters.direction, ...overrides };
    }

    function tabUrl(t: ListingsTab) {
        return t === 'mine' ? route('crm.listings.index') : route('crm.listings.tab', t);
    }

    function switchTab(nextTab: ListingsTab) {
        if (nextTab === tab) return;
        router.get(tabUrl(nextTab), {}, { preserveScroll: true });
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('crm.listings.index'), getParams({ search }), { preserveState: true });
    }

    function handleTypeFilter(type: string) {
        router.get(route('crm.listings.index'), getParams({ listing_type: type || undefined }), { preserveState: true });
        // Also update MLS property type filter
        if (hasConnections) {
            const mapped = type ? (typeToMlsPropertyType[type.toLowerCase()] || '') : '';
            setMlsPropertyType(mapped);
            setMlsSelectedIds([]);
            // Check cache first
            const cacheKey = mapped || '__all__';
            const cached = mlsCacheRef.current.get(cacheKey);
            if (cached) {
                setMlsResults(cached.results);
                setMlsTotal(cached.total);
                setMlsLoaded(true);
            } else {
                setMlsLoaded(false);
                setTimeout(() => {
                    fetchMlsWithPropertyType(mapped);
                }, 0);
            }
        }
    }

    function handleStatusFilter(status: string) {
        router.get(route('crm.listings.index'), getParams({ status: status || undefined }), { preserveState: true });
    }

    function handleSort(column: string) {
        const direction = filters.sort === column && filters.direction === 'asc' ? 'desc' : 'asc';
        router.get(route('crm.listings.index'), getParams({ sort: column, direction }), { preserveState: true });
    }

    function toggleColumn(key: string) {
        setVisibleColumns((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    }

    function toggleSelect(id: number) {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    }

    function toggleAll() {
        setSelectedIds(selectedIds.length === listings.data.length ? [] : listings.data.map((l) => l.id));
    }

    function handleAddType(e: React.FormEvent) {
        e.preventDefault();
        const type = newType.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!type) return;
        router.post(route('crm.listings.listing-types.store'), { type }, { preserveState: true, onSuccess: () => setNewType('') });
    }

    function handleAddStatus(e: React.FormEvent) {
        e.preventDefault();
        const status = newStatus.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!status) return;
        router.post(route('crm.listings.listing-statuses.store'), { status }, { preserveState: true, onSuccess: () => setNewStatus('') });
    }

    function handleAddField(e: React.FormEvent) {
        e.preventDefault();
        if (!newFieldForm.data.label.trim()) return;
        const key = newFieldForm.data.label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!key) return;
        router.post(route('crm.listings.custom-fields.store'), { key, label: newFieldForm.data.label.trim(), type: newFieldForm.data.type }, {
            preserveState: true,
            onSuccess: () => { newFieldForm.reset(); setVisibleColumns((prev) => [...prev, `cf_${key}`]); },
        });
    }

    // ─── MLS helpers ──────────────────────────────────────────

    /**
     * Per-MLS failures arrive in `errors` alongside the surviving MLSes'
     * listings (the gateway never blanks a whole response for one bad feed).
     * Surface them as "Miami Realtors: MLS feed temporarily unavailable"
     * instead of letting an MLS silently vanish from the totals.
     */
    function formatPerMlsErrors(errors: unknown): string {
        if (!errors || typeof errors !== 'object') return '';
        return Object.entries(errors as Record<string, string>)
            .map(([slug, msg]) => `${mlsSlugToName[slug] || slug}: ${msg}`)
            .join(' · ');
    }

    async function fetchMls(page = 1, polygonOverride?: [number, number][] | null) {
        if (!hasConnections) return;
        // Polygon override lets callers (e.g. onPolygonChange) pass the
        // freshly-committed polygon without waiting for state to settle.
        const effectivePolygon = polygonOverride !== undefined ? polygonOverride : mlsPolygon;
        // Map view: bulk-load up to 1000 listings in parallel (5 × 200) so
        // the clusterer has enough points to spread across the country/state
        // view. Branches early — uses the lite Bridge projection to keep
        // payloads small.
        // Also bulk-load whenever a polygon is in play: polygon filters always
        // mean the user wants the full set of matches in the drawn area, not
        // the first 20. This also covers the polygon-hotsheet apply flow where
        // `listView` may still be stale (callbacks captured before the switch
        // to map view took effect).
        if ((listView === 'map' || !!effectivePolygon) && page === 1) {
            return fetchMlsMapBulk(effectivePolygon);
        }
        setMlsSearching(true);
        setMlsError('');
        setMlsPage(page);
        try {
            const payload = buildMlsSearchPayload(mlsFilterState, {
                connectionId: mlsConnectionId || null,
                page,
                polygonOverride: effectivePolygon,
                perPage: 20,
            });
            const { data } = await axios.post(route('crm.listings.search-mls'), payload);
            const listings: MlsListing[] = data.listings || [];
            setMlsResults(listings);
            setMlsTotal(data.total || 0);
            setMlsError(formatPerMlsErrors(data.errors));
            setMlsLoaded(true);
            mlsCacheRef.current.set(mlsPropertyType || '__all__', { results: listings, total: data.total || 0 });
            refreshAutocomplete(listings);
        } catch (err: any) {
            setMlsError(err.response?.data?.message || 'Failed to load MLS listings.');
            setMlsResults([]);
            setMlsTotal(0);
        } finally {
            setMlsSearching(false);
        }
    }

    /** Single point that pipes a result set through the autocomplete merger. */
    function refreshAutocomplete(listings: MlsListing[]) {
        const merged = mergeMlsAutocomplete(listings, { cities: mlsCities, addresses: mlsAddresses, subtypes: mlsSubtypes });
        setMlsCities(merged.cities);
        setMlsAddresses(merged.addresses);
        setMlsSubtypes(merged.subtypes);
    }

    // Fetch MLS with an explicit property type override (used when tab changes)
    async function fetchMlsWithPropertyType(propertyType: string, page = 1) {
        if (!hasConnections) return;
        setMlsSearching(true);
        setMlsError('');
        setMlsPage(page);
        try {
            const payload = buildMlsSearchPayload(mlsFilterState, {
                connectionId: mlsConnectionId || null,
                page,
                propertyTypeOverride: propertyType,
                perPage: 20,
            });
            const { data } = await axios.post(route('crm.listings.search-mls'), payload);
            const listings: MlsListing[] = data.listings || [];
            setMlsResults(listings);
            setMlsTotal(data.total || 0);
            setMlsError(formatPerMlsErrors(data.errors));
            setMlsLoaded(true);
            mlsCacheRef.current.set(propertyType || '__all__', { results: listings, total: data.total || 0 });
            refreshAutocomplete(listings);
        } catch (err: any) {
            setMlsError(err.response?.data?.message || 'Failed to load MLS listings.');
            setMlsResults([]);
            setMlsTotal(0);
        } finally {
            setMlsSearching(false);
        }
    }

    function handleMlsConnectionChange(id: number) {
        mlsCacheRef.current.clear();
        setMlsConnectionId(id);
        setMlsLoaded(false);
        setMlsResults([]);
        setMlsTotal(0);
        setMlsSelectedIds([]);
        // MLS-scoped filter values (city / county / neighborhood / subdivision
        // / property type / subtype / status) don't survive a connection swap:
        // a Miami city won't match anything in Stellar, etc. Wipe them so the
        // user starts clean against the new MLS's taxonomy.
        setMlsCity('');
        setMlsCounty('');
        setMlsNeighborhood('');
        setMlsSubdivision('');
        setMlsPropertyType('');
        setMlsPropertySubtype('');
        setMlsStatus('');
        setMlsAddresses([]);
        setMlsSubtypes([]);
    }

    // Stable callbacks for <MlsHalfMapView>. Inline arrows would invalidate
    // the map's internal memos on every parent render and force the marker
    // sync loop to iterate up to 1000 listings every keystroke.
    const handleMapSelectListing = useCallback((ml: MlsListing) => setDetailMlsId(ml.mls_id), []);
    const handleMapPolygonChange = useCallback((next: [number, number][] | null) => {
        setMlsPolygon(next);
        mlsCacheRef.current.clear();
        setMlsLoaded(false);
        setMlsSelectedIds([]);
        // fetchMls reads `listView` etc. — use the ref-style override so it
        // sees the just-committed polygon.
        fetchMls(1, next);
    }, []);
    const handleMapSearchArea = useCallback((bounds: { ne_lat: number; ne_lng: number; sw_lat: number; sw_lng: number }) => {
        mlsCacheRef.current.clear();
        setMlsLoaded(false);
        setMlsSelectedIds([]);
        fetchMlsMapBulk(mlsPolygon, bounds);
    }, [mlsPolygon]);
    // Memoized so passing it as a prop doesn't trigger a child re-render
    // every time the parent renders for unrelated reasons.
    const mapPagination = useMemo(() => {
        if (mlsResults.length >= mlsTotal) return null;
        return (
            <div className="text-[11px] text-[#5F656D] text-center">
                Showing <span className="font-medium text-[#111315]">{mlsResults.length.toLocaleString()}</span> of {mlsTotal.toLocaleString()} loaded. Pan or zoom — auto-refresh runs after 700ms.
            </div>
        );
    }, [mlsResults.length, mlsTotal]);

    // Bundle of every chip-strip setter — memoized so identity stays stable
    // across renders (the chip bar would otherwise re-render on every keystroke
    // in any other input).
    const activeFiltersSetters = useMemo(() => ({
        setMlsCity, setMlsCounty, setMlsNeighborhood, setMlsSubdivision,
        setMlsMinPrice, setMlsMaxPrice, setMlsMinBeds, setMlsMinBaths,
        setMlsMinSqft, setMlsMaxSqft, setMlsMinLotAcres, setMlsMaxLotAcres,
        setMlsMinYearBuilt, setMlsMaxYearBuilt,
        setMlsRecentlyReducedDays, setMlsOpenHouseWithinDays, setMlsMaxHoaFee,
        setMlsPropertyType, setMlsPropertySubtype, setMlsStatus,
        setMlsAgentId, setMlsOfficeId,
    }), []);
    const handleClearPolygon = useCallback(() => {
        setMlsPolygon(null);
        setMlsLoaded(false);
        fetchMls(1, null);
    }, []);

    // (Hotsheet lifecycle is wired after mlsFilterState below — see hotsheetCtl.)

    function applyMlsFilters() {
        mlsCacheRef.current.clear();
        setMlsLoaded(false);
        setMlsSelectedIds([]);
        fetchMls(1);
    }

    function clearMlsFilters() {
        mlsCacheRef.current.clear();
        setMlsQuery('');
        setMlsCity('');
        setMlsSubdivision('');
        setMlsMinPrice('');
        setMlsMaxPrice('');
        setMlsMinBeds('');
        setMlsMinBaths('');
        setMlsMinSqft('');
        setMlsMaxSqft('');
        setMlsMinLotAcres('');
        setMlsMaxLotAcres('');
        setMlsMinYearBuilt('');
        setMlsMaxYearBuilt('');
        setMlsPropertyType('');
        setMlsPropertySubtype('');
        setMlsStatus('');
        setMlsAgentId('');
        setMlsOfficeId('');
        setMlsRecentlyReducedDays('');
        setMlsOpenHouseWithinDays('');
        setMlsMaxHoaFee('');
        setMlsCounty('');
        setMlsNeighborhood('');
        setMlsLoaded(false);
        setMlsSelectedIds([]);
        setTimeout(() => fetchMls(1), 0);
    }

    function clearModalFilters() {
        setMlsCounty('');
        setMlsNeighborhood('');
        setMlsSubdivision('');
        setMlsMinBeds('');
        setMlsMinBaths('');
        setMlsMinSqft('');
        setMlsMaxSqft('');
        setMlsMinLotAcres('');
        setMlsMaxLotAcres('');
        setMlsMinYearBuilt('');
        setMlsMaxYearBuilt('');
        setMlsPropertyType('');
        setMlsPropertySubtype('');
        setMlsStatus('');
        setMlsAgentId('');
        setMlsOfficeId('');
        setMlsRecentlyReducedDays('');
        setMlsOpenHouseWithinDays('');
        setMlsMaxHoaFee('');
    }

    function applyModalFilters() {
        setMlsShowFiltersModal(false);
        setMlsLoaded(false);
        setMlsSelectedIds([]);
        fetchMls(1);
    }

    const advancedFilterCount = [
        mlsCounty, mlsNeighborhood, mlsSubdivision,
        mlsMinSqft, mlsMaxSqft, mlsMinLotAcres, mlsMaxLotAcres,
        mlsMinYearBuilt, mlsMaxYearBuilt, mlsPropertyType, mlsPropertySubtype,
        mlsStatus, mlsAgentId, mlsOfficeId,
        mlsRecentlyReducedDays, mlsOpenHouseWithinDays, mlsMaxHoaFee,
    ].filter(Boolean).length;

    function handleMlsSort(key: MlsSortKey) {
        if (!key) return;
        if (mlsSort === key) {
            setMlsSortDir((d) => d === 'asc' ? 'desc' : 'asc');
        } else {
            setMlsSort(key);
            setMlsSortDir('asc');
        }
    }

    function toggleMlsSelect(id: string) {
        setMlsSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    }

    function toggleMlsAll() {
        setMlsSelectedIds(mlsSelectedIds.length === mlsResults.length ? [] : mlsResults.map((l) => l.mls_id));
    }

    function openLightbox(photos: string[], index: number) {
        setLightboxPhotos(photos);
        setLightboxIndex(index);
    }

    function handleMlsRowMouseEnter(mlsId: string, e: React.MouseEvent<HTMLTableRowElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        mlsHoverTimerRef.current = setTimeout(() => {
            setMlsHoverId(mlsId);
            setMlsHoverPos({ top: rect.bottom + 4, left: Math.max(16, rect.left) });
        }, 1500);
    }

    function handleMlsRowMouseLeave() {
        if (mlsHoverTimerRef.current) clearTimeout(mlsHoverTimerRef.current);
        mlsHoverTimerRef.current = null;
        setMlsHoverId(null);
        setMlsHoverPos(null);
    }

    const mlsHoveredListing = mlsHoverId ? mlsResults.find((ml) => ml.mls_id === mlsHoverId) : null;

    // One typed object that mirrors every active MLS filter — feeds the chip
    // strip, the search-payload builder, and anything else that needs to read
    // the whole filter surface at once. Memoized so consumers get a stable
    // reference unless a filter actually changed.
    const mlsFilterState = useMemo<MlsFilterState>(() => ({
        query: mlsQuery,
        city: mlsCity,
        county: mlsCounty,
        neighborhood: mlsNeighborhood,
        subdivision: mlsSubdivision,
        minPrice: mlsMinPrice,
        maxPrice: mlsMaxPrice,
        minBeds: mlsMinBeds,
        minBaths: mlsMinBaths,
        minSqft: mlsMinSqft,
        maxSqft: mlsMaxSqft,
        minLotAcres: mlsMinLotAcres,
        maxLotAcres: mlsMaxLotAcres,
        minYearBuilt: mlsMinYearBuilt,
        maxYearBuilt: mlsMaxYearBuilt,
        propertyType: mlsPropertyType,
        propertySubtype: mlsPropertySubtype,
        status: mlsStatus,
        agentId: mlsAgentId,
        officeId: mlsOfficeId,
        recentlyReducedDays: mlsRecentlyReducedDays,
        openHouseWithinDays: mlsOpenHouseWithinDays,
        maxHoaFee: mlsMaxHoaFee,
        polygon: mlsPolygon,
    }), [
        mlsQuery, mlsCity, mlsCounty, mlsNeighborhood, mlsSubdivision,
        mlsMinPrice, mlsMaxPrice, mlsMinBeds, mlsMinBaths,
        mlsMinSqft, mlsMaxSqft, mlsMinLotAcres, mlsMaxLotAcres,
        mlsMinYearBuilt, mlsMaxYearBuilt,
        mlsPropertyType, mlsPropertySubtype, mlsStatus,
        mlsAgentId, mlsOfficeId,
        mlsRecentlyReducedDays, mlsOpenHouseWithinDays, mlsMaxHoaFee,
        mlsPolygon,
    ]);

    // ─── Hotsheets — full lifecycle wiring ─────────────────────────
    // Memoized setter bag (stable identity, like activeFiltersSetters).
    const hotsheetSetters = useMemo(() => ({
        setMlsQuery, setMlsCity, setMlsCounty, setMlsNeighborhood, setMlsSubdivision,
        setMlsMinPrice, setMlsMaxPrice, setMlsMinBeds, setMlsMinBaths,
        setMlsMinSqft, setMlsMaxSqft, setMlsMinLotAcres, setMlsMaxLotAcres,
        setMlsMinYearBuilt, setMlsMaxYearBuilt,
        setMlsPropertyType, setMlsPropertySubtype, setMlsStatus,
        setMlsAgentId, setMlsOfficeId,
        setMlsRecentlyReducedDays, setMlsOpenHouseWithinDays, setMlsMaxHoaFee,
        setMlsPolygon,
    }), []);
    const onHotsheetAfterApply = useCallback((nextPolygon: [number, number][] | null) => {
        mlsCacheRef.current.clear();
        setMlsLoaded(false);
        setMlsSelectedIds([]);
        fetchMls(1, nextPolygon);
    }, []);
    // Renamed to avoid shadowing the `hotsheets` Inertia prop above.
    const hotsheetCtl = useMlsHotsheets({
        filterState: mlsFilterState,
        setters: hotsheetSetters,
        listView,
        setListView,
        tab,
        tabUrl,
        onAfterApply: onHotsheetAfterApply,
    });
    const handleSavePrompt = useCallback(() => hotsheetCtl.setShowPrompt(true), [hotsheetCtl]);

    // Auto-apply the hotsheet referenced in the URL (`?hotsheet=<id>`) on first
    // mount so a direct link / page refresh actually restores the saved filters
    // + polygon, instead of just highlighting the sidebar item. Guarded by a
    // ref so route updates within apply() can't loop.
    const autoAppliedHotsheetRef = useRef<number | null>(null);
    useEffect(() => {
        if (!activeHotsheetId || autoAppliedHotsheetRef.current === activeHotsheetId) return;
        const h = hotsheets.find((x) => x.id === activeHotsheetId);
        if (!h) return;
        autoAppliedHotsheetRef.current = activeHotsheetId;
        hotsheetCtl.apply(h);
    }, [activeHotsheetId, hotsheets, hotsheetCtl]);

    const mlsHasFilters = !!(
        mlsQuery || mlsCity || mlsSubdivision ||
        mlsMinPrice || mlsMaxPrice ||
        mlsMinBeds || mlsMinBaths ||
        mlsMinSqft || mlsMaxSqft ||
        mlsMinLotAcres || mlsMaxLotAcres ||
        mlsMinYearBuilt || mlsMaxYearBuilt ||
        mlsPropertyType || mlsPropertySubtype ||
        mlsStatus || mlsAgentId || mlsOfficeId ||
        mlsRecentlyReducedDays || mlsOpenHouseWithinDays || mlsMaxHoaFee ||
        mlsCounty || mlsNeighborhood ||
        mlsPolygon
    );

    // (Search bar derives its own filtered address / city suggestions internally.)

    // ─── Saved views ───────────────────────────────────────────

    const hasActiveFilters = !!(filters.search || filters.listing_type || filters.status);

    function handleSaveView(e: React.FormEvent) {
        e.preventDefault();
        if (!saveViewName.trim()) return;
        setSavingView(true);
        router.post(route('crm.listings.saved-views.store'), {
            name: saveViewName.trim(),
            filters: { search: filters.search || '', listing_type: filters.listing_type || '', status: filters.status || '', sort: filters.sort || '', direction: filters.direction || '' },
        }, {
            preserveState: true,
            onSuccess: () => { setSaveViewName(''); setShowSaveView(false); setSavingView(false); },
            onError: () => setSavingView(false),
        });
    }

    function applyView(view: SavedView) {
        router.get(tabUrl(tab), { ...view.filters }, { preserveState: true });
    }

    function deleteView(id: number) {
        router.delete(route('crm.listings.saved-views.destroy', id), { preserveState: true });
    }

    // ─── Hotsheets ─────────────────────────────────────────────
    // (Lifecycle lives in useMlsHotsheets — see hooks/useMlsHotsheets.ts.)

    /**
     * Map-view bulk loader: 5 parallel pages × 200 listings = up to 1000 pins
     * distributed across the visible map area. Uses Bridge's `lite` SELECT to
     * keep payloads small. Deduped by mls_id (page-boundary safety) and
     * sorted-by-modified-desc upstream order is preserved.
     */
    async function fetchMlsMapBulk(
        effectivePolygon?: [number, number][] | null,
        boundsOverride?: { ne_lat: number; ne_lng: number; sw_lat: number; sw_lng: number } | null,
    ) {
        if (!hasConnections) return;
        setMlsSearching(true);
        setMlsError('');
        setMlsPage(1);

        try {
            // Fan out: pages 1..5. Each page failure caught individually so one
            // bad page doesn't drop the whole dataset.
            const requests = [1, 2, 3, 4, 5].map((p) => {
                const payload = buildMlsSearchPayload(mlsFilterState, {
                    connectionId: mlsConnectionId || null,
                    page: p,
                    polygonOverride: effectivePolygon,
                    boundsOverride,
                    perPage: 200,
                    projection: 'lite',
                });
                return axios.post(route('crm.listings.search-mls'), payload)
                    .then((r) => r.data)
                    .catch(() => ({ listings: [], total: 0 }));
            });
            const responses = await Promise.all(requests);
            const total = responses[0]?.total ?? 0;
            const seen = new Set<string>();
            const deduped: MlsListing[] = [];
            for (const r of responses) {
                for (const l of (r?.listings || []) as MlsListing[]) {
                    if (!l?.mls_id || seen.has(l.mls_id)) continue;
                    seen.add(l.mls_id);
                    deduped.push(l);
                }
                // No point fetching further pages if the prior one came back short.
                if ((r?.listings?.length ?? 0) < 200) break;
            }
            setMlsResults(deduped);
            setMlsTotal(total || deduped.length);
            setMlsLoaded(true);
            refreshAutocomplete(deduped);
        } catch (err: any) {
            setMlsError(err.response?.data?.message || 'Failed to load MLS listings.');
            setMlsResults([]);
            setMlsTotal(0);
        } finally {
            setMlsSearching(false);
        }
    }


    function saveOfficeId(e?: React.FormEvent) {
        e?.preventDefault();
        setSavingOfficeId(true);
        router.patch(route('crm.listings.office-id.update'), { office_id: officeIdInput.trim() || null }, {
            preserveState: false,
            preserveScroll: true,
            onSuccess: () => { setSavingOfficeId(false); setShowOfficeConfigModal(false); },
            onError: () => setSavingOfficeId(false),
        });
    }

    // When the tab changes to 'office', auto-apply officeConfig.office_id to MLS filters
    useEffect(() => {
        if (tab === 'office' && officeId && mlsOfficeId !== officeId) {
            setMlsOfficeId(officeId);
            mlsCacheRef.current.clear();
            setMlsLoaded(false);
            setTimeout(() => fetchMls(1), 0);
        }
        if (tab !== 'office' && mlsOfficeId && officeId === mlsOfficeId) {
            setMlsOfficeId('');
            mlsCacheRef.current.clear();
            setMlsLoaded(false);
            setTimeout(() => fetchMls(1), 0);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, officeId]);

    // ─── Type filter dropdown ────────────────────────────────────

    return (
        <CrmLayout>
            <Head title="Properties" />

            {/* Lightbox */}
            {lightboxPhotos && (
                <Lightbox photos={lightboxPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxPhotos(null)} />
            )}

            {/* Detail drawers (right-side panels) */}
            <MlsDetailDrawer
                listing={detailMlsId ? mlsResults.find((m) => m.mls_id === detailMlsId) ?? null : null}
                onClose={() => setDetailMlsId(null)}
                onOpenLightbox={openLightbox}
            />
            <NewListingModal
                isOpen={detailListingId !== null}
                onClose={() => setDetailListingId(null)}
                listingTypes={listingTypes}
                listingStatuses={listingStatuses}
                contacts={newListingOptions.contacts}
                deals={newListingOptions.deals}
                tags={newListingOptions.tags}
                googleMapsApiKey={newListingOptions.googleMapsApiKey}
                listing={detailListingId ? listings.data.find((l) => l.id === detailListingId) ?? null : null}
            />

            {/* Advanced Filters Modal */}
            <MlsFiltersModal
                open={mlsShowFiltersModal}
                onClose={() => setMlsShowFiltersModal(false)}
                propertyTypes={mlsTaxonomy.propertyTypes}
                propertySubtypes={mlsTaxonomy.propertySubtypes}
                statuses={mlsTaxonomy.statuses}
                cities={mlsTaxonomy.cities}
                counties={mlsTaxonomy.counties}
                neighborhoods={mlsTaxonomy.neighborhoods}
                subdivisions={mlsTaxonomy.subdivisions}
                supportedFilters={mlsTaxonomy.supportedFilters}
                keyword={mlsQuery}
                city={mlsCity}
                county={mlsCounty}
                neighborhood={mlsNeighborhood}
                subdivision={mlsSubdivision}
                minBeds={mlsMinBeds}
                minBaths={mlsMinBaths}
                minPrice={mlsMinPrice}
                maxPrice={mlsMaxPrice}
                minSqft={mlsMinSqft}
                maxSqft={mlsMaxSqft}
                minLotAcres={mlsMinLotAcres}
                maxLotAcres={mlsMaxLotAcres}
                minYearBuilt={mlsMinYearBuilt}
                maxYearBuilt={mlsMaxYearBuilt}
                propertyType={mlsPropertyType}
                propertySubtype={mlsPropertySubtype}
                status={mlsStatus}
                agentId={mlsAgentId}
                officeId={mlsOfficeId}
                availableSubtypes={mlsSubtypes}
                setKeyword={setMlsQuery}
                setCity={setMlsCity}
                setCounty={setMlsCounty}
                setNeighborhood={setMlsNeighborhood}
                setSubdivision={setMlsSubdivision}
                setMinBeds={setMlsMinBeds}
                setMinBaths={setMlsMinBaths}
                setMinPrice={setMlsMinPrice}
                setMaxPrice={setMlsMaxPrice}
                setMinSqft={setMlsMinSqft}
                setMaxSqft={setMlsMaxSqft}
                setMinLotAcres={setMlsMinLotAcres}
                setMaxLotAcres={setMlsMaxLotAcres}
                setMinYearBuilt={setMlsMinYearBuilt}
                setMaxYearBuilt={setMlsMaxYearBuilt}
                setPropertyType={setMlsPropertyType}
                setPropertySubtype={setMlsPropertySubtype}
                setStatus={setMlsStatus}
                setAgentId={setMlsAgentId}
                setOfficeId={setMlsOfficeId}
                recentlyReducedDays={mlsRecentlyReducedDays}
                setRecentlyReducedDays={setMlsRecentlyReducedDays}
                openHouseWithinDays={mlsOpenHouseWithinDays}
                setOpenHouseWithinDays={setMlsOpenHouseWithinDays}
                maxHoaFee={mlsMaxHoaFee}
                setMaxHoaFee={setMlsMaxHoaFee}
                onClear={clearModalFilters}
                onApply={applyModalFilters}
            />


            {/* ─── Content Area with Left Sidebar ─── */}
            <div className="flex items-stretch">
                {/* Left sidebar */}
                <ListingsSidebar
                    tab={tab}
                    onSwitchTab={switchTab}
                    hotsheets={hotsheets}
                    activeHotsheetId={activeHotsheetId}
                    onApplyHotsheet={hotsheetCtl.apply}
                    onDeleteHotsheet={hotsheetCtl.remove}
                    onAddHotsheetClick={hotsheetCtl.startAdd}
                    onUpdateHotsheet={hotsheetCtl.update}
                />

                {/* Main content */}
                <div className="flex-1 min-w-0 overflow-auto p-4 sm:p-5 md:p-6">
                <div className="mx-auto max-w-[1350px] flex flex-col gap-4">

                {/* Mobile tab switcher */}
                <div className="md:hidden flex gap-1 bg-white border border-[#E4E7EB] rounded-[4px] p-1">
                    {(['mine', 'office', 'all'] as ListingsTab[]).map((t) => (
                        <button key={t} onClick={() => switchTab(t)} className={`flex-1 py-1.5 text-[11px] font-medium rounded-[4px] transition-colors ${tab === t ? 'bg-[#1693C9] text-white' : 'text-[#5F656D]'}`}>
                            {TAB_LABELS[t]}
                        </button>
                    ))}
                </div>

                {/* No MLS integrated yet — point at Settings → MLS Connections */}
                {!hasConnections && (
                    <MlsNotice description="Connect an MLS to search live listings, browse your office inventory, and pull market data straight into your CRM." />
                )}

                {/* Page header */}
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-lg font-normal text-[#111315]">{TAB_LABELS[tab]}</h1>

                    <SavedViewsBar
                        savedViews={savedViews}
                        currentFilters={filters}
                        hasActiveFilters={hasActiveFilters}
                        showSaveForm={showSaveView}
                        saveName={saveViewName}
                        saving={savingView}
                        onApply={applyView}
                        onDelete={deleteView}
                        onStartSave={() => setShowSaveView(true)}
                        onChangeSaveName={setSaveViewName}
                        onCancelSave={() => { setShowSaveView(false); setSaveViewName(''); }}
                        onSubmitSave={handleSaveView}
                    />

                    <div className="flex-1" />

                    {/* CRM-only filters (Search + Type + Status) — hidden on MLS Listings tab to avoid duplication with MLS search bar */}
                    {tab !== 'all' && (
                        <>
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                onSubmit={handleSearch}
                                placeholder="Search properties..."
                            />

                            <Select
                                className="hidden md:inline-block"
                                triggerClassName="text-xs text-[#5F656D]"
                                value={filters.listing_type || ''}
                                onChange={handleTypeFilter}
                                options={[
                                    { value: '', label: 'All Types' },
                                    ...listingTypes.map((t) => ({ value: t, label: capitalize(t) })),
                                ]}
                            />

                            <Select
                                className="hidden md:inline-block"
                                triggerClassName="text-xs text-[#5F656D]"
                                value={filters.status || ''}
                                onChange={handleStatusFilter}
                                options={[
                                    { value: '', label: 'All Statuses' },
                                    ...listingStatuses.map((s) => ({ value: s, label: capitalize(s) })),
                                ]}
                            />
                        </>
                    )}


                    <ColumnsSettingsDropdown
                        allColumns={allColumns}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                        listingTypes={listingTypes}
                        listingStatuses={listingStatuses}
                        customFields={customFields}
                        newType={newType}
                        onChangeNewType={setNewType}
                        onAddType={handleAddType}
                        newStatus={newStatus}
                        onChangeNewStatus={setNewStatus}
                        onAddStatus={handleAddStatus}
                        newFieldLabel={newFieldForm.data.label}
                        onChangeNewFieldLabel={(v) => newFieldForm.setData('label', v)}
                        newFieldType={newFieldForm.data.type}
                        onChangeNewFieldType={(v) => newFieldForm.setData('type', v)}
                        onAddField={handleAddField}
                    />

                    {/* View toggle (MLS tabs — All + Office) */}
                    {(tab === 'all' || tab === 'office') && <ViewModeToggle value={listView} onChange={setListView} />}

                    {/* Add property button */}
                    <PrimaryButton onClick={() => setShowNewListingModal(true)} label="New Property" />
                </div>

                {/* ─── Own Listings Section (hidden on All tab; that tab is MLS-only) ─── */}
                {showCrmSection && (
                <div className="mb-6">
                    <div className="mb-2">
                        <span className="text-[11px] text-[#8B9096]">{listings.total} {listings.total === 1 ? 'listing' : 'listings'} added manually</span>
                    </div>
                    {/* Mobile card view */}
                    <div className="md:hidden space-y-2">
                        {listings.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 bg-white border border-[#E4E7EB] rounded-xl">
                                <svg className="h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" /></svg>
                                <p className="mt-3 text-sm text-[#8B9096]">{tab === 'office' ? 'No team listings yet' : 'No own listings found'}</p>
                                {tab !== 'office' && <Link href={route('crm.listings.create')} className="mt-1 text-xs font-medium text-[#111315] underline">Add your first property</Link>}
                            </div>
                        ) : (
                            listings.data.map((listing) => {
                                const isSelected = selectedIds.includes(listing.id);
                                return (
                                    <div key={listing.id} className={`bg-white border border-[#E4E7EB] rounded-lg p-3 transition-colors ${isSelected ? 'bg-[#E6F0FF] border-[#1693C9]/30' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(listing.id)} className="h-[18px] w-[18px] rounded-md mt-1 border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <TintBadge label="My Listing" color="#059669" />
                                                </div>
                                                <button onClick={() => setDetailListingId(listing.id)} className="text-[13px] font-medium text-[#1693C9] hover:underline truncate block text-left">{listing.title}</button>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {listing.listing_type && <TintBadge label={capitalize(listing.listing_type)} color={getTypeColors(listing.listing_type).bg} />}
                                                    {listing.status && <TintBadge label={formatStatusLabel(listing.status)} color={getStatusColors(listing.status).bg} />}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#5F656D]">
                                                    {listing.price && <span className="font-medium text-[#5F656D]">{formatPrice(listing.price)}</span>}
                                                    {(listing.bedrooms || listing.bathrooms) && <span>{listing.bedrooms ?? '—'} bd / {listing.bathrooms ?? '—'} ba</span>}
                                                    {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-[#5F656D]">
                                                    {(listing.city || listing.state_province) && <span className="truncate">{[listing.city, listing.state_province].filter(Boolean).join(', ')}</span>}
                                                    {listing.mls_number && <span className="shrink-0">MLS# {listing.mls_number}</span>}
                                                </div>
                                                {listing.tags.length > 0 && (
                                                    <div className="flex gap-1 mt-1.5 overflow-hidden">
                                                        {listing.tags.map((tag) => (
                                                            <span key={tag.id} className="inline-flex shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded" style={{ backgroundColor: tag.color + '15', color: tag.color }}>{tag.name}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {listing.listed_at && <span className="text-[10px] text-[#8B9096] shrink-0 mt-0.5">{formatDate(listing.listed_at)}</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {listings.last_page > 1 && (
                            <div className="flex items-center justify-between bg-white border border-[#E4E7EB] rounded-lg px-3 py-2">
                                <span className="text-[10px] text-[#5F656D] font-medium">Page {listings.current_page} / {listings.last_page}</span>
                                <div className="flex gap-1">
                                    {listings.links.filter(l => l.label.includes('Previous') || l.label.includes('Next')).map((link, i) => (
                                        <Link key={i} href={link.url || '#'} className={`px-3 py-1 text-xs font-medium rounded transition-colors ${link.url ? 'text-[#111315] bg-[#F3F4F6] hover:bg-[#E4E7EB]' : 'text-[#D1D5DB] cursor-not-allowed'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                                    ))}
                                </div>
                                <span className="text-[10px] text-[#5F656D] font-medium">{listings.total} total</span>
                            </div>
                        )}
                    </div>

                    {/* Desktop table view */}
                    <div className="hidden md:block bg-white border border-[#E4E7EB] shadow-sm overflow-hidden overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-[#E4E7EB]">
                                    <th className="px-2 border-r border-[#E4E7EB] w-9" style={{ height: '44px' }}>
                                        <input type="checkbox" checked={listings.data.length > 0 && selectedIds.length === listings.data.length} onChange={toggleAll} className="h-[18px] w-[18px] rounded-md border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                                    </th>
                                    {activeColumns.map((col, i) => (
                                        <th key={col.key} className={`px-3 text-left whitespace-nowrap ${i < activeColumns.length - 1 ? 'border-r border-[#E4E7EB]' : ''}`} style={{ height: '44px' }}>
                                            {col.sortable ? (
                                                <button
                                                    onClick={() => handleSort(col.key)}
                                                    className="flex items-center whitespace-nowrap transition-colors"
                                                    style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}
                                                >
                                                    {col.label}
                                                    <SortIcon column={col.key} currentSort={filters.sort} currentDirection={filters.direction} />
                                                </button>
                                            ) : (
                                                <span className="whitespace-nowrap" style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}>{col.label}</span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {listings.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeColumns.length + 1}>
                                            <div className="flex flex-col items-center justify-center py-12">
                                                <svg className="h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" /></svg>
                                                <p className="mt-3 text-sm text-[#8B9096]">{tab === 'office' ? 'No team listings yet' : 'No own listings found'}</p>
                                                {tab !== 'office' && <Link href={route('crm.listings.create')} className="mt-1 text-xs font-medium text-[#111315] underline">Add your first property</Link>}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    listings.data.map((listing) => {
                                        const isSelected = selectedIds.includes(listing.id);
                                        return (
                                            <tr key={listing.id} className={`bg-white border-b border-[#E4E7EB] transition-colors ${isSelected ? 'bg-[#F7F8FB]' : ''}`}>
                                                <td className="px-2 border-r border-[#E4E7EB] text-center w-9" style={{ height: '44px' }}>
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(listing.id)} className="h-[18px] w-[18px] rounded-md border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                                                </td>
                                                {activeColumns.map((col, i) => (
                                                    <td key={col.key} className={`px-3 whitespace-nowrap ${col.key === 'photo' ? 'py-1' : ''} ${i < activeColumns.length - 1 ? 'border-r border-[#E4E7EB]' : ''}`} style={{ height: '44px' }}>
                                                        <ListingCell listing={listing} col={col} authUserId={auth.user.id} onOpenDetail={setDetailListingId} />
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        {listings.last_page > 1 && (
                            <div className="flex items-stretch h-10 bg-[#F9FAFB] border-t border-[#E4E7EB]">
                                <div className="flex items-center px-4 border-r border-[#E4E7EB] shrink-0">
                                    <span className="text-[10px] text-[#5F656D] font-medium">Page {listings.current_page} / {listings.last_page}</span>
                                </div>
                                {listings.links.map((link, i) => (
                                    <Link key={i} href={link.url || '#'} className={`flex items-center justify-center min-w-[32px] px-2 text-xs font-medium border-r border-[#E4E7EB] transition-colors ${link.active ? 'bg-[#111315] text-white' : link.url ? 'text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315]' : 'text-[#D1D5DB] cursor-not-allowed'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                                ))}
                                <div className="flex-1" />
                                <div className="flex items-center px-4 border-l border-[#E4E7EB] shrink-0">
                                    <span className="text-[10px] text-[#5F656D] font-medium">{listings.total} records</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* ─── Office ID configure modal (auto-opens on Office tab when unset) ─── */}
                <OfficeConfigModal
                    isOpen={showOfficeConfigModal}
                    onClose={() => setShowOfficeConfigModal(false)}
                    config={officeConfig}
                    inputValue={officeIdInput}
                    onInputChange={setOfficeIdInput}
                    onSubmit={saveOfficeId}
                    saving={savingOfficeId}
                />

                {/* ─── Hotsheet save prompt (when "Add a Sheet" was clicked) ─── */}
                {hotsheetCtl.showPrompt && (tab === 'all' || tab === 'office') && (
                    <HotsheetSavePrompt
                        onSave={hotsheetCtl.save}
                        onCancel={hotsheetCtl.cancel}
                        saving={hotsheetCtl.saving}
                        hasFilters={mlsHasFilters}
                    />
                )}

                {/* ─── MLS Listings Section ─── */}
                {showMlsSection && (
                <div>
                    <div className="flex items-baseline justify-between mb-2">
                        <span className="text-[13px] font-medium text-[#111315]">
                            {mlsLoaded ? `${mlsTotal.toLocaleString()} ${mlsTotal === 1 ? 'listing' : 'listings'}` : 'Loading listings…'}
                        </span>
                    </div>
                    <MlsSearchBar
                        idxConnections={idxConnections}
                        connectionId={mlsConnectionId}
                        onChangeConnection={handleMlsConnectionChange}
                        query={mlsQuery}
                        setQuery={setMlsQuery}
                        city={mlsCity}
                        setCity={setMlsCity}
                        minPrice={mlsMinPrice}
                        setMinPrice={setMlsMinPrice}
                        maxPrice={mlsMaxPrice}
                        setMaxPrice={setMlsMaxPrice}
                        minBeds={mlsMinBeds}
                        setMinBeds={setMlsMinBeds}
                        minBaths={mlsMinBaths}
                        setMinBaths={setMlsMinBaths}
                        cities={mlsCities}
                        addresses={mlsAddresses}
                        onSubmit={applyMlsFilters}
                        onOpenFiltersModal={() => setMlsShowFiltersModal(true)}
                        advancedFilterCount={advancedFilterCount}
                        searching={mlsSearching}
                    />

                    {/* Active filters summary */}
                    {mlsHasFilters && (
                        <MlsActiveFiltersBar
                            state={mlsFilterState}
                            setters={activeFiltersSetters}
                            onClearPolygon={handleClearPolygon}
                            onClearAll={clearMlsFilters}
                            onSavePrompt={handleSavePrompt}
                            showSavePrompt={hotsheetCtl.showPrompt}
                            statuses={mlsTaxonomy.statuses}
                        />
                    )}

                    {/* Partial-failure banner: some MLSes answered, some didn't. */}
                    {mlsError && mlsResults.length > 0 && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
                            <svg className="h-4 w-4 shrink-0 text-[#D97706]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            <p className="text-xs text-[#92400E]">{mlsError}</p>
                        </div>
                    )}

                    {mlsSearching && mlsResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E4E7EB] rounded-lg">
                            <div className="h-6 w-6 border-2 border-[#E4E7EB] border-t-[#111315] rounded-full animate-spin" />
                            <p className="mt-4 text-xs text-[#8B9096]">Loading MLS listings...</p>
                        </div>
                    ) : mlsError && mlsResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E4E7EB] rounded-lg">
                            <svg className="h-10 w-10 text-[#FCA5A5]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                            <p className="mt-3 text-sm text-[#5F656D]">{mlsError}</p>
                            <button onClick={() => fetchMls(1)} className="mt-2 text-xs font-medium text-[#111315] underline">Retry</button>
                        </div>
                    ) : mlsResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#E4E7EB] rounded-lg">
                            <svg className="h-12 w-12 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
                            </svg>
                            <p className="mt-4 text-sm text-[#8B9096]">No MLS listings found</p>
                            {mlsHasFilters && <button onClick={clearMlsFilters} className="mt-1 text-xs font-medium text-[#111315] underline">Clear filters</button>}
                        </div>
                    ) : (
                        <>
                            {/* Desktop: grid view (All + Office tabs) */}
                            {(tab === 'all' || tab === 'office') && listView === 'grid' && (
                                <div className="hidden md:block">
                                    <MlsGridView listings={sortedMlsResults} onOpenLightbox={openLightbox} onSelectListing={(ml) => setDetailMlsId(ml.mls_id)} mlsSlugToName={mlsSlugToName} />
                                    <MlsPagination page={mlsPage} total={mlsTotal} loading={mlsSearching} onPageChange={fetchMls} />
                                </div>
                            )}

                            {/* Desktop: half-map view (All + Office tabs) */}
                            {(tab === 'all' || tab === 'office') && listView === 'map' && (
                                <div className="hidden md:block">
                                    <MlsHalfMapView
                                        listings={sortedMlsResults}
                                        totalInArea={mlsTotal}
                                        onOpenLightbox={openLightbox}
                                        onSelectListing={handleMapSelectListing}
                                        polygon={mlsPolygon}
                                        onPolygonChange={handleMapPolygonChange}
                                        searching={mlsSearching}
                                        onSearchArea={handleMapSearchArea}
                                        pagination={mapPagination}
                                        mlsSlugToName={mlsSlugToName}
                                    />
                                </div>
                            )}

                            {/* Mobile card view */}
                            <div className="md:hidden bg-white border border-[#E4E7EB] rounded-lg divide-y divide-[#E4E7EB]">
                                {sortedMlsResults.map((ml) => {
                                    const isSelected = mlsSelectedIds.includes(ml.mls_id);
                                    return (
                                        <div key={ml.mls_id} className={`p-3 transition-colors ${isSelected ? 'bg-[#E6F0FF]' : ''}`}>
                                            <div className="flex items-start gap-3">
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleMlsSelect(ml.mls_id)} className="h-[18px] w-[18px] rounded-md mt-1 border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0" />
                                                <div className="shrink-0 overflow-hidden rounded" style={{ width: 64, height: 40, minWidth: 64, minHeight: 40 }}>
                                                    {ml.photos?.[0] ? (
                                                        <img src={ml.photos[0]} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => openLightbox(ml.photos, 0)} />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full">
                                                            <svg className="h-4 w-4 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5" /></svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <button onClick={() => setMlsExpandedId(mlsExpandedId === ml.mls_id ? null : ml.mls_id)} className="text-[13px] font-medium text-[#111315] hover:underline truncate block text-left">{ml.address?.full || ml.mls_number}</button>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {ml.property_type && <TintBadge label={ml.property_type} color={getTypeColors(ml.property_type).bg} />}
                                                        {ml.status && <TintBadge label={formatStatusLabel(ml.status)} color={getStatusColors(ml.status).bg} />}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#5F656D]">
                                                        <span className="font-medium text-[#5F656D]">{formatPrice(ml.price)}</span>
                                                        {(ml.bedrooms || ml.bathrooms) && <span>{ml.bedrooms ?? '—'} bd / {ml.bathrooms ?? '—'} ba</span>}
                                                        {ml.sqft && <span>{ml.sqft.toLocaleString()} sqft</span>}
                                                    </div>
                                                    <p className="mt-1 text-[10px] font-medium text-[#8B9096] uppercase tracking-wider line-clamp-1">
                                                        {mlsSlugToName[ml.mls_slug] || ml.mls_slug}
                                                        {ml.mls_number && <span className="text-[#C8CCD1] normal-case tracking-normal"> · #{ml.mls_number}</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <MlsPagination page={mlsPage} total={mlsTotal} loading={mlsSearching} onPageChange={fetchMls} />
                            </div>

                            {/* Desktop table view (list mode on All + Office tabs) */}
                            <div className={`bg-white border border-[#E4E7EB] shadow-sm overflow-hidden overflow-x-auto ${(tab === 'all' || tab === 'office') && listView === 'list' ? 'hidden md:block' : 'hidden'}`}>
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-[#E4E7EB]">
                                            <th className="px-2 border-r border-[#E4E7EB] w-9" style={{ height: '44px' }}>
                                                <input type="checkbox" checked={mlsResults.length > 0 && mlsSelectedIds.length === mlsResults.length} onChange={toggleMlsAll} className="h-[18px] w-[18px] rounded-md border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                                            </th>
                                            {mlsTableColumns.map((col, i) => (
                                                <th key={col.key} className={`px-3 text-left whitespace-nowrap ${i < mlsTableColumns.length - 1 ? 'border-r border-[#E4E7EB]' : ''}`} style={{ height: '44px' }}>
                                                    {col.sortKey ? (
                                                        <button
                                                            onClick={() => handleMlsSort(col.sortKey)}
                                                            className="flex items-center whitespace-nowrap transition-colors"
                                                            style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}
                                                        >
                                                            {col.label}
                                                            <SortIcon column={col.sortKey} currentSort={mlsSort} currentDirection={mlsSortDir} />
                                                        </button>
                                                    ) : (
                                                        <span className="whitespace-nowrap" style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}>{col.label}</span>
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedMlsResults.map((ml) => {
                                            const isSelected = mlsSelectedIds.includes(ml.mls_id);
                                            return (
                                                <React.Fragment key={ml.mls_id}>
                                                    <tr
                                                        className={`bg-white border-b border-[#E4E7EB] transition-colors ${
                                                            isSelected ? 'bg-[#F7F8FB]' : mlsExpandedId === ml.mls_id ? 'bg-[#F7F8FB]' : ''
                                                        }`}
                                                        onMouseEnter={(e) => handleMlsRowMouseEnter(ml.mls_id, e)}
                                                        onMouseLeave={handleMlsRowMouseLeave}
                                                    >
                                                        <td className="px-2 border-r border-[#E4E7EB] text-center w-9" style={{ height: '44px' }}>
                                                            <input type="checkbox" checked={isSelected} onChange={() => toggleMlsSelect(ml.mls_id)} className="h-[18px] w-[18px] rounded-md border-[#D1D5DB] text-[#1693C9] focus:ring-0 focus:ring-offset-0 cursor-pointer" />
                                                        </td>
                                                        {mlsTableColumns.map((col, i) => (
                                                            <td key={col.key} className={`px-3 whitespace-nowrap ${col.key === 'photo' ? 'text-center py-1.5' : ''} ${i < mlsTableColumns.length - 1 ? 'border-r border-[#E4E7EB]' : ''}`}>
                                                                <MlsCell listing={ml} colKey={col.key} onOpenLightbox={openLightbox} onOpenDetail={setDetailMlsId} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                    {/* Expanded details */}
                                                    {mlsExpandedId === ml.mls_id && (
                                                        <MlsExpandedDetails
                                                            listing={ml}
                                                            colSpan={mlsTableColumns.length + 1}
                                                            onOpenLightbox={openLightbox}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Hover detail popover */}
                                {mlsHoveredListing && mlsHoverPos && mlsExpandedId !== mlsHoveredListing.mls_id && (
                                    <div
                                        className="fixed z-50 bg-white border border-[#E4E7EB] rounded-lg shadow-xl w-80 pointer-events-none overflow-hidden"
                                        style={{ top: `${mlsHoverPos.top}px`, left: `${mlsHoverPos.left}px` }}
                                    >
                                        {mlsHoveredListing.photos?.[0] && (
                                            <img src={mlsHoveredListing.photos[0]} alt="" className="w-full h-36 object-cover" />
                                        )}
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-[#111315] truncate">{mlsHoveredListing.address?.full}</p>
                                            <p className="text-lg font-bold text-[#111315] mt-1">{formatPrice(mlsHoveredListing.price)}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-[#5F656D]">
                                                {mlsHoveredListing.bedrooms != null && <span>{mlsHoveredListing.bedrooms} bed</span>}
                                                {mlsHoveredListing.bathrooms != null && <span>{mlsHoveredListing.bathrooms} bath</span>}
                                                {mlsHoveredListing.sqft != null && <span>{mlsHoveredListing.sqft.toLocaleString()} sqft</span>}
                                                {mlsHoveredListing.year_built != null && <span>Built {mlsHoveredListing.year_built}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                {mlsHoveredListing.status && <TintBadge label={formatStatusLabel(mlsHoveredListing.status)} color={getStatusColors(mlsHoveredListing.status).bg} />}
                                                {mlsHoveredListing.property_type && <TintBadge label={mlsHoveredListing.property_type} color={getTypeColors(mlsHoveredListing.property_type).bg} />}
                                            </div>
                                            {mlsHoveredListing.description && (
                                                <p className="mt-2 text-[11px] text-[#5F656D] line-clamp-2">{mlsHoveredListing.description}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <MlsPagination page={mlsPage} total={mlsTotal} loading={mlsSearching} onPageChange={fetchMls} variant="bar" />
                            </div>
                        </>
                    )}
                </div>
                )}
            </div>
            </div>
            </div>

            {/* Bulk action bars */}
            <BulkActionBar
                count={selectedIds.length}
                onClear={() => setSelectedIds([])}
                actions={
                    <button className="flex items-center px-3 sm:px-4 text-xs font-medium text-red-400 border-r border-white/10 hover:text-red-300 hover:bg-white/10 transition-colors">
                        <svg className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        <span className="hidden sm:inline">Delete</span>
                    </button>
                }
            />
            <BulkActionBar count={mlsSelectedIds.length} onClear={() => setMlsSelectedIds([])} />

            <NewListingModal
                isOpen={showNewListingModal}
                onClose={() => setShowNewListingModal(false)}
                listingTypes={listingTypes}
                listingStatuses={listingStatuses}
                contacts={newListingOptions.contacts}
                deals={newListingOptions.deals}
                tags={newListingOptions.tags}
                googleMapsApiKey={newListingOptions.googleMapsApiKey}
            />
        </CrmLayout>
    );
}
