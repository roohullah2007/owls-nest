import { Head } from '@inertiajs/react';
import { SiteLayout } from '@/layouts/site-layout';
import { Container } from '@/components/site/primitives';
import { ChevronDownIcon } from '@/components/site/icons';
import { ListingsBrowser } from '@/components/site/sections/listings-browser';
import { InstagramGrid } from '@/components/site/sections/instagram-grid';
import { WorkWithUsBand } from '@/components/site/sections/work-with-us-band';
import type { Listing } from '@/types';

const HERO_IMAGE =
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1920&q=80';
const WORK_WITH_US_IMAGE = '/images/featured-work-with-us.webp';

export default function FeaturedProperties({
    listings = [],
}: {
    listings?: Listing[];
}) {
    // Live PrimeMLS results from the admin-configured Featured Listings settings
    // (see FeaturedPropertiesController). No static fixtures.
    const featured = listings;

    return (
        <SiteLayout>
            <Head title="Featured Properties - Owl's Nest Real Estate" />

            {/* HERO BANNER */}
            <section className="relative h-[300px] w-full overflow-hidden sm:h-[360px] lg:h-[420px]">
                <img
                    src={HERO_IMAGE}
                    alt="Featured Properties"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-navy/20" />
                <div className="relative z-10 flex h-full items-end justify-center">
                    <div className="flex w-full max-w-[700px] flex-col items-center bg-navy/95 px-8 py-7 text-center sm:px-10 sm:py-8">
                        <h2 className="text-[clamp(24px,4vw,40px)] leading-tight font-normal tracking-[0.04em] text-white">
                            FEATURED PROPERTIES
                        </h2>
                        <a
                            href="#featuredPropertiesList"
                            aria-label="Scroll to listings"
                            className="mt-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 text-white transition-colors hover:border-white hover:bg-white hover:text-navy"
                        >
                            <ChevronDownIcon className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </section>

            {/* LISTING SECTION */}
            <section
                id="featuredPropertiesList"
                className="bg-white pt-16 pb-20"
            >
                <Container className="max-w-[1300px] lg:px-12">
                    <ListingsBrowser listings={featured} />
                </Container>
            </section>

            {/* WORK WITH US */}
            <WorkWithUsBand
                image={WORK_WITH_US_IMAGE}
                eyebrow="Work With Us"
                title="Owl's Nest Real Estate"
                description="Their work ethic and enthusiasm are grounded in a corporate sales discipline and hospitality industry background. They routinely go above and beyond to exceed their clients' expectations in the New Hampshire residential real estate market."
                cta={{ label: 'Contact Us', href: '/contact' }}
            />

            {/* INSTAGRAM */}
            <InstagramGrid />
        </SiteLayout>
    );
}
