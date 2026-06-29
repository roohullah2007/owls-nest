import { Head } from '@inertiajs/react';
import { useRef } from 'react';
import { SiteLayout } from '@/layouts/site-layout';
import { Button } from '@/components/site/button';
import {
    CarouselArrowButton,
    DisplayHeading,
} from '@/components/site/primitives';
import { PageHero } from '@/components/site/sections/page-hero';
import { ImageTextSplit } from '@/components/site/sections/image-text-split';
import { CardRail } from '@/components/site/sections/card-rail';
import type { CardRailHandle } from '@/components/site/sections/card-rail';
import { TestimonialsCarousel } from '@/components/site/sections/testimonials-carousel';
import { ProcessStepCard } from '@/components/site/cards/process-step-card';
import { SELLER_PROCESS } from '@/data/seller-process';
import { TESTIMONIALS } from '@/data/testimonials';

export default function Sellers() {
    const railRef = useRef<CardRailHandle>(null);

    return (
        <SiteLayout>
            <Head title="Sellers - Owl's Nest Real Estate" />

            <PageHero
                eyebrow="Sellers"
                title={
                    <>
                        Sell Your Home
                        <br className="hidden sm:block" /> Quickly and{' '}
                        <span className="whitespace-nowrap">Hassle-Free!</span>
                    </>
                }
                image="/images/cta-home.webp"
                imageAlt="Elegantly furnished living room"
            />

            <ImageTextSplit
                image="/images/sellers-confidence.webp"
                imageAlt="A modern home for sale"
                eyebrow="Sell Your Home With Confidence"
                title={
                    <>
                        Begin Your Selling Journey With Expert
                        <br className="hidden lg:block" /> Guidance
                    </>
                }
            >
                <p>
                    Selling your home is an important decision, and having the
                    right strategy can make all the difference. Our team
                    provides personalized support to help you navigate every
                    step of the selling process with confidence.
                </p>
                <p>
                    From pricing and marketing to negotiations and closing, we
                    work to position your property for maximum exposure and
                    value. Our goal is to create a smooth, efficient experience
                    while helping you achieve the best possible outcome.
                </p>
            </ImageTextSplit>

            {/* OUR SELLER PROCESS — navy band: heading column + scrollable steps */}
            <section className="overflow-hidden bg-navy pt-16 pb-16 md:pt-20 md:pb-20">
                <div className="mx-auto grid max-w-[1500px] grid-cols-1 items-stretch gap-10 px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12 lg:px-8">
                    {/* LEFT: heading + CTA + arrows */}
                    <div className="flex flex-col">
                        <DisplayHeading className="text-[clamp(30px,4vw,48px)] leading-[1.05] text-white">
                            Our Seller
                            <br />
                            Process
                        </DisplayHeading>
                        <p className="mt-5 text-[16px] leading-[24px] font-normal text-white/85">
                            Here's the smarter way! We understand your needs.
                        </p>
                        <Button
                            variant="outline-light"
                            href="/contact"
                            affordance="arrow"
                            className="mt-8 max-w-[240px] gap-3 px-6"
                        >
                            Let's Get Started
                        </Button>

                        <div className="mt-12 flex gap-3 lg:mt-auto lg:pt-10">
                            <CarouselArrowButton
                                direction="prev"
                                tone="light"
                                onClick={() => railRef.current?.scrollPrev()}
                            />
                            <CarouselArrowButton
                                direction="next"
                                tone="light"
                                onClick={() => railRef.current?.scrollNext()}
                            />
                        </div>
                    </div>

                    {/* RIGHT: scrollable step cards */}
                    <div className="min-w-0">
                        <CardRail ref={railRef} trackClassName="pr-2">
                            {SELLER_PROCESS.map((step) => (
                                <ProcessStepCard
                                    key={step.number}
                                    step={step}
                                />
                            ))}
                        </CardRail>
                    </div>
                </div>
            </section>

            <ImageTextSplit
                image="/images/sellers-benefits.webp"
                imageAlt="A realtor meeting clients at a home"
                reverse
                title={
                    <>
                        The Benefits Of Working With A Realtor&reg;
                        <br className="hidden lg:block" /> When Selling Your
                        Home
                    </>
                }
                cta={{ label: "Let's Connect", href: '/contact' }}
            >
                <p>
                    In today's market, simply putting a property on the MLS is
                    no longer enough to maximize value. The difference between
                    an average listing strategy and an exceptional one can
                    directly impact your final sale price, buyer activity, and
                    overall experience. At Owl's Nest Real Estate, we take a
                    hands-on, marketing-driven approach designed to help
                    properties stand out. From professional photography, drone
                    media, cinematic video, social media advertising, targeted
                    email campaigns, and premium listing presentation — we
                    invest heavily in exposing your property to the right
                    buyers. We also bring deep local market knowledge throughout
                    the White Mountains and Lakes Region, allowing us to
                    strategically price and position properties based on real
                    buyer behavior — not just generic automated estimates. While
                    we may not be the cheapest brokerage available, our focus
                    has never been on being the lowest-cost option. Our goal is
                    to help sellers achieve the strongest possible overall
                    outcome through better exposure, stronger negotiation, and a
                    higher level of service. For many sellers, the difference in
                    marketing quality, presentation, and negotiation can
                    outweigh the difference between a discount commission and a
                    results-driven strategy. Beyond marketing, we manage the
                    entire process from start to finish — coordinating
                    communication, handling negotiations, navigating inspections
                    and contingencies, and keeping transactions moving smoothly
                    toward closing. Our philosophy is simple: Better
                    presentation. Better exposure. Better buyers. Better
                    results.
                </p>
            </ImageTextSplit>

            <TestimonialsCarousel testimonials={TESTIMONIALS} />
        </SiteLayout>
    );
}
