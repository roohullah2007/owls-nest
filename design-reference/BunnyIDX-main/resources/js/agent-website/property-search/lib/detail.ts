/*
 | Listing-detail data layer for the property modal.
 |
 | The public search feed (PsListing) only carries card-level fields, so the rich
 | modal sections (description, rooms, history, taxes, market trend, comparables,
 | agent, mortgage estimate, sentiment) are SYNTHESIZED here from the listing —
 | deterministic per MLS#, so they stay stable across re-renders. This is the
 | single seam to replace with a real MLS detail fetch later: swap
 | `buildListingDetail` for an API call returning the same `ListingDetail` shape
 | and every widget in ListingModal keeps working unchanged.
 */

import { PsListing } from '../types';

export interface RoomDetail { name: string; level: string; dims: string }
export interface SaleEvent { date: string; event: string; price: string }
export interface TaxEvent { year: string; amount: string }
export interface AgentInfo { name: string; role: string; phone: string; photo: string }

export interface ListingDetail {
    description: string;
    interior: Array<[string, string]>;
    construction: Array<[string, string]>;
    rooms: RoomDetail[];
    bathrooms: Array<{ level: string; pieces: string }>;
    amenities: string[];
    salesHistory: SaleEvent[];
    taxHistory: TaxEvent[];
    agent: AgentInfo;
    estMonthly: number;
    sentiment: { label: string; pct: number; note: string };
}

/** Standard amortized monthly principal + interest. */
export function mortgageMonthly(principal: number, annualRatePct: number, years: number): number {
    if (principal <= 0) return 0;
    const r = annualRatePct / 100 / 12;
    const n = years * 12;
    if (r === 0) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function money(n: number): string {
    return '$' + Math.round(n).toLocaleString();
}

/** Best-effort city from a "street, city, state" display address. */
export function cityFrom(address: string): string {
    const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : (parts[0] || 'the area');
}

export function buildListingDetail(l: PsListing): ListingDetail {
    const price = l.price ?? 750000;
    const beds = l.beds ?? 3;
    const bathCount = Math.max(1, Math.round(parseFloat(l.baths || '2')));
    const type = l.property_type || 'Single Family';
    const sqft = l.sqft || '1,800';
    const city = cityFrom(l.address);
    const year = new Date().getFullYear();

    const description =
        `Set in ${city}, this ${type.toLowerCase()} offers ${beds} bedroom${beds === 1 ? '' : 's'} and ` +
        `${l.baths || bathCount} bathroom${bathCount === 1 ? '' : 's'} across approximately ${sqft} ft² of living space. ` +
        `The home pairs comfortable, light-filled living areas with a functional kitchen and generous storage, and sits ` +
        `within easy reach of local schools, parks, shopping and commuter routes. ${l.lot ? `The lot measures ${l.lot}. ` : ''}` +
        `Book a private showing to experience the layout and finishes in person.`;

    const levels = ['Above', 'Above', 'Above', 'Main', 'Below', 'Below'];
    const dimsPool = ["15'6 x 20'", "10'3 x 13'6", "11'2 x 12'6", "10'4 x 11'6", "9'8 x 15'6", "11'5 x 10'"];
    const rooms: RoomDetail[] = Array.from({ length: beds }, (_, i) => ({
        name: i === 0 ? 'Primary Bedroom' : 'Bedroom',
        level: levels[i % levels.length],
        dims: dimsPool[i % dimsPool.length],
    }));

    const pieces = ['2-piece', '3-piece', '4-piece', '5-piece'];
    const blevels = ['Main', 'Above', 'Below', 'Above'];
    const bathrooms = Array.from({ length: bathCount }, (_, i) => ({
        level: blevels[i % blevels.length],
        pieces: pieces[i % pieces.length],
    }));

    const interior: Array<[string, string]> = [
        ['Built Area', `${sqft} ft²`],
        ['Bedrooms', String(beds)],
        ['Bathrooms', l.baths || String(bathCount)],
        ['Style', `${type} Residence`],
    ];
    if (l.parking) interior.push(['Parking', String(l.parking)]);

    const construction: Array<[string, string]> = [
        ['Heating', 'Forced Air, Natural Gas'],
        ['Cooling', 'Central Air Conditioning'],
        ['Flooring', 'Hardwood, Tile, Carpet'],
        ['Exterior', 'Frame, Vinyl Siding'],
    ];

    const amenities = ['Central Air Conditioning', 'Attached Garage', 'Fenced Yard', 'Patio / Deck', 'Fireplace', 'In-suite Laundry'];

    const salesHistory: SaleEvent[] = [
        { date: `${year}`, event: 'Listed for sale', price: l.price_formatted },
        { date: `${year - 6}`, event: 'Sold', price: money(price * 0.74) },
    ];

    const taxHistory: TaxEvent[] = [year, year - 1, year - 2].map((y, i) => ({
        year: String(y),
        amount: money((price * 0.011) * (1 - i * 0.03)),
    }));

    const agent: AgentInfo = {
        name: 'Your Local Agent',
        role: 'Sales Representative',
        phone: '(555) 012-3456',
        photo: '',
    };

    const estMonthly = mortgageMonthly(price * 0.8, 6.5, 30);

    return {
        description, interior, construction, rooms, bathrooms, amenities,
        salesHistory, taxHistory, agent, estMonthly,
        sentiment: { label: "Buyer's Market", pct: 28, note: `Based on recent activity in ${city}` },
    };
}
