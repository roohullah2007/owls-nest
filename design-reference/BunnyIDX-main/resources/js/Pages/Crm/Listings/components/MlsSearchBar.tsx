import { FormEvent, useMemo, useState } from 'react';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import Select from '@/Components/Crm/Select';
import Combobox from '@/Components/Crm/Combobox';
import type { IdxConnection } from '../types';
import { MLS_MAX_PRICE_OPTIONS, MLS_MIN_PRICE_OPTIONS } from '../utils';

interface Props {
    // Connections
    idxConnections: IdxConnection[];
    connectionId: number;
    onChangeConnection: (id: number) => void;
    // Quick-search filters
    query: string;
    setQuery: (v: string) => void;
    city: string;
    setCity: (v: string) => void;
    minPrice: string;
    setMinPrice: (v: string) => void;
    maxPrice: string;
    setMaxPrice: (v: string) => void;
    minBeds: string;
    setMinBeds: (v: string) => void;
    minBaths: string;
    setMinBaths: (v: string) => void;
    // Autocomplete sources
    cities: string[];
    addresses: string[];
    // Submit / advanced filter modal trigger
    onSubmit: () => void;
    onOpenFiltersModal: () => void;
    advancedFilterCount: number;
    searching: boolean;
}

const BED_OPTS = [['', 'Beds'], ['1', '1+ Bed'], ['2', '2+ Bed'], ['3', '3+ Bed'], ['4', '4+ Bed'], ['5', '5+ Bed']]
    .map(([value, label]) => ({ value, label }));
const BATH_OPTS = [['', 'Baths'], ['1', '1+ Bath'], ['2', '2+ Bath'], ['3', '3+ Bath'], ['4', '4+ Bath'], ['5', '5+ Bath']]
    .map(([value, label]) => ({ value, label }));

/**
 * The MLS search/filter row above the results — connection picker,
 * search-with-address-autocomplete, city-with-autocomplete, Min/Max price,
 * Beds/Baths, the "All Filters" modal trigger, and the Search submit.
 *
 * Owns its own `addressFocused` / `cityFocused` UI flags and derives the
 * filtered-suggestion arrays from `addresses` / `cities` so the parent
 * doesn't need to keep those memos in scope.
 */
export default function MlsSearchBar({
    idxConnections, connectionId, onChangeConnection,
    query, setQuery, city, setCity,
    minPrice, setMinPrice, maxPrice, setMaxPrice,
    minBeds, setMinBeds, minBaths, setMinBaths,
    cities, addresses,
    onSubmit, onOpenFiltersModal,
    advancedFilterCount, searching,
}: Props) {
    const [addressFocused, setAddressFocused] = useState(false);
    const [cityFocused, setCityFocused] = useState(false);

    const filteredAddresses = useMemo(() => {
        if (query.length < 2) return [];
        const q = query.toLowerCase();
        return addresses.filter((a) => a.toLowerCase().includes(q)).slice(0, 5);
    }, [addresses, query]);

    const filteredCities = useMemo(() => {
        if (city.length < 1) return [];
        const q = city.toLowerCase();
        return cities.filter((c) => c.toLowerCase().includes(q)).slice(0, 5);
    }, [cities, city]);

    const handleSubmit = (e: FormEvent) => { e.preventDefault(); onSubmit(); };

    return (
        <div className="mb-3">
            <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
                {idxConnections.length > 1 && (
                    <Select
                        className="shrink-0"
                        triggerClassName="text-xs text-[#5F656D]"
                        value={String(connectionId)}
                        onChange={(v) => onChangeConnection(Number(v))}
                        options={[
                            // 0 = no connection scope — the gateway fans out
                            // across every connected MLS and merges results.
                            { value: '0', label: 'All MLSes' },
                            ...idxConnections.map((c) => ({ value: String(c.id), label: c.display_name })),
                        ]}
                    />
                )}

                {/* Address search with autocomplete */}
                <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9096] pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setAddressFocused(true)}
                        onBlur={() => setTimeout(() => setAddressFocused(false), 150)}
                        placeholder="Search address, MLS#..."
                        className="h-9 w-full pl-9 pr-3 text-xs bg-white text-[#303030] placeholder-[#8B9096] border border-[#C8CCD1] rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] transition-colors"
                        autoComplete="off"
                    />
                    {addressFocused && filteredAddresses.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-[1001] mt-1 bg-white border border-[#E4E7EB] rounded-lg shadow-lg">
                            {filteredAddresses.map((addr, i) => (
                                <SuggestionRow
                                    key={i}
                                    label={addr}
                                    onSelect={() => { setQuery(addr); setAddressFocused(false); }}
                                    icon={(
                                        <svg className="h-3.5 w-3.5 text-[#8B9096] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                        </svg>
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* City with autocomplete */}
                <div className="hidden md:block relative shrink-0">
                    <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        onFocus={() => setCityFocused(true)}
                        onBlur={() => setTimeout(() => setCityFocused(false), 150)}
                        placeholder="City"
                        className="h-9 w-28 px-3 text-xs bg-white text-[#303030] placeholder-[#8B9096] border border-[#C8CCD1] rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] transition-colors"
                        autoComplete="off"
                    />
                    {cityFocused && filteredCities.length > 0 && (
                        <div className="absolute top-full left-0 z-[1001] mt-1 bg-white border border-[#E4E7EB] rounded-lg shadow-lg min-w-[160px]">
                            {filteredCities.map((c) => (
                                <SuggestionRow
                                    key={c}
                                    label={c}
                                    onSelect={() => { setCity(c); setCityFocused(false); }}
                                    icon={(
                                        <svg className="h-3 w-3 text-[#8B9096] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                                        </svg>
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Min/Max price */}
                <div className="hidden lg:flex items-center gap-2 shrink-0">
                    <Combobox
                        className="w-24"
                        inputClassName="!text-xs !text-[#5F656D]"
                        value={minPrice}
                        onChange={setMinPrice}
                        placeholder="Min $"
                        inputMode="numeric"
                        suggestions={MLS_MIN_PRICE_OPTIONS}
                    />
                    <Combobox
                        className="w-24"
                        inputClassName="!text-xs !text-[#5F656D]"
                        value={maxPrice}
                        onChange={setMaxPrice}
                        placeholder="Max $"
                        inputMode="numeric"
                        suggestions={MLS_MAX_PRICE_OPTIONS}
                    />
                </div>

                <Select
                    className="hidden xl:inline-block shrink-0"
                    triggerClassName="text-xs text-[#5F656D]"
                    value={minBeds}
                    onChange={setMinBeds}
                    options={BED_OPTS}
                />

                <Select
                    className="hidden xl:inline-block shrink-0"
                    triggerClassName="text-xs text-[#5F656D]"
                    value={minBaths}
                    onChange={setMinBaths}
                    options={BATH_OPTS}
                />

                <button
                    type="button"
                    onClick={onOpenFiltersModal}
                    className={`flex items-center h-9 px-3 gap-1.5 text-xs font-medium bg-white border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] transition-colors shrink-0 ${
                        advancedFilterCount > 0 ? 'text-[#1693C9]' : 'text-[#5F656D]'
                    }`}
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                    </svg>
                    Filters
                    {advancedFilterCount > 0 && (
                        <span className="flex items-center justify-center w-4 h-4 text-[10px] font-semibold bg-[#1693C9] text-white rounded-full">{advancedFilterCount}</span>
                    )}
                </button>

                <PrimaryButton
                    type="submit"
                    disabled={searching}
                    label={searching ? 'Loading...' : 'Search'}
                    icon={null}
                    labelClassName=""
                />
            </form>
        </div>
    );
}

function SuggestionRow({ label, onSelect, icon }: { label: string; onSelect: () => void; icon: React.ReactNode }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSelect}
            className="w-full text-left px-3 py-2 text-xs text-[#5F656D] hover:bg-[#F3F4F6] flex items-center gap-2.5 transition-colors first:rounded-t-lg last:rounded-lg"
        >
            {icon}
            <span className="truncate">{label}</span>
        </button>
    );
}
