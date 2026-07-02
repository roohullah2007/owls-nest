import { Head } from '@inertiajs/react';
import { SiteLayout } from '@/layouts/site-layout';
import { PropertySearch } from '@/components/site/search/property-search';
import type { SearchListing } from '@/types/search-listing';

// The site's heaviest page: a full filter bar + dropdown panels, a Leaflet
// results map, a paginated results grid, and a property detail modal. All of
// that lives in the <PropertySearch /> feature component; the page just composes
// it inside the shared layout. Listings are live PrimeMLS results from the
// controller.
export default function PropertySearchPage({
    listings = [],
}: {
    listings?: SearchListing[];
}) {
    return (
        <SiteLayout headerFullWidth showFooter={false} fullHeight>
            <Head title="Property Search - Owl's Nest Real Estate" />
            <PropertySearch listings={listings} />
        </SiteLayout>
    );
}
