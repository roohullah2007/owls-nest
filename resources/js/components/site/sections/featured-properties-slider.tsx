// Home "Featured Properties" slider: each slide is a big slide-up card above two
// thumbnails, sliding horizontally with a partial navy backdrop behind them.
import { Button } from '@/components/site/button';
import {
    CarouselArrowButton,
    Container,
    DisplayHeading,
} from '@/components/site/primitives';
import { ListingCardSlideUp } from '@/components/site/cards/listing-card-slide-up';
import { useCarousel } from '@/hooks/use-carousel';
import { FEATURED_PROPERTY_SLIDES } from '@/data/home-listings';
import type { PropertySlide } from '@/types/listing';

interface FeaturedPropertiesSliderProps {
    heading?: string;
    slides?: PropertySlide[];
}

export function FeaturedPropertiesSlider({
    heading = 'FEATURED PROPERTIES',
    slides = FEATURED_PROPERTY_SLIDES,
}: FeaturedPropertiesSliderProps) {
    const { index, next, prev } = useCarousel(slides.length);

    return (
        <section className="bg-white pt-20 pb-0">
            {/* Heading row */}
            <Container>
                <div className="mb-10 flex items-center justify-between">
                    <DisplayHeading className="text-[clamp(30px,5vw,52px)] leading-[1.05] tracking-tight text-navy">
                        {heading}
                    </DisplayHeading>
                    <div className="flex gap-3">
                        <CarouselArrowButton direction="prev" onClick={prev} />
                        <CarouselArrowButton direction="next" onClick={next} />
                    </div>
                </div>
            </Container>

            {/* Slider area with partial navy backdrop */}
            <div className="relative">
                <div className="absolute inset-x-0 top-[480px] bottom-0 bg-navy" />

                <Container className="relative">
                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-700 ease-in-out"
                            style={{
                                transform: `translateX(-${index * 100}%)`,
                            }}
                        >
                            {slides.map((slide, i) => (
                                <div key={i} className="w-full flex-shrink-0">
                                    <ListingCardSlideUp
                                        listing={slide.big}
                                        size="big"
                                    />
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        {slide.thumbnails.map((thumb, t) => (
                                            <ListingCardSlideUp
                                                key={t}
                                                listing={thumb}
                                                size="small"
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-12 flex justify-center pb-12">
                        <Button
                            variant="outline-light"
                            href="/property-search"
                            affordance="none"
                            className="gap-3"
                        >
                            View All
                            <span className="h-px w-8 bg-white/70" />
                        </Button>
                    </div>
                </Container>
            </div>
        </section>
    );
}
