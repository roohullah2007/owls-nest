// The sticky top filter bar: free-text search, the dropdown-trigger chips
// (Price / Type / Built / Beds & Baths / Sqft), the "All Filters" button with
// its active-count badge, Save Search, and the Map / Grid view toggle. Trigger
// buttons report their on-screen rect so the parent can anchor the popovers.
import { cn } from '@/lib/utils';
import { ChevronDownIcon, SearchIcon } from '@/components/site/icons';
import { fmt } from './filter-panels';
import type { PanelKey } from './filter-panels';
import type { FilterState } from './use-property-filters';

interface FilterBarProps {
    filters: FilterState;
    onSearch: (q: string) => void;
    openPanel: PanelKey | null;
    onOpenPanel: (key: PanelKey, rect: DOMRect) => void;
    filterCount: number;
    onClearAll: () => void;
    view: 'map' | 'grid';
    onViewChange: (view: 'map' | 'grid') => void;
}

const CHIP =
    'flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-[14px] leading-none';

function priceLabel(f: FilterState) {
    if (f.priceMin == null && f.priceMax == null) {
        return 'Price';
    }

    return `${fmt('price', f.priceMin ?? 0)} – ${fmt('price', f.priceMax ?? 10000000)}`;
}
function builtLabel(f: FilterState) {
    if (f.builtMin == null && f.builtMax == null) {
        return 'Built';
    }

    return `${f.builtMin ?? 1960} – ${f.builtMax ?? 2025}`;
}
function sqftLabel(f: FilterState) {
    if (f.sqftMin == null && f.sqftMax == null) {
        return 'Sqft';
    }

    return `${fmt('sqft', f.sqftMin ?? 500)} – ${fmt('sqft', f.sqftMax ?? 6000)}`;
}
function bedsLabel(f: FilterState) {
    const parts: string[] = [];

    if (f.beds) {
        parts.push(`${f.beds}+ bd`);
    }

    if (f.baths) {
        parts.push(`${f.baths}+ ba`);
    }

    return parts.length ? parts.join(' · ') : 'Beds & Baths';
}

interface ChipButtonProps {
    panel: PanelKey;
    label: string;
    active: boolean;
    open: boolean;
    onOpen: (key: PanelKey, rect: DOMRect) => void;
    children?: React.ReactNode;
}

function ChipButton({
    panel,
    label,
    active,
    open,
    onOpen,
    children,
}: ChipButtonProps) {
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onOpen(panel, e.currentTarget.getBoundingClientRect());
            }}
            className={cn(
                CHIP,
                active || open
                    ? 'border-navy font-medium text-navy'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400',
            )}
        >
            {children}
            <span>{label}</span>
            <ChevronDownIcon className="h-3.5 w-3.5 text-gray-500" />
        </button>
    );
}

export function FilterBar({
    filters,
    onSearch,
    openPanel,
    onOpenPanel,
    filterCount,
    onClearAll,
    view,
    onViewChange,
}: FilterBarProps) {
    return (
        <div className="sticky top-0 z-40 border-b border-gray-200 bg-white">
            <div className="flex h-[72px] w-full [scrollbar-width:none] items-center gap-1.5 overflow-x-auto px-6 lg:px-10 [&::-webkit-scrollbar]:hidden">
                {/* Search */}
                <div className="flex min-w-[110px] flex-shrink-0 items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2">
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                    <input
                        value={filters.q}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search city, neighbourhood, or address"
                        className="min-w-0 flex-1 bg-transparent text-[14px] leading-none text-gray-700 placeholder-gray-400 outline-none"
                    />
                </div>

                <ChipButton
                    panel="price"
                    label={priceLabel(filters)}
                    active={
                        filters.priceMin != null || filters.priceMax != null
                    }
                    open={openPanel === 'price'}
                    onOpen={onOpenPanel}
                />
                <ChipButton
                    panel="type"
                    label={
                        filters.types.length
                            ? `Type · ${filters.types.length}`
                            : 'Type'
                    }
                    active={filters.types.length > 0}
                    open={openPanel === 'type'}
                    onOpen={onOpenPanel}
                />
                <ChipButton
                    panel="built"
                    label={builtLabel(filters)}
                    active={
                        filters.builtMin != null || filters.builtMax != null
                    }
                    open={openPanel === 'built'}
                    onOpen={onOpenPanel}
                />
                <ChipButton
                    panel="beds"
                    label={bedsLabel(filters)}
                    active={filters.beds > 0 || filters.baths > 0}
                    open={openPanel === 'beds'}
                    onOpen={onOpenPanel}
                />
                <ChipButton
                    panel="sqft"
                    label={sqftLabel(filters)}
                    active={filters.sqftMin != null || filters.sqftMax != null}
                    open={openPanel === 'sqft'}
                    onOpen={onOpenPanel}
                />

                <div className="ml-auto flex flex-shrink-0 items-center gap-2 pl-2">
                    {filterCount > 0 && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="flex flex-shrink-0 items-center gap-1.5 text-[14px] leading-none whitespace-nowrap text-navy hover:underline"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            Clear all filters
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenPanel(
                                'filters',
                                e.currentTarget.getBoundingClientRect(),
                            );
                        }}
                        className={cn(
                            'flex flex-shrink-0 items-center gap-2 rounded-full border border-navy px-4 py-2 text-[14px] leading-none font-medium whitespace-nowrap text-navy',
                        )}
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 6h18M7 12h10M11 18h2"
                            />
                        </svg>
                        Filters
                        {filterCount > 0 && (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[11px] text-white">
                                {filterCount}
                            </span>
                        )}
                        <ChevronDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-[14px] whitespace-nowrap text-white"
                    >
                        <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 5h11l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"
                            />
                        </svg>
                        Save Search
                    </button>
                    <div className="flex items-center overflow-hidden rounded-full border border-gray-300 text-[14px]">
                        <button
                            type="button"
                            onClick={() => onViewChange('map')}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2',
                                view === 'map'
                                    ? 'bg-navy text-white'
                                    : 'text-gray-700',
                            )}
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                                />
                            </svg>
                            Map
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewChange('grid')}
                            className={cn(
                                'flex items-center gap-1.5 px-4 py-2',
                                view === 'grid'
                                    ? 'bg-navy text-white'
                                    : 'text-gray-700',
                            )}
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z"
                                />
                            </svg>
                            Grid
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
