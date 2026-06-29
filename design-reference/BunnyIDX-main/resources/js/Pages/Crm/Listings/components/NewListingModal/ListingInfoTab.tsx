import { NewListingFormData } from '../NewListingModal';
import { Field, INPUT_CLASS, SELECT_CLASS, SectionTitle } from './fields';

interface Contact {
    id: number;
    first_name: string;
    last_name: string;
}
interface Deal {
    id: number;
    title: string;
}
interface Tag {
    id: number;
    name: string;
    color: string;
}

interface Props {
    data: NewListingFormData;
    setData: (key: keyof NewListingFormData, value: any) => void;
    errors: Record<string, string>;
    listingTypes: string[];
    listingStatuses: string[];
    contacts: Contact[];
    deals: Deal[];
    tags: Tag[];
}

function capitalize(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const LISTING_CATEGORIES = [
    { value: 'for_sale', label: 'For Sale' },
    { value: 'for_rent', label: 'For Rent' },
    { value: 'sold', label: 'Sold' },
    { value: 'coming_soon', label: 'Coming Soon' },
];

export default function ListingInfoTab({
    data,
    setData,
    errors,
    listingTypes,
    listingStatuses,
    contacts,
    deals,
    tags,
}: Props) {
    function toggleTag(id: number) {
        const next = data.tags.includes(id) ? data.tags.filter((t) => t !== id) : [...data.tags, id];
        setData('tags', next);
    }

    return (
        <div className="space-y-5">
            <SectionTitle>Listing details</SectionTitle>

            <Field label="Title" required error={errors.title}>
                <input
                    type="text"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    placeholder="e.g. 4-Bed Lakeview Home"
                    className={INPUT_CLASS}
                />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Transaction type" error={errors['features.listing_category']}>
                    <select
                        value={data.listing_category}
                        onChange={(e) => setData('listing_category', e.target.value)}
                        className={SELECT_CLASS}
                    >
                        {LISTING_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Status" required error={errors.status}>
                    <select
                        value={data.status}
                        onChange={(e) => setData('status', e.target.value)}
                        className={SELECT_CLASS}
                    >
                        {listingStatuses.map((s) => (
                            <option key={s} value={s}>
                                {capitalize(s)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Price" error={errors.price}>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8B9096]">$</span>
                        <input
                            type="number"
                            value={data.price}
                            onChange={(e) => setData('price', e.target.value)}
                            placeholder="0"
                            min="0"
                            className={`${INPUT_CLASS} pl-7`}
                        />
                    </div>
                </Field>
                <Field label="MLS number" error={errors.mls_number}>
                    <input
                        type="text"
                        value={data.mls_number}
                        onChange={(e) => setData('mls_number', e.target.value)}
                        className={INPUT_CLASS}
                    />
                </Field>
                <Field label="Listed date" error={errors.listed_at}>
                    <input
                        type="date"
                        value={data.listed_at}
                        onChange={(e) => setData('listed_at', e.target.value)}
                        className={INPUT_CLASS}
                    />
                </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Linked contact" error={errors.contact_id}>
                    <select
                        value={data.contact_id}
                        onChange={(e) => setData('contact_id', e.target.value)}
                        className={SELECT_CLASS}
                    >
                        <option value="">None</option>
                        {contacts.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.first_name} {c.last_name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Linked deal" error={errors.deal_id}>
                    <select
                        value={data.deal_id}
                        onChange={(e) => setData('deal_id', e.target.value)}
                        className={SELECT_CLASS}
                    >
                        <option value="">None</option>
                        {deals.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.title}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            {tags.length > 0 && (
                <div>
                    <label className="block text-[11px] font-semibold text-[#5F656D] tracking-wider mb-1.5">
                        Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => {
                            const selected = data.tags.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    className={`inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-[4px] border transition-colors ${
                                        selected
                                            ? 'border-transparent text-white'
                                            : 'border-[#E4E7EB] text-[#5F656D] hover:bg-[#F9FAFB]'
                                    }`}
                                    style={selected ? { backgroundColor: tag.color } : undefined}
                                >
                                    {tag.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
