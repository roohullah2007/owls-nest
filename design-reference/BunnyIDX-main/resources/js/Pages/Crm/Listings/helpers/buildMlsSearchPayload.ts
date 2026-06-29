/**
 * The full MLS filter surface the page sends to /crm/listings/search-mls.
 * Keep this in lockstep with ListingController::searchMls validation.
 */
export interface MlsFilterState {
    query: string;
    city: string;
    county: string;
    neighborhood: string;
    subdivision: string;
    minPrice: string;
    maxPrice: string;
    minBeds: string;
    minBaths: string;
    minSqft: string;
    maxSqft: string;
    minLotAcres: string;
    maxLotAcres: string;
    minYearBuilt: string;
    maxYearBuilt: string;
    propertyType: string;
    propertySubtype: string;
    status: string;
    agentId: string;
    officeId: string;
    recentlyReducedDays: string;
    openHouseWithinDays: string;
    maxHoaFee: string;
    polygon: [number, number][] | null;
}

export interface MlsBounds {
    ne_lat: number;
    ne_lng: number;
    sw_lat: number;
    sw_lng: number;
}

interface BuildOpts {
    /** Scope to one connection's MLS; null = search every active MLS (the All tab). */
    connectionId: number | null;
    page: number;
    /** When null/undefined we fall back to `state.polygon`. */
    polygonOverride?: [number, number][] | null;
    /** Wins over polygon — "Search this area" passes the current map viewport. */
    boundsOverride?: MlsBounds | null;
    /** When set, overrides `state.propertyType` (used for cache-key tab switches). */
    propertyTypeOverride?: string;
    /** Map view bumps this to 200 and uses 'lite' projection. */
    perPage?: number;
    projection?: 'detail' | 'lite' | 'count';
}

/**
 * Build the axios POST body for /crm/listings/search-mls. Everything optional
 * is omitted when empty so the controller validator doesn't see noise.
 *
 * Polygon is converted from Leaflet [lat, lng] to GeoJSON [lng, lat] here.
 */
export function buildMlsSearchPayload(state: MlsFilterState, opts: BuildOpts): Record<string, unknown> {
    const polygon = opts.polygonOverride !== undefined ? opts.polygonOverride : state.polygon;
    const propertyType = opts.propertyTypeOverride !== undefined ? opts.propertyTypeOverride : state.propertyType;
    // bounds and polygon are mutually exclusive at MlsGeoQuery; bounds wins.
    const geo: Record<string, unknown> | undefined = opts.boundsOverride
        ? { bounds: opts.boundsOverride }
        : polygon
            ? { polygon: polygon.map(([lat, lng]) => [lng, lat]) }
            : undefined;
    return {
        connection_id: opts.connectionId || undefined,
        query: state.query || undefined,
        city: state.city || undefined,
        // BridgeApiClient supports `county`/`counties` and `neighborhood`
        // (matches SubdivisionName OR MLSAreaMajor). Ship the single-value
        // variants — the controller validator accepts either.
        county: state.county || undefined,
        neighborhood: state.neighborhood || undefined,
        subdivision: state.subdivision || undefined,
        min_price: state.minPrice || undefined,
        max_price: state.maxPrice || undefined,
        min_beds: state.minBeds || undefined,
        min_baths: state.minBaths || undefined,
        min_sqft: state.minSqft || undefined,
        max_sqft: state.maxSqft || undefined,
        min_lot_acres: state.minLotAcres || undefined,
        max_lot_acres: state.maxLotAcres || undefined,
        min_year_built: state.minYearBuilt || undefined,
        max_year_built: state.maxYearBuilt || undefined,
        property_type: propertyType || undefined,
        property_subtype: state.propertySubtype || undefined,
        status: state.status || undefined,
        agent_id: state.agentId || undefined,
        office_id: state.officeId || undefined,
        geo,
        recently_reduced: state.recentlyReducedDays ? { within_days: Number(state.recentlyReducedDays) } : undefined,
        has_open_house_within_days: state.openHouseWithinDays || undefined,
        max_hoa_fee: state.maxHoaFee || undefined,
        per_page: opts.perPage,
        projection: opts.projection,
        page: opts.page,
    };
}
