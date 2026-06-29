import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { SiteLayout } from '@/layouts/site-layout';
import { SiteHeader } from '@/components/site/nav/site-header';
import { Button } from '@/components/site/button';
import { cn } from '@/lib/utils';
import { useTypewriter } from '@/hooks/use-typewriter';
import { FeaturedListings } from '@/components/site/sections/featured-listings';
import { ImageTextSplit } from '@/components/site/sections/image-text-split';
import { PathCards } from '@/components/site/sections/path-cards';
import { FeaturedPropertiesSlider } from '@/components/site/sections/featured-properties-slider';
import { NeighborhoodsExplorer } from '@/components/site/sections/neighborhoods-explorer';
import { ValuationWidget } from '@/components/site/sections/valuation-widget';
import { BlogRotator } from '@/components/site/sections/blog-rotator';
import { PopularSearches } from '@/components/site/sections/popular-searches';
import { TestimonialsCarousel } from '@/components/site/sections/testimonials-carousel';
import { WorkWithUsBand } from '@/components/site/sections/work-with-us-band';
import { POPULAR_SEARCHES } from '@/data/popular-searches';
import { TESTIMONIALS } from '@/data/testimonials';
import { HERO_SEARCH_TABS } from '@/data/hero-search-tabs';

const ROTATING = [
    "Owl's Nest Resort",
    'Rumney Ridge Trade Center',
    'Waterville Valley',
    'Lakes Region',
    'Investment Properties',
];

// Thin page: the hero is composed inline (it embeds the header), and every
// section below is a shared component from components/site/sections.
export default function Home() {
    const rotating = useTypewriter(ROTATING);
    const [activeTab, setActiveTab] = useState(0);
    const [query, setQuery] = useState('');
    const tab = HERO_SEARCH_TABS[activeTab];

    return (
        <SiteLayout showHeader={false}>
            <Head title="Owl's Nest Real Estate - Waterville Valley Real Estate" />

            <section className="relative min-h-screen w-full overflow-hidden">
                <video
                    className="absolute inset-0 z-0 h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    src="https://owlsnestrealestate.com/wp-content/uploads/2026/05/16265930-uhd_3840_2160_60fps.mp4"
                />
                <div className="absolute inset-0 z-10 bg-navy/30" />

                <SiteHeader />

                <div className="relative z-10 mx-auto flex min-h-[calc(100vh-96px)] max-w-[1400px] flex-col justify-center px-6 py-10 lg:px-10">
                    <p className="mt-[7vh] mb-6 text-[13px] leading-[16px] font-bold tracking-[0.2em] text-white uppercase">
                        Owl's Nest Real Estate
                    </p>
                    <h1 className="max-w-[780px] text-[clamp(32px,5vw,56px)] leading-[1.12] font-normal tracking-wide text-white [font-variation-settings:'opsz'_144,'wdth'_100]">
                        Find Your Perfect New Hampshire Home With Owl's Nest
                        Real Estate.
                    </h1>
                    <p className="mt-8 text-[18px] leading-[26px] font-light text-white">
                        Your Premier REALTOR&reg; in <span>{rotating}</span>
                        <span
                            className="-mb-0.5 ml-0.5 inline-block w-[2px] animate-pulse bg-white align-middle"
                            style={{ height: '1.1em' }}
                        >
                            &nbsp;
                        </span>
                    </p>

                    {/* Hero Search Tabs */}
                    <div className="mt-4 inline-flex gap-1 self-start rounded-full bg-white/15 p-1 backdrop-blur-sm">
                        {HERO_SEARCH_TABS.map((t, i) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                    setActiveTab(i);
                                    setQuery('');
                                }}
                                className={cn(
                                    'rounded-full px-5 py-2.5 text-[13px] font-semibold tracking-[0.1em] uppercase transition-colors sm:px-7',
                                    i === activeTab
                                        ? 'bg-white text-navy'
                                        : 'text-white hover:bg-white/20',
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <form
                        action={tab.action}
                        method="get"
                        className="mt-4 w-full max-w-xl self-start"
                    >
                        <div className="flex items-center gap-3 rounded-full bg-white py-2 pr-2 pl-6 shadow-lg">
                            <svg
                                className="h-5 w-5 flex-shrink-0 text-navy"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            <input
                                type="text"
                                name="q"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={tab.placeholder}
                                className="min-w-0 flex-1 bg-transparent text-sm text-navy placeholder-gray-500 outline-none"
                            />
                            <Button
                                variant="solid"
                                type="submit"
                                affordance="arrow"
                                className="flex-shrink-0"
                            >
                                {tab.cta}
                            </Button>
                        </div>
                    </form>
                </div>
            </section>

            <FeaturedListings />

            <ImageTextSplit
                image="https://owlsnestrealestate.com/wp-content/uploads/2026/05/pexels-cottonbro-4569340-1536x1024.jpg"
                imageAlt="A family unpacking moving boxes in their new home"
                eyebrow="About"
                title="Owl's Nest Real Estate"
                cta={{ label: 'Read More', href: '/about' }}
            >
                <p>
                    Owl's Nest Real Estate is a locally focused brokerage
                    serving New Hampshire's White Mountains with expertise in
                    residential homes, vacation properties, land, and investment
                    real estate. We provide personalized service designed to
                    help clients navigate every step of the buying and selling
                    process with confidence.
                </p>
                <p>
                    Our team combines local market knowledge, real-world
                    experience, and a strong connection to the communities we
                    serve. From Campton and Plymouth to Waterville Valley and
                    the Lakes Region, we help buyers, sellers, and investors
                    make informed decisions based on their goals.
                </p>
                <p>
                    At Owl's Nest Real Estate, we believe every client deserves
                    clear communication, honest guidance, and a strategy
                    tailored to their unique needs. Whether you're searching for
                    a mountain retreat or preparing to sell, we're committed to
                    delivering a smooth and successful experience.
                </p>
            </ImageTextSplit>

            <PathCards />

            <FeaturedPropertiesSlider />

            <NeighborhoodsExplorer />

            <ValuationWidget />

            <BlogRotator />

            <PopularSearches columns={POPULAR_SEARCHES} />

            <TestimonialsCarousel testimonials={TESTIMONIALS} />

            <WorkWithUsBand
                image="/assets/images/hero-communities.jpg"
                eyebrow="Work With Us"
                title="Owl's Nest Real Estate"
                description="Their work ethic and enthusiasm are grounded in a corporate sales discipline and hospitality industry background. They routinely go above and beyond to exceed their clients' expectations in the New Hampshire residential real estate market."
                cta={{ label: 'Contact Us', href: '/contact' }}
            />
        </SiteLayout>
    );
}
