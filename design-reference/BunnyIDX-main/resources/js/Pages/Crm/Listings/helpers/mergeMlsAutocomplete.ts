import type { MlsListing } from '../types';

/**
 * Merge fresh MLS results into the autocomplete-source sets the search bar uses.
 *
 * Pure: returns a new object; callers pipe each set through their `setX(prev => ...)`.
 * `maxAddresses` is honoured because the address list can balloon quickly across
 * multi-page bulk fetches (1000+).
 */
export function mergeMlsAutocomplete(
    listings: MlsListing[],
    prev: { cities: string[]; addresses: string[]; subtypes: string[] },
    maxAddresses = 200,
): { cities: string[]; addresses: string[]; subtypes: string[] } {
    const cities = listings.map((l) => l.address?.city).filter(Boolean) as string[];
    const addrs = listings.map((l) => l.address?.full).filter(Boolean) as string[];
    const subs = listings.map((l) => l.property_subtype).filter(Boolean) as string[];
    return {
        cities: [...new Set([...prev.cities, ...cities])].sort(),
        addresses: [...new Set([...prev.addresses, ...addrs])].slice(0, maxAddresses),
        subtypes: [...new Set([...prev.subtypes, ...subs])].sort(),
    };
}
