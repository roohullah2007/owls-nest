import { Head } from '@inertiajs/react';
import { SiteLayout } from '@/layouts/site-layout';
import { PropertyDetailContent } from '@/components/site/search/property-detail-content';
import type { SearchListing } from '@/types/search-listing';

// Standalone public property-detail page (`/property/{mls}`) — the same design
// as the old detail modal, now a real, shareable page. Listing + nearby
// comparables come live from PrimeMLS via PropertyController.
export default function PropertyDetailPage({
    listing,
    similar = [],
}: {
    listing: SearchListing;
    similar?: SearchListing[];
}) {
    return (
        <SiteLayout headerFullWidth>
            <Head title={`${listing.address} - Owl's Nest Real Estate`} />
            <PropertyDetailContent listing={listing} similar={similar} />
        </SiteLayout>
    );
}
