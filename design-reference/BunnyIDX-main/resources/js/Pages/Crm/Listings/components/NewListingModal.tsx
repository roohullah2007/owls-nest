import { useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import LocationTab, { LocationState } from './NewListingModal/LocationTab';
import ListingInfoTab from './NewListingModal/ListingInfoTab';
import MediaTab from './NewListingModal/MediaTab';
import PropertyDetailsTab from './NewListingModal/PropertyDetailsTab';
import FeaturesTab from './NewListingModal/FeaturesTab';
import { buildAmenities } from './NewListingModal/featureOptions';
import type { Listing } from '../types';
import { formatStatusLabel } from '../utils';

export type OpenHouse = {
    date: string;
    start: string;
    end: string;
    notes?: string;
};

export type NewListingFormData = {
    // Location
    address: string;
    unit: string;
    city: string;
    state_province: string;
    postal_code: string;
    country: string;
    // Listing info
    title: string;
    listing_type: string;
    status: string;
    price: string;
    mls_number: string;
    listed_at: string;
    contact_id: string;
    deal_id: string;
    tags: number[];
    // Media
    photos: File[];
    virtual_tour_url: string;
    // Property details
    bedrooms: string;
    full_baths: string;
    half_baths: string;
    sqft: string;
    lot_size: string;
    year_built: string;
    stories: string;
    parking_spaces: string;
    garage_spaces: string;
    hoa_fee: string;
    description: string;
    property_subtype: string;
    listing_category: string;
    open_houses: OpenHouse[];
    // Community & financials (MLS-aligned)
    subdivision: string;
    mls_area: string;
    hoa_name: string;
    hoa_frequency: string;
    tax_annual_amount: string;
    tax_year: string;
    // Features & amenities
    pool: boolean;
    waterfront: boolean;
    new_construction: boolean;
    furnished: string;
    view: string[];
    appliances: string[];
    heating: string[];
    cooling: string[];
    flooring: string[];
    exterior_features: string[];
    security_features: string[];
    custom_features: string[];
    // Location lat/lng (from Google Places)
    lat: number | null;
    lng: number | null;
};

const TABS = [
    { key: 'location', label: 'Location' },
    { key: 'info', label: 'Listing Information' },
    { key: 'media', label: 'Media' },
    { key: 'details', label: 'Property Details' },
    { key: 'features', label: 'Features' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

interface Contact { id: number; first_name: string; last_name: string }
interface Deal { id: number; title: string }
interface Tag { id: number; name: string; color: string }

interface Props {
    isOpen: boolean;
    onClose: () => void;
    listingTypes: string[];
    listingStatuses: string[];
    contacts: Contact[];
    deals: Deal[];
    tags: Tag[];
    googleMapsApiKey: string | null;
    /** When present, the modal opens in view mode populated from this listing. */
    listing?: Listing | null;
    /** Force view-only (no Edit button). Used for MLS feed listings that can't be saved back. */
    readOnly?: boolean;
    /** Website editor embed: flag the new listing for a site section and stay on the page. */
    presetWebsiteSection?: 'featured' | 'sold';
    /** Called after a successful save (in addition to the default reload). */
    onSaved?: () => void;
}

const EMPTY_FORM: NewListingFormData = {
    address: '',
    unit: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'US',
    title: '',
    listing_type: '',
    status: 'active',
    price: '',
    mls_number: '',
    listed_at: '',
    contact_id: '',
    deal_id: '',
    tags: [],
    photos: [],
    virtual_tour_url: '',
    bedrooms: '',
    full_baths: '',
    half_baths: '',
    sqft: '',
    lot_size: '',
    year_built: '',
    stories: '',
    parking_spaces: '',
    garage_spaces: '',
    hoa_fee: '',
    description: '',
    property_subtype: '',
    listing_category: 'for_sale',
    open_houses: [],
    subdivision: '',
    mls_area: '',
    hoa_name: '',
    hoa_frequency: '',
    tax_annual_amount: '',
    tax_year: '',
    pool: false,
    waterfront: false,
    new_construction: false,
    furnished: '',
    view: [],
    appliances: [],
    heating: [],
    cooling: [],
    flooring: [],
    exterior_features: [],
    security_features: [],
    custom_features: [],
    lat: null,
    lng: null,
};

function capitalize(s: string): string {
    return s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

function formatListingPrice(price: string | number | null | undefined): string {
    if (price === null || price === undefined || price === '') return '—';
    const n = typeof price === 'number' ? price : parseFloat(price);
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(n);
}

function hydrateFromListing(listing: Listing): NewListingFormData {
    const f = listing.features || {};
    return {
        ...EMPTY_FORM,
        listing_type: listing.listing_type,
        status: listing.status,
        title: listing.title,
        address: listing.address ?? '',
        unit: listing.unit ?? '',
        city: listing.city ?? '',
        state_province: listing.state_province ?? '',
        postal_code: listing.postal_code ?? '',
        country: listing.country ?? 'US',
        mls_number: listing.mls_number ?? '',
        price: listing.price ?? '',
        bedrooms: listing.bedrooms != null ? String(listing.bedrooms) : '',
        full_baths: f.full_baths != null ? String(f.full_baths) : '',
        half_baths: f.half_baths != null ? String(f.half_baths) : '',
        sqft: listing.sqft != null ? String(listing.sqft) : '',
        lot_size: listing.lot_size ?? '',
        year_built: listing.year_built != null ? String(listing.year_built) : '',
        stories: f.stories != null ? String(f.stories) : '',
        parking_spaces: f.parking_spaces != null ? String(f.parking_spaces) : '',
        garage_spaces: f.garage_spaces != null ? String(f.garage_spaces) : '',
        hoa_fee: f.hoa_fee != null ? String(f.hoa_fee) : '',
        description: listing.description ?? '',
        contact_id: listing.contact_id != null ? String(listing.contact_id) : '',
        deal_id: listing.deal_id != null ? String(listing.deal_id) : '',
        listed_at: listing.listed_at ?? '',
        tags: (listing.tags ?? []).map((t) => t.id),
        photos: [],
        virtual_tour_url: f.virtual_tour_url ?? '',
        property_subtype: f.property_subtype ?? '',
        listing_category: f.listing_category ?? 'for_sale',
        open_houses: f.open_houses ?? [],
        subdivision: f.subdivision ?? '',
        mls_area: f.mls_area ?? '',
        hoa_name: f.hoa_name ?? '',
        hoa_frequency: f.hoa_frequency ?? '',
        tax_annual_amount: f.tax_annual_amount != null ? String(f.tax_annual_amount) : '',
        tax_year: f.tax_year != null ? String(f.tax_year) : '',
        pool: !!f.pool,
        waterfront: !!f.waterfront,
        new_construction: !!f.new_construction,
        furnished: f.furnished ?? '',
        view: f.view ?? [],
        appliances: f.appliances ?? [],
        heating: f.heating ?? [],
        cooling: f.cooling ?? [],
        flooring: f.flooring ?? [],
        exterior_features: f.exterior_features ?? [],
        security_features: f.security_features ?? [],
        custom_features: f.custom_features ?? [],
        lat: f.lat ?? null,
        lng: f.lng ?? null,
    };
}

export default function NewListingModal({
    isOpen,
    onClose,
    listingTypes,
    listingStatuses,
    contacts,
    deals,
    tags,
    googleMapsApiKey,
    listing,
    readOnly = false,
    presetWebsiteSection,
    onSaved,
}: Props) {
    const [tab, setTab] = useState<TabKey>('location');
    const isExisting = !!listing;
    // Editing an existing listing should start in edit mode by default;
    // readOnly callers can still force the read-only view.
    const [viewMode, setViewMode] = useState<boolean>(readOnly && isExisting);
    const form = useForm<NewListingFormData>({
        ...EMPTY_FORM,
        listing_type: listingTypes[0] || 'residential',
    });
    const { data, setData, processing, errors, reset, clearErrors, transform } = form;

    // Reshape the flat UI state into the nested payload the controller expects.
    // Set the callback once on mount — Inertia's transform() reads `this.data`
    // at submit time, so the callback doesn't need to be re-bound when data changes.
    useEffect(() => {
        transform((d) => {
            const amenities = buildAmenities(d);
            const features: Record<string, unknown> = {
                listing_category: d.listing_category || undefined,
                property_subtype: d.property_subtype || undefined,
                full_baths: d.full_baths || undefined,
                half_baths: d.half_baths || undefined,
                stories: d.stories || undefined,
                parking_spaces: d.parking_spaces || undefined,
                garage_spaces: d.garage_spaces || undefined,
                hoa_fee: d.hoa_fee || undefined,
                virtual_tour_url: d.virtual_tour_url || undefined,
                lat: d.lat ?? undefined,
                lng: d.lng ?? undefined,
                open_houses: d.open_houses.length > 0 ? d.open_houses : undefined,
                // Community & financials
                subdivision: d.subdivision || undefined,
                mls_area: d.mls_area || undefined,
                hoa_name: d.hoa_name || undefined,
                hoa_frequency: d.hoa_frequency || undefined,
                tax_annual_amount: d.tax_annual_amount || undefined,
                tax_year: d.tax_year || undefined,
                // Features & amenities — structured (for edit round-trip)
                pool: d.pool || undefined,
                waterfront: d.waterfront || undefined,
                new_construction: d.new_construction || undefined,
                furnished: d.furnished || undefined,
                view: d.view.length ? d.view : undefined,
                appliances: d.appliances.length ? d.appliances : undefined,
                heating: d.heating.length ? d.heating : undefined,
                cooling: d.cooling.length ? d.cooling : undefined,
                flooring: d.flooring.length ? d.flooring : undefined,
                exterior_features: d.exterior_features.length ? d.exterior_features : undefined,
                security_features: d.security_features.length ? d.security_features : undefined,
                custom_features: d.custom_features.length ? d.custom_features : undefined,
                // Flat, deduped list the public site + listing detail render directly.
                amenities: amenities.length ? amenities : undefined,
            };
            const cleanFeatures = Object.fromEntries(
                Object.entries(features).filter(([, v]) => v !== undefined && v !== ''),
            );
            const out: Record<string, unknown> = {
                listing_type: d.listing_type,
                status: d.status,
                title: d.title,
                address: d.address,
                unit: d.unit,
                city: d.city,
                state_province: d.state_province,
                postal_code: d.postal_code,
                country: d.country,
                mls_number: d.mls_number,
                price: d.price,
                bedrooms: d.bedrooms,
                sqft: d.sqft,
                lot_size: d.lot_size,
                year_built: d.year_built,
                description: d.description,
                contact_id: d.contact_id,
                deal_id: d.deal_id,
                listed_at: d.listed_at,
                tags: d.tags,
                photos: d.photos,
                features: cleanFeatures,
            };
            // When method-spoofing for PATCH on the update endpoint, pass _method through.
            const method = (d as any)._method;
            if (method) out._method = method;
            // Website-editor embed: tag the listing for a site section and keep
            // the user on the current page instead of redirecting to the listing.
            if (presetWebsiteSection && !method) {
                out.website_section = presetWebsiteSection;
                out.stay = 1;
            }
            return out as unknown as NewListingFormData;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setTab('location');
        if (listing) {
            // Existing listing: hydrate every field at once so React doesn't
            // re-render between partial setData() calls and lose state.
            form.setData(hydrateFromListing(listing));
            setViewMode(readOnly);
        } else {
            reset();
            setData('listing_type', listingTypes[0] || 'residential');
            setViewMode(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, listing?.id]);

    if (!isOpen) return null;

    function handleClose() {
        reset();
        clearErrors();
        onClose();
    }

    function handleSave() {
        // Auto-fill title from address if user left it blank
        if (!data.title.trim() && data.address) {
            setData('title', [data.address, data.unit].filter(Boolean).join(' '));
        }
        const onError = (errs: Record<string, string>) => {
            const tabForField = fieldToTab();
            for (const key of Object.keys(errs)) {
                const t = tabForField[key.split('.')[0]] ?? tabForField[key];
                if (t) {
                    setTab(t);
                    break;
                }
            }
        };
        const onSuccess = () => {
            handleClose();
            router.reload({ only: ['listings'] });
            onSaved?.();
        };
        if (listing) {
            // PATCH with files isn't supported natively; let Laravel method-spoof.
            // The form's transform() runs before the request and already nests features.
            // The data object also picks up _method via setData below.
            setData('_method' as any, 'patch');
            form.post(route('crm.listings.update', listing.id), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess,
                onError,
            });
        } else {
            form.post(route('crm.listings.store'), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess,
                onError,
            });
        }
    }

    const errorTabs = computeErrorTabs(errors);
    const currentTabIdx = TABS.findIndex((t) => t.key === tab);
    const isLastTab = currentTabIdx === TABS.length - 1;
    const isFirstTab = currentTabIdx === 0;

    const footer = (
        <div className="flex items-center justify-between gap-2 w-full">
            <button
                type="button"
                onClick={handleClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                {viewMode ? 'Close' : 'Cancel'}
            </button>

            <div className="flex items-center gap-2">
                {!viewMode && (
                    <button
                        type="button"
                        onClick={() => !isFirstTab && setTab(TABS[currentTabIdx - 1].key)}
                        disabled={isFirstTab}
                        className="h-8 px-4 inline-flex items-center text-[12px] font-medium text-[#5F656D] hover:text-[#111315] border border-[#C8CCD1] rounded hover:bg-[#F3F4F6] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                    >
                        ← Back
                    </button>
                )}
                {viewMode ? (
                    readOnly ? null : (
                        <PrimaryButton
                            label="Edit"
                            onClick={() => setViewMode(false)}
                            icon={
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                            }
                            labelClassName=""
                        />
                    )
                ) : isLastTab ? (
                    <PrimaryButton
                        label={processing ? 'Saving…' : listing ? 'Save Changes' : 'Save Listing'}
                        onClick={handleSave}
                        disabled={processing}
                        icon={null}
                        labelClassName=""
                    />
                ) : (
                    <PrimaryButton
                        label="Next →"
                        onClick={() => setTab(TABS[currentTabIdx + 1].key)}
                        icon={null}
                        labelClassName=""
                    />
                )}
            </div>
        </div>
    );

    return (
        <SlideOverModal title={listing ? 'Listing' : 'Add New Listing'} onClose={handleClose} footer={footer} width={720}>
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Existing listing summary banner */}
                {listing && (() => {
                    const cover = listing.photos?.[0];
                    const fullAddress = [listing.address, listing.city, listing.state_province, listing.postal_code].filter(Boolean).join(', ');
                    const headline = fullAddress || listing.title;
                    return (
                        <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E4E7EB] bg-[#FAFBFC] shrink-0">
                            <div className="h-14 w-20 shrink-0 rounded-[4px] overflow-hidden bg-[#F3F4F6] border border-[#E4E7EB]">
                                {cover ? (
                                    <img src={cover} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[#C4C9D1]">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-base font-semibold text-[#111315] tabular-nums">
                                        {formatListingPrice(listing.price)}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full bg-[#F3F4F6] text-[#5F656D]">
                                        {capitalize(listing.listing_type)}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full bg-[#EFF6FF] text-[#1693C9]">
                                        {formatStatusLabel(listing.status)}
                                    </span>
                                </div>
                                {(listing.bedrooms != null || listing.bathrooms != null || listing.sqft != null) && (
                                    <div className="mt-0.5 flex items-center gap-2.5 text-xs text-[#5F656D]">
                                        {listing.bedrooms != null && (
                                            <span className="inline-flex items-center gap-1">
                                                <svg className="h-3.5 w-3.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12V6.75A.75.75 0 0 1 3.75 6h4.5A.75.75 0 0 1 9 6.75V12m12 0V6.75A.75.75 0 0 0 20.25 6h-4.5a.75.75 0 0 0-.75.75V12m6 0H3m18 0v5.25m-18 -5.25v5.25" /></svg>
                                                {listing.bedrooms} bd
                                            </span>
                                        )}
                                        {listing.bathrooms != null && (
                                            <span className="inline-flex items-center gap-1">
                                                <svg className="h-3.5 w-3.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6V9M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21M5.25 4.5h13.5a1.5 1.5 0 0 1 1.5 1.5v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V6a1.5 1.5 0 0 1 1.5-1.5Z" /></svg>
                                                {listing.bathrooms} ba
                                            </span>
                                        )}
                                        {listing.sqft != null && (
                                            <span className="inline-flex items-center gap-1">
                                                <svg className="h-3.5 w-3.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5h16.5M7.5 7.5v9h9" /></svg>
                                                {listing.sqft.toLocaleString()} sqft
                                            </span>
                                        )}
                                    </div>
                                )}
                                {headline && (
                                    <p className="mt-0.5 text-[12px] text-[#8B9096] truncate inline-flex items-center gap-1">
                                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                                        <span className="truncate">{headline}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Tab bar */}
                <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-[#E4E7EB] shrink-0">
                    {TABS.map((t, i) => {
                        const isActive = tab === t.key;
                        const hasError = errorTabs.has(t.key);
                        return (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setTab(t.key)}
                                className={`relative inline-flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-xs font-medium transition-colors border-b-2 -mb-px ${
                                    isActive
                                        ? 'text-[#111315] border-[#1693C9]'
                                        : 'text-[#5F656D] border-transparent hover:text-[#111315]'
                                }`}
                            >
                                <span
                                    className={`inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-semibold rounded-full ${
                                        isActive ? 'bg-[#1693C9] text-white' : 'bg-[#F3F4F6] text-[#5F656D]'
                                    }`}
                                >
                                    {i + 1}
                                </span>
                                {t.label}
                                {hasError && <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
                    <fieldset disabled={viewMode} className={viewMode ? 'opacity-100 [&_input:not([type=checkbox]):not([type=radio])]:bg-[#FAFBFC] [&_select]:bg-[#FAFBFC] [&_textarea]:bg-[#FAFBFC]' : ''}>
                        {tab === 'location' && (
                            <LocationTab
                                data={data}
                                setData={setData}
                                errors={errors}
                                googleMapsApiKey={googleMapsApiKey}
                            />
                        )}
                        {tab === 'info' && (
                            <ListingInfoTab
                                data={data}
                                setData={setData}
                                errors={errors}
                                listingTypes={listingTypes}
                                listingStatuses={listingStatuses}
                                contacts={contacts}
                                deals={deals}
                                tags={tags}
                            />
                        )}
                        {tab === 'media' && (
                            <MediaTab
                                data={data}
                                setData={setData}
                                errors={errors}
                                existingPhotos={listing?.photos ?? null}
                            />
                        )}
                        {tab === 'details' && (
                            <PropertyDetailsTab
                                data={data}
                                setData={setData}
                                errors={errors}
                                listingTypes={listingTypes}
                            />
                        )}
                        {tab === 'features' && (
                            <FeaturesTab data={data} setData={setData} errors={errors} />
                        )}
                    </fieldset>
                </div>
            </div>
        </SlideOverModal>
    );
}

/** Map each form field (or features.foo) to the tab it lives on, for error jumping. */
function fieldToTab(): Record<string, TabKey> {
    return {
        address: 'location',
        unit: 'location',
        city: 'location',
        state_province: 'location',
        postal_code: 'location',
        country: 'location',
        title: 'info',
        listing_type: 'info',
        status: 'info',
        price: 'info',
        mls_number: 'info',
        listed_at: 'info',
        contact_id: 'info',
        deal_id: 'info',
        tags: 'info',
        photos: 'media',
        virtual_tour_url: 'media',
        bedrooms: 'details',
        full_baths: 'details',
        half_baths: 'details',
        sqft: 'details',
        lot_size: 'details',
        year_built: 'details',
        stories: 'details',
        parking_spaces: 'details',
        garage_spaces: 'details',
        hoa_fee: 'details',
        description: 'details',
        property_subtype: 'details',
        listing_category: 'info',
        open_houses: 'details',
        subdivision: 'details',
        mls_area: 'details',
        hoa_name: 'details',
        hoa_frequency: 'details',
        tax_annual_amount: 'details',
        tax_year: 'details',
        pool: 'features',
        waterfront: 'features',
        new_construction: 'features',
        furnished: 'features',
        view: 'features',
        appliances: 'features',
        heating: 'features',
        cooling: 'features',
        flooring: 'features',
        exterior_features: 'features',
        security_features: 'features',
        custom_features: 'features',
        amenities: 'features',
        features: 'details',
    };
}

function computeErrorTabs(errors: Record<string, string>): Set<TabKey> {
    const tabs = new Set<TabKey>();
    const map = fieldToTab();
    for (const key of Object.keys(errors)) {
        const root = key.split('.')[0];
        const t = map[root] ?? map[key];
        if (t) tabs.add(t);
    }
    return tabs;
}

export type { TabKey };
