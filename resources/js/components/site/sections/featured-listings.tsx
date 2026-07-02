// Home "Featured Listings": a heading/CTA column beside a horizontal rail of
// overlay listing cards. Arrows live in the left column and drive the rail via
// the CardRail imperative handle.
import { useRef } from 'react';
import { Button } from '@/components/site/button';
import {
    CarouselArrowButton,
    Container,
    DisplayHeading,
} from '@/components/site/primitives';
import { CardRail } from '@/components/site/sections/card-rail';
import type { CardRailHandle } from '@/components/site/sections/card-rail';
import { ListingCardOverlay } from '@/components/site/cards/listing-card-overlay';
import type { Listing } from '@/types/listing';

interface FeaturedListingsProps {
    /** Live PrimeMLS listings passed from the home controller. */
    listings: Listing[];
}

export function FeaturedListings({ listings }: FeaturedListingsProps) {
    const railRef = useRef<CardRailHandle>(null);

    return (
        <section className="overflow-hidden bg-white pt-20 pb-0">
            <Container className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
                {/* LEFT: heading + view all + arrows */}
                <div className="flex flex-col">
                    <DisplayHeading className="text-[clamp(34px,4vw,52px)] leading-[1.05] text-navy">
                        FEATURED
                        <br />
                        LISTINGS
                    </DisplayHeading>
                    <Button
                        variant="outline-dark"
                        href="/property-search"
                        affordance="none"
                        className="mt-8 max-w-[220px] px-6"
                    >
                        View All
                        <span className="h-px w-8 bg-gray-500" />
                    </Button>

                    <div className="mt-12 flex gap-3 lg:mt-auto lg:pt-10">
                        <CarouselArrowButton
                            direction="prev"
                            onClick={() => railRef.current?.scrollPrev()}
                        />
                        <CarouselArrowButton
                            direction="next"
                            onClick={() => railRef.current?.scrollNext()}
                        />
                    </div>
                </div>

                {/* RIGHT: scrollable listing cards */}
                <div className="min-w-0">
                    <CardRail
                        ref={railRef}
                        className="lg:-mr-[220px]"
                        trackClassName="lg:pr-[40px]"
                    >
                        {listings.map((listing) => (
                            <ListingCardOverlay
                                key={listing.id}
                                listing={listing}
                            />
                        ))}
                    </CardRail>
                </div>
            </Container>
        </section>
    );
}
