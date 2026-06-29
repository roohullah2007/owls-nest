import type { TaxonomyTerm } from '@/hooks/useMlsTaxonomy';
import type { MlsFilterState } from '../helpers/buildMlsSearchPayload';
import { formatPrice } from '../utils';

interface Setters {
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
    setMlsRecentlyReducedDays: (v: string) => void;
    setMlsOpenHouseWithinDays: (v: string) => void;
    setMlsMaxHoaFee: (v: string) => void;
    setMlsPropertyType: (v: string) => void;
    setMlsPropertySubtype: (v: string) => void;
    setMlsStatus: (v: string) => void;
    setMlsAgentId: (v: string) => void;
    setMlsOfficeId: (v: string) => void;
}

interface Props {
    state: MlsFilterState;
    setters: Setters;
    /** Cleared from the X on the polygon chip; parent re-fetches without it. */
    onClearPolygon: () => void;
    onClearAll: () => void;
    onSavePrompt: () => void;
    showSavePrompt: boolean;
    statuses: TaxonomyTerm[];
}

/**
 * The white chip strip that appears under the search bar when any filter is
 * active. Each chip carries an X that clears just that filter; the strip
 * also hosts "Save as Hotsheet" and "Clear all" on the right.
 */
export default function MlsActiveFiltersBar({
    state, setters, onClearPolygon, onClearAll, onSavePrompt, showSavePrompt, statuses,
}: Props) {
    const splitIds = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
    const removeOneId = (raw: string, target: string) => splitIds(raw).filter((x) => x !== target).join(',');

    return (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 mb-3 bg-white border border-[#C8CCD1] rounded-[4px]">
            {state.county          && <Chip label={`County: ${state.county}`}            onClear={() => setters.setMlsCounty('')} />}
            {state.city            && <Chip label={`City: ${state.city}`}                onClear={() => setters.setMlsCity('')} />}
            {state.neighborhood    && <Chip label={`Neighborhood: ${state.neighborhood}`} onClear={() => setters.setMlsNeighborhood('')} />}
            {state.subdivision     && <Chip label={`Subdivision: ${state.subdivision}`}  onClear={() => setters.setMlsSubdivision('')} />}
            {state.minPrice        && <Chip label={`Min: ${formatPrice(state.minPrice)}`} onClear={() => setters.setMlsMinPrice('')} />}
            {state.maxPrice        && <Chip label={`Max: ${formatPrice(state.maxPrice)}`} onClear={() => setters.setMlsMaxPrice('')} />}
            {state.minBeds         && <Chip label={`${state.minBeds}+ Beds`}             onClear={() => setters.setMlsMinBeds('')} />}
            {state.minBaths        && <Chip label={`${state.minBaths}+ Baths`}           onClear={() => setters.setMlsMinBaths('')} />}
            {(state.minSqft || state.maxSqft) && (
                <Chip label={`Sqft: ${state.minSqft || '0'} – ${state.maxSqft || '∞'}`} onClear={() => { setters.setMlsMinSqft(''); setters.setMlsMaxSqft(''); }} />
            )}
            {(state.minLotAcres || state.maxLotAcres) && (
                <Chip label={`Lot ac: ${state.minLotAcres || '0'} – ${state.maxLotAcres || '∞'}`} onClear={() => { setters.setMlsMinLotAcres(''); setters.setMlsMaxLotAcres(''); }} />
            )}
            {(state.minYearBuilt || state.maxYearBuilt) && (
                <Chip label={`Year: ${state.minYearBuilt || '—'} – ${state.maxYearBuilt || '—'}`} onClear={() => { setters.setMlsMinYearBuilt(''); setters.setMlsMaxYearBuilt(''); }} />
            )}
            {state.recentlyReducedDays && <Chip label={`Reduced ≤ ${state.recentlyReducedDays}d`}    onClear={() => setters.setMlsRecentlyReducedDays('')} />}
            {state.openHouseWithinDays && <Chip label={`Open House ≤ ${state.openHouseWithinDays}d`} onClear={() => setters.setMlsOpenHouseWithinDays('')} />}
            {state.maxHoaFee           && <Chip label={`HOA ≤ ${formatPrice(state.maxHoaFee)}`}      onClear={() => setters.setMlsMaxHoaFee('')} />}
            {state.polygon             && <Chip label={`Polygon · ${state.polygon.length} pts`}      onClear={onClearPolygon} />}
            {state.propertyType        && <Chip label={state.propertyType}                           onClear={() => setters.setMlsPropertyType('')} />}
            {state.propertySubtype     && <Chip label={state.propertySubtype}                        onClear={() => setters.setMlsPropertySubtype('')} />}
            {state.status              && (
                <Chip
                    label={statuses.find((s) => s.value === state.status)?.label || state.status}
                    onClear={() => setters.setMlsStatus('')}
                />
            )}
            {state.agentId && splitIds(state.agentId).map((id) => (
                <Chip key={`agent-${id}`} label={`Agent: ${id}`} onClear={() => setters.setMlsAgentId(removeOneId(state.agentId, id))} />
            ))}
            {state.officeId && splitIds(state.officeId).map((id) => (
                <Chip key={`office-${id}`} label={`Office: ${id}`} onClear={() => setters.setMlsOfficeId(removeOneId(state.officeId, id))} />
            ))}

            <div className="ml-auto flex items-center gap-2">
                {!showSavePrompt && (
                    <button
                        type="button"
                        onClick={onSavePrompt}
                        className="inline-flex items-center gap-1.5 h-7 px-3 text-[12px] font-semibold text-white bg-[#1693C9] hover:bg-[#1380AF] rounded-[4px] shadow-sm transition-colors"
                        title="Save this search (filters + polygon) as a reusable hotsheet"
                    >
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                        </svg>
                        Save as Hotsheet
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[12px] font-semibold text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-[4px] px-2 py-1 transition-colors"
                >
                    Clear all
                </button>
            </div>
        </div>
    );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-white border border-[#C8CCD1] rounded-[4px] text-[#111315]">
            {label}
            <button type="button" onClick={onClear} className="ml-0.5 text-[#111315] hover:text-[#EF4444]">&times;</button>
        </span>
    );
}
