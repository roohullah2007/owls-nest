// The sticky top filter bar: free-text search, the dropdown-trigger chips
// (Price / Type / Built / Beds & Baths / Sqft), the "All Filters" button with
// its active-count badge, Save Search, and the Map / Grid view toggle. Trigger
// buttons report their on-screen rect so the parent can anchor the popovers.
// Styled to match the EcoListing reference: rounded-xl chips with leading
// icons, 40px controls, gray-300 borders and navy (our brand "blue") accents.
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
    'flex h-10 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-4 text-[13px] font-medium leading-none';

const ICON = 'h-3.5 w-3.5 shrink-0';

const PriceIcon = () => (
    <svg
        className={ICON}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
);
const TypeIcon = () => (
    <svg
        className={ICON}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
    </svg>
);
const BuiltIcon = () => (
    <svg
        className={ICON}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const BedsIcon = () => (
    <svg
        className={ICON}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M2 4v16" />
        <path d="M2 8h18a2 2 0 0 1 2 2v10" />
        <path d="M2 17h20" />
        <path d="M6 8v9" />
    </svg>
);
const SqftIcon = () => (
    <svg
        className={ICON}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);

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
                'text-navy hover:bg-gray-50',
                active || open ? 'border-navy' : 'border-gray-300',
            )}
        >
            {children}
            <span>{label}</span>
            <ChevronDownIcon className="h-3 w-3 text-navy/70" />
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
            <div className="flex w-full [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4 py-5 [&::-webkit-scrollbar]:hidden">
                {/* Search */}
                <div className="flex h-10 min-w-[200px] flex-shrink-0 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 lg:w-[220px]">
                    <SearchIcon className="h-4 w-4 text-gray-400" />
                    <input
                        value={filters.q}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search city, neighbourhood, or MLS®#…"
                        className="min-w-0 flex-1 bg-transparent text-sm leading-none text-gray-700 placeholder-gray-400 outline-none"
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
                >
                    <PriceIcon />
                </ChipButton>
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
                >
                    <TypeIcon />
                </ChipButton>
                <ChipButton
                    panel="built"
                    label={builtLabel(filters)}
                    active={
                        filters.builtMin != null || filters.builtMax != null
                    }
                    open={openPanel === 'built'}
                    onOpen={onOpenPanel}
                >
                    <BuiltIcon />
                </ChipButton>
                <ChipButton
                    panel="beds"
                    label={bedsLabel(filters)}
                    active={filters.beds > 0 || filters.baths > 0}
                    open={openPanel === 'beds'}
                    onOpen={onOpenPanel}
                >
                    <BedsIcon />
                </ChipButton>
                <ChipButton
                    panel="sqft"
                    label={sqftLabel(filters)}
                    active={filters.sqftMin != null || filters.sqftMax != null}
                    open={openPanel === 'sqft'}
                    onOpen={onOpenPanel}
                >
                    <SqftIcon />
                </ChipButton>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenPanel(
                            'filters',
                            e.currentTarget.getBoundingClientRect(),
                        );
                    }}
                    className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl border border-navy px-4 text-[13px] leading-none font-medium whitespace-nowrap text-navy hover:bg-gray-50"
                >
                    <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <line x1="4" y1="6" x2="20" y2="6" />
                        <line x1="4" y1="12" x2="20" y2="12" />
                        <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                    Filters
                    {filterCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-lg bg-navy px-1.5 text-[11px] font-bold text-white">
                            {filterCount}
                        </span>
                    )}
                    <ChevronDownIcon className="h-3 w-3" />
                </button>

                <div className="ml-auto flex flex-shrink-0 items-center gap-2 pl-2">
                    {filterCount > 0 && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="hidden flex-shrink-0 items-center gap-1.5 text-[13px] leading-none whitespace-nowrap text-navy hover:underline xl:flex"
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
                            Clear all
                        </button>
                    )}
                    {/* Saved searches have no backend yet — the control stays
                        visible per the design but is disabled with a reason
                        instead of silently doing nothing. */}
                    <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Saved searches are coming soon"
                        className="flex h-10 items-center gap-2 rounded-lg bg-navy px-4 text-[13px] font-semibold tracking-[0.3px] whitespace-nowrap text-white hover:opacity-90 disabled:cursor-not-allowed"
                    >
                        <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                        </svg>
                        Save Search
                    </button>
                    <div className="flex h-10 items-center overflow-hidden rounded-lg border border-gray-300">
                        <button
                            type="button"
                            onClick={() => onViewChange('map')}
                            className={cn(
                                'flex h-full items-center gap-1.5 px-3 text-[12px] font-semibold',
                                view === 'map'
                                    ? 'bg-navy text-white'
                                    : 'text-gray-500',
                            )}
                        >
                            <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                                <line x1="8" y1="2" x2="8" y2="18" />
                                <line x1="16" y1="6" x2="16" y2="22" />
                            </svg>
                            Map
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewChange('grid')}
                            className={cn(
                                'flex h-full items-center gap-1.5 border-l border-gray-300 px-3 text-[12px] font-semibold',
                                view === 'grid'
                                    ? 'bg-navy text-white'
                                    : 'text-gray-500',
                            )}
                        >
                            <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                            </svg>
                            Grid
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
