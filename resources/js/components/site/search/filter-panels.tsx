// The dropdown panels that hang off the filter bar (Price / Type / Built /
// Beds & Baths / Sqft / All Filters). Ported from the static page's filter
// markup + JS. Each renders as a fixed-position popover anchored under its
// trigger button; the parent owns open/close + outside-click handling.
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CloseIcon } from '@/components/site/icons';
import { DualRangeSlider } from './dual-range-slider';
import { PROPERTY_TYPE_OPTIONS } from './use-property-filters';
import type { FilterState } from './use-property-filters';

export type PanelKey = 'price' | 'type' | 'built' | 'beds' | 'sqft' | 'filters';

const PANEL_WIDTH: Record<PanelKey, number> = {
    price: 470,
    type: 280,
    built: 430,
    beds: 330,
    sqft: 470,
    filters: 560,
};

const PROPERTY_TYPES = PROPERTY_TYPE_OPTIONS.map((o) => o.label);

const BASEMENT_TYPES = [
    'Finished',
    'Full',
    'Unfinished',
    'Apartment',
    'Finished Walk-out',
    'Crawl Space',
    'Partially Finished',
    'Separate Entrance',
    'Partial Basement',
    'Walk-out',
    'Half',
    'Walk-Up',
    'None',
    'Other',
];

const LABEL = 'mb-2.5 text-[13px] font-semibold text-navy';
const SUB = 'mb-1.5 text-[12px] text-gray-500';
const INPUT =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[14px] text-gray-700 outline-none focus:border-navy';
const APPLY =
    'rounded-full bg-navy px-5 py-1.5 text-[13px] font-semibold text-white hover:bg-navydark';
const RESET =
    'inline-flex items-center gap-1.5 bg-none text-[13px] text-gray-400 hover:text-navy';
const CHECK =
    'flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px] text-gray-700';

function pillClass(active: boolean) {
    return cn(
        'cursor-pointer rounded-full border px-4 py-1.5 text-[13px] whitespace-nowrap',
        active
            ? 'border-navy bg-navy text-white'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
    );
}

function ResetIcon() {
    return (
        <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
        </svg>
    );
}

export function fmt(type: string, value: number): string {
    const v = +value;

    if (type === 'price') {
        if (v <= 0) {
            return '$0';
        }

        if (v >= 10000000) {
            return '$10M+';
        }

        if (v >= 1000000) {
            return '$' + (v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1) + 'M';
        }

        return '$' + Math.round(v / 1000) + 'k';
    }

    if (type === 'year') {
        return String(v);
    }

    if (type === 'sqft') {
        return v >= 6000 ? '6,000+ sf' : v.toLocaleString() + ' sf';
    }

    if (type === 'acre') {
        return v <= 0 ? 'Any' : v >= 5 ? '5+ ac' : v + ' ac';
    }

    if (type === 'fee') {
        return '$' + v.toLocaleString();
    }

    return String(v);
}

interface PopoverProps {
    panel: PanelKey;
    anchor: DOMRect;
    children: ReactNode;
    className?: string;
}

function Popover({ panel, anchor, children, className }: PopoverProps) {
    const width = PANEL_WIDTH[panel];
    let left = anchor.left;

    if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12;
    }

    if (left < 12) {
        left = 12;
    }

    const style: CSSProperties = {
        left,
        top: anchor.bottom + 8,
        width,
        maxWidth: 'calc(100vw - 24px)',
    };

    return (
        <div
            role="dialog"
            style={style}
            onClick={(e) => e.stopPropagation()}
            className={cn(
                'fixed z-[1000] rounded-xl border border-gray-200 bg-white shadow-xl',
                className,
            )}
        >
            {children}
        </div>
    );
}

interface FilterPanelsProps {
    openPanel: PanelKey | null;
    anchor: DOMRect | null;
    filters: FilterState;
    setFilters: (next: FilterState) => void;
    resultCount: number;
    onClose: () => void;
    onResetAll: () => void;
    /** Decorative-only sqft lot range (no effect on results, matches original). */
    lotRange: [number, number];
    setLotRange: (next: [number, number]) => void;
}

export function FilterPanels({
    openPanel,
    anchor,
    filters,
    setFilters,
    resultCount,
    onClose,
    onResetAll,
    lotRange,
    setLotRange,
}: FilterPanelsProps) {
    if (!openPanel || !anchor) {
        return null;
    }

    const patch = (next: Partial<FilterState>) =>
        setFilters({ ...filters, ...next });

    if (openPanel === 'price') {
        const a = filters.priceMin ?? 0;
        const b = filters.priceMax ?? 10000000;

        return (
            <Popover panel="price" anchor={anchor} className="p-5">
                <div className="flex justify-end">
                    <button
                        type="button"
                        className={RESET}
                        onClick={() =>
                            patch({ priceMin: null, priceMax: null })
                        }
                    >
                        <ResetIcon />
                        Reset
                    </button>
                </div>
                <p className={LABEL}>Price Range</p>
                <DualRangeSlider
                    min={0}
                    max={10000000}
                    step={50000}
                    value={[a, b]}
                    ends={['$0', '$10M+']}
                    showHistogram
                    onChange={([na, nb]) =>
                        patch({
                            priceMin: na <= 0 ? null : na,
                            priceMax: nb >= 10000000 ? null : nb,
                        })
                    }
                />
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                    <div>
                        <p className={SUB}>Min</p>
                        <input
                            readOnly
                            className={INPUT}
                            placeholder="$0"
                            value={a <= 0 ? '' : fmt('price', a)}
                        />
                    </div>
                    <span className="pb-3 text-gray-400">–</span>
                    <div>
                        <p className={SUB}>Max</p>
                        <input
                            readOnly
                            className={INPUT}
                            placeholder="No max"
                            value={b >= 10000000 ? '' : fmt('price', b)}
                        />
                    </div>
                </div>
            </Popover>
        );
    }

    if (openPanel === 'type') {
        const toggle = (label: string) => {
            const has = filters.types.includes(label);
            patch({
                types: has
                    ? filters.types.filter((t) => t !== label)
                    : [...filters.types, label],
            });
        };

        return (
            <Popover panel="type" anchor={anchor} className="p-5">
                <div className="-mt-1 mb-1 flex justify-end">
                    <button
                        type="button"
                        className={RESET}
                        onClick={() => patch({ types: [] })}
                    >
                        <ResetIcon />
                        Reset
                    </button>
                </div>
                {PROPERTY_TYPES.map((label) => (
                    <label key={label} className={CHECK}>
                        <input
                            type="checkbox"
                            className="h-4 w-4 accent-navy"
                            checked={filters.types.includes(label)}
                            onChange={() => toggle(label)}
                        />
                        {label}
                    </label>
                ))}
            </Popover>
        );
    }

    if (openPanel === 'built') {
        const a = filters.builtMin ?? 1960;
        const b = filters.builtMax ?? 2025;

        return (
            <Popover panel="built" anchor={anchor} className="p-5">
                <div className="flex justify-end">
                    <button
                        type="button"
                        className={RESET}
                        onClick={() =>
                            patch({ builtMin: null, builtMax: null })
                        }
                    >
                        <ResetIcon />
                        Reset
                    </button>
                </div>
                <p className={LABEL}>Year</p>
                <DualRangeSlider
                    min={1960}
                    max={2025}
                    step={1}
                    value={[a, b]}
                    ends={['1960', '2025']}
                    onChange={([na, nb]) =>
                        patch({
                            builtMin: na <= 1960 ? null : na,
                            builtMax: nb >= 2025 ? null : nb,
                        })
                    }
                />
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <input
                        readOnly
                        className={INPUT}
                        placeholder="Min year"
                        value={a <= 1960 ? '' : String(a)}
                    />
                    <input
                        readOnly
                        className={INPUT}
                        placeholder="Max year"
                        value={b >= 2025 ? '' : String(b)}
                    />
                </div>
            </Popover>
        );
    }

    if (openPanel === 'beds') {
        const bedOptions = [0, 1, 2, 3, 4, 5];
        const bathOptions = [0, 1, 2, 3, 4];
        const pillLabel = (n: number) => (n === 0 ? 'Any' : `${n}+`);

        return (
            <Popover panel="beds" anchor={anchor} className="p-5">
                <div className="-mt-1 flex justify-end">
                    <button
                        type="button"
                        className={RESET}
                        onClick={() => patch({ beds: 0, baths: 0 })}
                    >
                        <ResetIcon />
                        Reset
                    </button>
                </div>
                <p className={LABEL}>Bedrooms</p>
                <div className="flex flex-wrap gap-2">
                    {bedOptions.map((n) => (
                        <button
                            key={n}
                            type="button"
                            className={pillClass(filters.beds === n)}
                            onClick={() => patch({ beds: n })}
                        >
                            {pillLabel(n)}
                        </button>
                    ))}
                </div>
                <p className={cn(LABEL, 'mt-5')}>Bathrooms</p>
                <div className="flex flex-wrap gap-2">
                    {bathOptions.map((n) => (
                        <button
                            key={n}
                            type="button"
                            className={pillClass(filters.baths === n)}
                            onClick={() => patch({ baths: n })}
                        >
                            {pillLabel(n)}
                        </button>
                    ))}
                </div>
            </Popover>
        );
    }

    if (openPanel === 'sqft') {
        const a = filters.sqftMin ?? 500;
        const b = filters.sqftMax ?? 6000;
        const covSummary =
            (a <= 500 ? 'Any' : fmt('sqft', a)) + ' – ' + fmt('sqft', b);
        const lotSummary =
            (lotRange[0] <= 0 ? 'Any' : fmt('acre', lotRange[0])) +
            ' – ' +
            fmt('acre', lotRange[1]);

        return (
            <Popover panel="sqft" anchor={anchor} className="p-5">
                <div className="flex justify-end">
                    <button
                        type="button"
                        className={RESET}
                        onClick={() => {
                            patch({ sqftMin: null, sqftMax: null });
                            setLotRange([0, 5]);
                        }}
                    >
                        <ResetIcon />
                        Reset
                    </button>
                </div>
                <div className="mb-1 flex items-center justify-between">
                    <p className={cn(LABEL, '!mb-0')}>Covered Area</p>
                    <span className="text-[13px] font-semibold text-navy">
                        {covSummary}
                    </span>
                </div>
                <DualRangeSlider
                    min={500}
                    max={6000}
                    step={100}
                    value={[a, b]}
                    ends={['500 sf', '6,000+ sf']}
                    onChange={([na, nb]) =>
                        patch({
                            sqftMin: na <= 500 ? null : na,
                            sqftMax: nb >= 6000 ? null : nb,
                        })
                    }
                />
                <hr className="my-5 border-gray-100" />
                <div className="mb-1 flex items-center justify-between">
                    <p className={cn(LABEL, '!mb-0')}>Lot Area</p>
                    <span className="text-[13px] font-semibold text-navy">
                        {lotSummary}
                    </span>
                </div>
                <DualRangeSlider
                    min={0}
                    max={5}
                    step={0.25}
                    value={lotRange}
                    ends={['2,000 sf', '5+ ac']}
                    onChange={setLotRange}
                />
                <hr className="my-5 border-gray-100" />
                <label className={CHECK}>
                    <input type="checkbox" className="h-4 w-4 accent-navy" />
                    Lot Frontage &amp; Depth
                </label>
            </Popover>
        );
    }

    // openPanel === 'filters' — the big "All Filters" panel.
    const toggleType = (label: string) => {
        const has = filters.types.includes(label);
        patch({
            types: has
                ? filters.types.filter((t) => t !== label)
                : [...filters.types, label],
        });
    };

    return (
        <Popover
            panel="filters"
            anchor={anchor}
            className="flex max-h-[calc(100vh-90px)] flex-col overflow-hidden !shadow-2xl"
        >
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 px-5 py-4">
                <button
                    type="button"
                    className="text-gray-500 hover:text-navy"
                    onClick={onClose}
                >
                    <CloseIcon className="h-5 w-5" />
                </button>
                <h3 className="text-[17px] font-semibold text-navy">
                    All Filters
                </h3>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 px-5 py-5">
                <FilterCard title="Property Types">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className={pillClass(filters.types.length === 0)}
                            onClick={() => patch({ types: [] })}
                        >
                            All Property Types
                        </button>
                        {PROPERTY_TYPES.map((label) => (
                            <button
                                key={label}
                                type="button"
                                className={pillClass(
                                    filters.types.includes(label),
                                )}
                                onClick={() => toggleType(label)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </FilterCard>

                <FilterCard title="Parking / Garage">
                    <DecorativePills options={['1+', '2+', '3+', '4+', '5+']} />
                </FilterCard>

                <FilterCard title="Open House">
                    <DecorativePills
                        options={[
                            'Any Time',
                            'This Weekend',
                            'Within 3 days',
                            'Within 7 days',
                        ]}
                        defaultIndex={0}
                    />
                </FilterCard>

                <FilterCard title="Basement Type">
                    <DecorativePills options={BASEMENT_TYPES} />
                </FilterCard>
            </div>
            <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-white px-5 py-4">
                <button
                    type="button"
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-[14px] text-gray-700 hover:border-gray-400"
                    onClick={onResetAll}
                >
                    Reset All Filters
                </button>
                <button
                    type="button"
                    className={cn(APPLY, '!rounded-lg !px-6 !py-2.5')}
                    onClick={onClose}
                >
                    Show {resultCount.toLocaleString()} Results
                </button>
            </div>
        </Popover>
    );
}

function FilterCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-3 text-[15px] font-semibold text-navy">{title}</p>
            {children}
        </div>
    );
}

// Local-only pill group for the design-faithful sections of the All Filters
// panel that the original page rendered but did not actually filter on.
function DecorativePills({
    options,
    defaultIndex = -1,
}: {
    options: string[];
    defaultIndex?: number;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((label, i) => (
                <TogglePill
                    key={label}
                    label={label}
                    initial={i === defaultIndex}
                />
            ))}
        </div>
    );
}

function TogglePill({ label, initial }: { label: string; initial: boolean }) {
    const [active, setActive] = useState(initial);

    return (
        <button
            type="button"
            className={pillClass(active)}
            onClick={() => setActive((v) => !v)}
        >
            {label}
        </button>
    );
}
