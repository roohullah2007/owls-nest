import { NewListingFormData, OpenHouse } from '../NewListingModal';
import { Field, INPUT_CLASS, SELECT_CLASS, TEXTAREA_CLASS, SectionTitle } from './fields';
import { HOA_FREQUENCY_OPTIONS } from './featureOptions';

interface Props {
    data: NewListingFormData;
    setData: (key: keyof NewListingFormData, value: any) => void;
    errors: Record<string, string>;
    listingTypes: string[];
}

function capitalize(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Subtypes available per listing type. Falls back to no subtype dropdown
// for types not listed here.
const SUBTYPES_BY_TYPE: Record<string, { value: string; label: string }[]> = {
    residential: [
        { value: 'single_family', label: 'Single Family' },
        { value: 'condo', label: 'Condo' },
        { value: 'townhouse', label: 'Townhouse' },
        { value: 'multi_family', label: 'Multi-Family' },
        { value: 'apartment', label: 'Apartment' },
    ],
    commercial: [
        { value: 'office', label: 'Office' },
        { value: 'retail', label: 'Retail' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'mixed_use', label: 'Mixed Use' },
    ],
    land: [
        { value: 'residential_lot', label: 'Residential Lot' },
        { value: 'agricultural', label: 'Agricultural' },
        { value: 'commercial_lot', label: 'Commercial Lot' },
    ],
};

const EMPTY_OPEN_HOUSE: OpenHouse = { date: '', start: '', end: '', notes: '' };

export default function PropertyDetailsTab({ data, setData, errors, listingTypes }: Props) {
    const subtypes = SUBTYPES_BY_TYPE[data.listing_type] ?? [];

    function addOpenHouse() {
        setData('open_houses', [...data.open_houses, { ...EMPTY_OPEN_HOUSE }]);
    }
    function updateOpenHouse(idx: number, key: keyof OpenHouse, value: string) {
        const next = data.open_houses.map((oh, i) => (i === idx ? { ...oh, [key]: value } : oh));
        setData('open_houses', next);
    }
    function removeOpenHouse(idx: number) {
        setData(
            'open_houses',
            data.open_houses.filter((_, i) => i !== idx),
        );
    }

    return (
        <div className="space-y-5">
            <SectionTitle>Property details</SectionTitle>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Property type" required error={errors.listing_type}>
                    <select
                        value={data.listing_type}
                        onChange={(e) => {
                            setData('listing_type', e.target.value);
                            setData('property_subtype', '');
                        }}
                        className={SELECT_CLASS}
                    >
                        {listingTypes.map((t) => (
                            <option key={t} value={t}>
                                {capitalize(t)}
                            </option>
                        ))}
                    </select>
                </Field>
                {subtypes.length > 0 && (
                    <Field label="Property subtype" error={errors['features.property_subtype']}>
                        <select
                            value={data.property_subtype}
                            onChange={(e) => setData('property_subtype', e.target.value)}
                            className={SELECT_CLASS}
                        >
                            <option value="">Select subtype…</option>
                            {subtypes.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Beds" error={errors.bedrooms}>
                    <input
                        type="number"
                        min="0"
                        value={data.bedrooms}
                        onChange={(e) => setData('bedrooms', e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="Full baths" error={errors['features.full_baths']}>
                    <input
                        type="number"
                        min="0"
                        value={data.full_baths}
                        onChange={(e) => setData('full_baths', e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="Half baths" error={errors['features.half_baths']}>
                    <input
                        type="number"
                        min="0"
                        value={data.half_baths}
                        onChange={(e) => setData('half_baths', e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Field label="Property size (sqft)" error={errors.sqft}>
                    <input
                        type="number"
                        min="0"
                        value={data.sqft}
                        onChange={(e) => setData('sqft', e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="Lot size (acres)" error={errors.lot_size}>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.lot_size}
                        onChange={(e) => setData('lot_size', e.target.value)}
                        placeholder="0.00"
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="Year built" error={errors.year_built}>
                    <input
                        type="number"
                        min="1800"
                        max="2100"
                        value={data.year_built}
                        onChange={(e) => setData('year_built', e.target.value)}
                        placeholder="e.g. 2005"
                        className={INPUT_CLASS}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Stories" error={errors['features.stories']}>
                    <input
                        type="number"
                        min="0"
                        value={data.stories}
                        onChange={(e) => setData('stories', e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="Parking spaces" error={errors['features.parking_spaces']}>
                    <input
                        type="number"
                        min="0"
                        value={data.parking_spaces}
                        onChange={(e) => setData('parking_spaces', e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="Garage spaces" error={errors['features.garage_spaces']}>
                    <input
                        type="number"
                        min="0"
                        value={data.garage_spaces}
                        onChange={(e) => setData('garage_spaces', e.target.value)}
                        placeholder="0"
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="HOA fee" error={errors['features.hoa_fee']}>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8B9096]">$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={data.hoa_fee}
                            onChange={(e) => setData('hoa_fee', e.target.value)}
                            placeholder="0.00"
                            className={`${INPUT_CLASS} pl-7`}
                        />
                    </div>
                </Field>
            </div>

            {/* Community & financials — MLS-aligned detail fields */}
            <div className="space-y-3 pt-2 border-t border-[#F3F4F6]">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">
                    Community &amp; financials
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Subdivision / Community" error={errors['features.subdivision']}>
                        <input
                            type="text"
                            value={data.subdivision}
                            onChange={(e) => setData('subdivision', e.target.value)}
                            placeholder="e.g. Brickell Key"
                            className={INPUT_CLASS}
                        />
                    </Field>
                    <Field label="County / MLS area" error={errors['features.mls_area']}>
                        <input
                            type="text"
                            value={data.mls_area}
                            onChange={(e) => setData('mls_area', e.target.value)}
                            placeholder="e.g. Miami-Dade County"
                            className={INPUT_CLASS}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="HOA / association name" error={errors['features.hoa_name']}>
                        <input
                            type="text"
                            value={data.hoa_name}
                            onChange={(e) => setData('hoa_name', e.target.value)}
                            placeholder="e.g. Courvoisier Courts HOA"
                            className={INPUT_CLASS}
                        />
                    </Field>
                    <Field label="HOA fee frequency" error={errors['features.hoa_frequency']}>
                        <select
                            value={data.hoa_frequency}
                            onChange={(e) => setData('hoa_frequency', e.target.value)}
                            className={SELECT_CLASS}
                        >
                            {HOA_FREQUENCY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Annual taxes" error={errors['features.tax_annual_amount']}>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8B9096]">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.tax_annual_amount}
                                onChange={(e) => setData('tax_annual_amount', e.target.value)}
                                placeholder="0.00"
                                className={`${INPUT_CLASS} pl-7`}
                            />
                        </div>
                    </Field>
                    <Field label="Tax year" error={errors['features.tax_year']}>
                        <input
                            type="number"
                            min="1800"
                            max="2100"
                            value={data.tax_year}
                            onChange={(e) => setData('tax_year', e.target.value)}
                            placeholder="e.g. 2025"
                            className={INPUT_CLASS}
                        />
                    </Field>
                </div>
            </div>

            {/* Open Houses */}
            <div className="space-y-2 pt-2 border-t border-[#F3F4F6]">
                <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-[#5F656D] tracking-wider">
                        Open Houses
                    </label>
                    <button
                        type="button"
                        onClick={addOpenHouse}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF]"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add open house
                    </button>
                </div>
                {data.open_houses.length === 0 ? (
                    <p className="text-xs text-[#8B9096]">No open houses scheduled.</p>
                ) : (
                    <div className="space-y-2">
                        {data.open_houses.map((oh, idx) => (
                            <div
                                key={idx}
                                className="grid grid-cols-12 gap-2 items-start p-2.5 bg-[#FAFBFC] border border-[#E4E7EB] rounded-lg"
                            >
                                <div className="col-span-12 sm:col-span-3">
                                    <input
                                        type="date"
                                        value={oh.date}
                                        onChange={(e) => updateOpenHouse(idx, 'date', e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>
                                <div className="col-span-6 sm:col-span-2">
                                    <input
                                        type="time"
                                        value={oh.start}
                                        onChange={(e) => updateOpenHouse(idx, 'start', e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>
                                <div className="col-span-6 sm:col-span-2">
                                    <input
                                        type="time"
                                        value={oh.end}
                                        onChange={(e) => updateOpenHouse(idx, 'end', e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </div>
                                <div className="col-span-11 sm:col-span-4">
                                    <input
                                        type="text"
                                        value={oh.notes}
                                        onChange={(e) => updateOpenHouse(idx, 'notes', e.target.value)}
                                        placeholder="Notes (optional)"
                                        className={INPUT_CLASS}
                                    />
                                </div>
                                <div className="col-span-1 flex justify-end pt-1">
                                    <button
                                        type="button"
                                        onClick={() => removeOpenHouse(idx)}
                                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2]"
                                        title="Remove"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Field label="Description" error={errors.description}>
                <textarea
                    rows={5}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Highlights, condition, neighborhood, etc."
                    className={TEXTAREA_CLASS}
                />
            </Field>
        </div>
    );
}
