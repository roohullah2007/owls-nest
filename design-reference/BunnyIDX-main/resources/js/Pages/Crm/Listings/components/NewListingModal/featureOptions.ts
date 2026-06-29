import type { NewListingFormData } from '../NewListingModal';

/**
 * Curated amenity taxonomy for MANUAL (off-MLS) listings. These are not MLS
 * provider taxonomy (property types / statuses / subtypes still come from the
 * user's getListingTypes()/getListingStatuses()); they're the agent-authored
 * feature set we store on the listing's `features` JSON and surface on the
 * public Featured Properties / Past Transactions pages via `features.amenities`.
 *
 * Each group key matches both a NewListingFormData field and a
 * `features.{key}` validation rule on ListingController.
 */

export type FeatureGroupKey =
    | 'view'
    | 'appliances'
    | 'heating'
    | 'cooling'
    | 'flooring'
    | 'exterior_features'
    | 'security_features';

export const FEATURE_GROUPS: { key: FeatureGroupKey; label: string; options: string[] }[] = [
    { key: 'view', label: 'View', options: ['Ocean', 'Water', 'Intracoastal', 'Lake', 'City', 'Garden', 'Pool', 'Golf Course', 'Mountain', 'Park'] },
    { key: 'appliances', label: 'Appliances', options: ['Dishwasher', 'Refrigerator', 'Microwave', 'Range / Oven', 'Washer', 'Dryer', 'Disposal', 'Wine Cooler'] },
    { key: 'heating', label: 'Heating', options: ['Central', 'Electric', 'Natural Gas', 'Heat Pump', 'Radiant'] },
    { key: 'cooling', label: 'Cooling', options: ['Central Air', 'Electric', 'Ceiling Fans', 'Wall / Window Unit', 'Zoned'] },
    { key: 'flooring', label: 'Flooring', options: ['Tile', 'Hardwood', 'Laminate', 'Carpet', 'Marble', 'Vinyl', 'Concrete'] },
    { key: 'exterior_features', label: 'Exterior', options: ['Balcony', 'Patio', 'Deck', 'Fenced Yard', 'Outdoor Kitchen', 'Hurricane Shutters', 'Tennis Court', 'BBQ Area'] },
    { key: 'security_features', label: 'Security', options: ['Gated Community', 'Security System', 'Smoke Detector', 'Doorman', 'Security Guard', 'Surveillance'] },
];

export const FURNISHED_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Not specified' },
    { value: 'unfurnished', label: 'Unfurnished' },
    { value: 'furnished', label: 'Furnished' },
    { value: 'partially_furnished', label: 'Partially Furnished' },
];

export const HOA_FREQUENCY_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'Not specified' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'semi_annually', label: 'Semi-Annually' },
    { value: 'annually', label: 'Annually' },
];

const FURNISHED_LABEL: Record<string, string> = {
    furnished: 'Furnished',
    partially_furnished: 'Partially Furnished',
};

/**
 * Flatten every selected feature into a single human-readable, deduped list.
 * Stored as `features.amenities` so the public site (FeaturedListingsResolver)
 * and CRM listing detail render a clean bullet list without knowing the groups.
 */
export function buildAmenities(d: NewListingFormData): string[] {
    const highlights = [
        d.pool ? 'Pool' : null,
        d.waterfront ? 'Waterfront' : null,
        d.new_construction ? 'New Construction' : null,
        d.furnished ? FURNISHED_LABEL[d.furnished] ?? null : null,
    ];

    const grouped = FEATURE_GROUPS.flatMap((g) => (d[g.key] as string[]) ?? []);

    const all = [...highlights, ...grouped, ...d.custom_features].filter(
        (v): v is string => !!v && v.trim() !== '',
    );

    return Array.from(new Set(all));
}
