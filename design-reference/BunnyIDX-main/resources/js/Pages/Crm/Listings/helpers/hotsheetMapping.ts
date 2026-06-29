import type { HotsheetFilters } from '../types';
import type { MlsFilterState } from './buildMlsSearchPayload';

/**
 * Pure mapping between the page-level `MlsFilterState` shape and the snake_case
 * `HotsheetFilters` shape persisted on the Hotsheet model. Keeping the mapping
 * in one place means adding a new MLS filter is a 2-edit job: extend
 * `MlsFilterState` and extend these two functions.
 */

export function toHotsheetFilters(state: MlsFilterState): HotsheetFilters {
    return {
        query: state.query || undefined,
        city: state.city || undefined,
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
        property_type: state.propertyType || undefined,
        property_subtype: state.propertySubtype || undefined,
        status: state.status || undefined,
        agent_id: state.agentId || undefined,
        office_id: state.officeId || undefined,
        recently_reduced_days: state.recentlyReducedDays || undefined,
        open_house_within_days: state.openHouseWithinDays || undefined,
        max_hoa_fee: state.maxHoaFee || undefined,
        polygon: state.polygon ?? undefined,
    };
}

/** Normalised view of a saved hotsheet's filters — strings empty when absent. */
export interface AppliedHotsheet {
    state: MlsFilterState;
    polygon: [number, number][] | null;
}

export function fromHotsheetFilters(f: HotsheetFilters | null | undefined): AppliedHotsheet {
    const raw = f || {};
    const polygon = (raw.polygon && Array.isArray(raw.polygon) && raw.polygon.length >= 3)
        ? (raw.polygon as [number, number][])
        : null;
    return {
        polygon,
        state: {
            query: raw.query || '',
            city: raw.city || '',
            county: '',         // legacy hotsheets predate these — default empty.
            neighborhood: '',
            subdivision: raw.subdivision || '',
            minPrice: raw.min_price || '',
            maxPrice: raw.max_price || '',
            minBeds: raw.min_beds || '',
            minBaths: raw.min_baths || '',
            minSqft: raw.min_sqft || '',
            maxSqft: raw.max_sqft || '',
            minLotAcres: raw.min_lot_acres || '',
            maxLotAcres: raw.max_lot_acres || '',
            minYearBuilt: raw.min_year_built || '',
            maxYearBuilt: raw.max_year_built || '',
            propertyType: raw.property_type || '',
            propertySubtype: raw.property_subtype || '',
            status: raw.status || '',
            agentId: raw.agent_id || '',
            officeId: raw.office_id || '',
            recentlyReducedDays: raw.recently_reduced_days || '',
            openHouseWithinDays: raw.open_house_within_days || '',
            maxHoaFee: raw.max_hoa_fee || '',
            polygon,
        },
    };
}
