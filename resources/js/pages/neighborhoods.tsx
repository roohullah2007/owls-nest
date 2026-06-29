import { Head } from '@inertiajs/react';
import { SiteLayout } from '@/layouts/site-layout';
import { PageHero } from '@/components/site/sections/page-hero';
import { WorkWithUsBand } from '@/components/site/sections/work-with-us-band';
import { TestimonialsCarousel } from '@/components/site/sections/testimonials-carousel';
import { NeighborhoodCard } from '@/components/site/cards/neighborhood-card';
import { Container } from '@/components/site/primitives';
import { NEIGHBORHOOD_CARDS } from '@/data/neighborhood-cards';
import { TESTIMONIALS } from '@/data/testimonials';

export default function Neighborhoods() {
    return (
        <SiteLayout>
            <Head title="Neighborhoods - Owl's Nest Real Estate" />

            <PageHero
                title="Neighborhoods"
                image="/images/hero-communities.webp"
                size="tall"
                scrollTarget="areas"
            />

            {/* Areas and Current Projects grid */}
            <section id="areas" className="bg-white pb-16 md:pb-20">
                <div className="pt-16 text-center md:pt-20">
                    <p className="text-[15px] leading-[18px] font-normal tracking-[0.18em] text-navy uppercase">
                        Areas of Expertise
                    </p>
                    <h2 className="mt-2 text-[clamp(26px,4.5vw,40px)] leading-[clamp(32px,5vw,44px)] font-semibold text-navy uppercase">
                        Areas and Current Projects
                    </h2>
                </div>

                <Container className="mt-12 grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {NEIGHBORHOOD_CARDS.map((neighborhood) => (
                        <NeighborhoodCard
                            key={neighborhood.id}
                            neighborhood={neighborhood}
                        />
                    ))}
                </Container>
            </section>

            {/* Intro band */}
            <section className="bg-navy py-20 md:py-28">
                <div className="mx-auto max-w-[840px] px-6 text-center">
                    <p className="text-[17px] font-semibold tracking-[0.28em] text-white uppercase md:text-[19px]">
                        Explore the Region
                    </p>
                    <span className="mx-auto mt-6 block h-px w-28 bg-white/40" />
                    <h2 className="mt-7 text-[clamp(28px,4.4vw,44px)] leading-[1.15] font-semibold text-white">
                        A Place for Every Way of Living
                    </h2>
                    <p className="mx-auto mt-7 max-w-[700px] text-[17px] leading-[30px] font-normal text-white/85">
                        From luxury resort communities and classic alpine
                        villages to sparkling waterfront towns, the
                        neighborhoods we serve span New Hampshire's most
                        desirable places to live — each with its own character,
                        lifestyle, and opportunity. Wherever you picture
                        yourself, our local team will help you find it.
                    </p>
                </div>
            </section>

            <WorkWithUsBand
                variant="band"
                image="/images/hero-communities.webp"
                eyebrow="Work With Us"
                title="Owl's Nest Real Estate"
                description="Whether you're buying, selling, or investing, our team brings deep local knowledge and personalized service to help you make the right move with confidence across New Hampshire's White Mountains and Lakes Region."
                cta={{ label: 'Contact Us', href: '/contact' }}
            />

            <TestimonialsCarousel testimonials={TESTIMONIALS} />
        </SiteLayout>
    );
}
