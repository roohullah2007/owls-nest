import { Head } from '@inertiajs/react';
import { Fragment } from 'react';
import { SiteLayout } from '@/layouts/site-layout';
import { Button } from '@/components/site/button';
import { PageHero } from '@/components/site/sections/page-hero';
import { ImageTextSplit } from '@/components/site/sections/image-text-split';
import { FaqAccordion } from '@/components/site/sections/faq-accordion';
import { TestimonialsCarousel } from '@/components/site/sections/testimonials-carousel';
import { PathCard } from '@/components/site/cards/path-card';
import { BUYER_PATHS, BUY_FEATURES } from '@/data/buyers';
import { BUYER_FAQS } from '@/data/buyer-faqs';
import { TESTIMONIALS } from '@/data/testimonials';

// Thin page: composes shared sections (hero / split / testimonials / FAQ) with
// the buyers-only "Your Path", "Buy Your Dream Home" and parallax-CTA bands.
export default function Buyers() {
    return (
        <SiteLayout>
            <Head title="Buyers - Owl's Nest Real Estate" />

            <PageHero
                eyebrow="Buyers"
                title="Perfect Home Finder"
                image="/assets/images/hero-buyers.jpg"
                imageAlt="Waterfront homes at dusk"
            />

            {/* Confidence intro */}
            <ImageTextSplit
                className="py-10 md:py-16"
                image="/assets/images/64-fairway.jpg"
                imageAlt="A home in the White Mountains region"
                eyebrow="🏡 Buy with Owl's Nest Real Estate"
                title={
                    <>
                        Start Your Home-Buying Journey With
                        <br className="hidden lg:block" />
                        Confidence
                    </>
                }
            >
                <p>
                    Buying a home is an exciting step, and Owl's Nest Real
                    Estate is here to guide you through every stage
                    <br className="hidden lg:block" />
                    of the process. From understanding your goals to exploring
                    available properties, we provide
                    <br className="hidden lg:block" />
                    personalized support tailored to your needs.
                </p>
                <p>
                    Our local knowledge of the White Mountain region helps you
                    discover the right neighborhoods,
                    <br className="hidden lg:block" />
                    lifestyle options, and investment opportunities. Whether
                    you're searching for a vacation home, primary
                    <br className="hidden lg:block" />
                    residence, or mountain retreat, we make the process clear
                    and stress-free.
                </p>
                <p>
                    With expert guidance, strong negotiation skills, and
                    responsive communication, we help you move
                    <br className="hidden lg:block" />
                    forward with confidence. Our goal is to make your
                    home-buying experience smooth, informed, and
                    <br className="hidden lg:block" />
                    rewarding from start to finish.
                </p>
            </ImageTextSplit>

            {/* Your Path (3 cards) */}
            <section className="bg-sand py-16 md:py-20">
                <div className="mx-auto max-w-[820px] px-6 text-center">
                    <p className="text-[15px] font-normal tracking-[0.25em] text-navy uppercase">
                        Get Started
                    </p>
                    <span className="mx-auto mt-5 block h-px w-20 bg-navy/30" />
                    <h2 className="mt-6 text-[clamp(26px,4.5vw,40px)] leading-[1.15] font-semibold tracking-wide text-navy uppercase">
                        Your Path to Homeownership
                    </h2>
                </div>
                <div className="mx-auto mt-12 grid max-w-[1400px] grid-cols-1 gap-8 px-6 md:grid-cols-3 lg:px-10">
                    {BUYER_PATHS.map((card) => (
                        <PathCard key={card.title} card={card} tone="dark" />
                    ))}
                </div>
            </section>

            {/* Buy Your Dream Home */}
            <section className="bg-navy py-14 md:py-20">
                <div className="mx-auto w-full max-w-[1500px] px-6 lg:pr-16 lg:pl-8">
                    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_max-content] lg:gap-16">
                        <h2 className="text-[clamp(24px,3.8vw,35px)] leading-[clamp(31px,4.6vw,42px)] font-semibold tracking-wide text-white uppercase">
                            Buy Your Dream Home
                        </h2>
                        <p className="text-[16px] leading-[26px] font-normal text-white">
                            Find the perfect property to match your lifestyle
                            and goals with Owl's Nest Real Estate.
                            <br className="hidden lg:block" />
                            With local expertise throughout New Hampshire's
                            White Mountains, our team helps you
                            <br className="hidden lg:block" />
                            discover homes, vacation properties, and investment
                            opportunities in the area's most
                            <br className="hidden lg:block" />
                            desirable communities.
                        </p>
                    </div>

                    <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
                        {BUY_FEATURES.map((feature, i) => (
                            <div
                                key={feature.title}
                                className={
                                    i > 0
                                        ? 'border-l-[3px] border-white/40 pl-6'
                                        : undefined
                                }
                            >
                                <h3 className="text-[24px] leading-[29px] font-semibold text-white">
                                    {feature.title}
                                </h3>
                                <p className="mt-5 text-[16px] leading-[26px] font-normal text-white">
                                    {feature.lines.map((line, j) => (
                                        <Fragment key={j}>
                                            {line}
                                            {j < feature.lines.length - 1 && (
                                                <br className="hidden lg:block" />
                                            )}
                                        </Fragment>
                                    ))}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <FaqAccordion items={BUYER_FAQS} />

            <TestimonialsCarousel testimonials={TESTIMONIALS} />

            {/* Parallax CTA */}
            <section
                className="relative bg-cover bg-fixed bg-center"
                style={{
                    backgroundImage: "url('/assets/images/cta-home.jpg')",
                }}
            >
                <div className="absolute inset-0 bg-navy/60" />
                <div className="relative mx-auto w-full max-w-[1100px] px-6 py-16 text-center text-white md:py-20">
                    <h2 className="text-[clamp(26px,4.5vw,40px)] leading-[48px] font-semibold text-white">
                        Ready To Find Your Perfect Home?
                    </h2>
                    <p className="mx-auto mt-5 text-[18px] leading-[29px] font-normal text-white/[0.86]">
                        Let Owl's Nest Real Estate guide you through the buying
                        process with local expertise, personalized
                        <br className="hidden lg:block" />
                        service, and trusted support every step of the way.
                        Whether you're searching for a vacation property,
                        <br className="hidden lg:block" />
                        primary residence, or investment opportunity, we're here
                        to help you move forward with confidence.
                    </p>
                    <Button
                        variant="outline-light"
                        href="/property-search"
                        className="mt-8 px-7 text-[14px] tracking-[0.1em] hover:border-navy hover:bg-navy hover:text-white"
                    >
                        Start Your Property Search
                    </Button>
                </div>
            </section>
        </SiteLayout>
    );
}
