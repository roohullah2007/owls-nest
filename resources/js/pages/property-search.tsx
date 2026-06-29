import { Head } from '@inertiajs/react';
import { SiteLayout } from '@/layouts/site-layout';
import { PropertySearch } from '@/components/site/search/property-search';

// The site's heaviest page: a full filter bar + dropdown panels, a Leaflet
// results map, a paginated results grid, and a property detail modal. All of
// that lives in the <PropertySearch /> feature component; the page just composes
// it inside the shared layout.
export default function PropertySearchPage() {
    return (
        <SiteLayout>
            <Head title="Property Search - Owl's Nest Real Estate" />
            <PropertySearch />
        </SiteLayout>
    );
}
