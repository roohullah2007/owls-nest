import { Head, Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { SiteLayout } from '@/layouts/site-layout';
import { Container } from '@/components/site/primitives';
import { PageHero } from '@/components/site/sections/page-hero';
import { CtaBandNavy } from '@/components/site/sections/cta-band-navy';
import { WorkWithUsBand } from '@/components/site/sections/work-with-us-band';
import { ValuationTimeline } from '@/components/site/sections/valuation-timeline';
import { TeamTimeline } from '@/components/site/sections/team-timeline';
import { CommunityCardOverlay } from '@/components/site/cards/community-card-overlay';
import {
    COMMUNITY_PROJECTS,
    WELCOME_SECTIONS,
    TEAM_TIMELINE,
    VALUATION_STEPS,
} from '@/data/communities';

export default function CommunitiesProjects() {
    return (
        <SiteLayout showHeader showFooter>
            <Head title="Communities & Projects - Owl's Nest Real Estate">
                <meta
                    name="description"
                    content="Explore the areas and current projects where Owl's Nest Real Estate specializes across New Hampshire's White Mountains and Lakes Region."
                />
            </Head>

            <PageHero
                eyebrow="Areas and Projects"
                title="Communities & Projects"
                image="/images/hero-communities.webp"
                size="tall"
                scrollTarget="communities"
            />

            {/* Areas and current projects grid */}
            <section id="communities" className="bg-white pb-16 md:pb-20">
                <div className="pt-16 text-center md:pt-20">
                    <p className="text-[15px] leading-[18px] font-normal tracking-[0.18em] text-navy uppercase">
                        Our Featured
                    </p>
                    <h2 className="mt-2 text-[clamp(26px,4.5vw,40px)] leading-[clamp(32px,5vw,44px)] font-semibold text-navy uppercase">
                        Areas and Current Projects
                    </h2>
                </div>
                <Container className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {COMMUNITY_PROJECTS.map((community) => (
                        <CommunityCardOverlay
                            key={community.id}
                            neighborhood={community}
                            variant="rich"
                            className="h-[320px] w-full"
                        />
                    ))}
                </Container>
            </section>

            {/* About our areas */}
            <section className="bg-navy py-16 md:py-20">
                <div className="mx-auto max-w-[880px] px-6 text-center">
                    <p className="text-[15px] leading-[18px] font-normal tracking-[0.18em] text-gold uppercase">
                        About Our Areas
                    </p>
                    <h2 className="mt-2 text-[clamp(24px,3.8vw,35px)] leading-[clamp(31px,4.6vw,42px)] font-semibold text-white uppercase">
                        Communities Built Around Lifestyle
                    </h2>
                    <div className="mx-auto mt-6 max-w-[760px] space-y-5 text-[16px] leading-[27px] font-normal text-white/85">
                        <p>
                            From four-season resort living at Owl's Nest to the
                            lakeside charm of the Lakes Region and the mountain
                            village of Waterville Valley, Owl's Nest Real Estate
                            represents some of the most sought-after communities
                            and development projects across New Hampshire's
                            White Mountains.
                        </p>
                        <p>
                            Each area offers its own distinct lifestyle —
                            whether you're looking for a primary residence, a
                            vacation getaway, an investment property, or a
                            commercial development opportunity. Our team brings
                            deep local knowledge and a hands-on, strategic
                            approach to help you find the right fit and make a
                            confident, informed decision.
                        </p>
                    </div>
                </div>
            </section>

            {/* "Welcome to ..." write-ups — text left, photo right; navy or white per area */}
            {WELCOME_SECTIONS.map((section) => {
                const navy = section.tone === 'navy';
                return (
                    <section
                        key={section.id}
                        className={cn(
                            'py-16 md:py-20',
                            navy ? 'bg-navy' : 'bg-white',
                        )}
                    >
                        <div className="mx-auto grid w-full max-w-[1500px] items-center gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_465px] lg:gap-16 lg:px-8">
                            <div>
                                {section.eyebrow && (
                                    <p
                                        className={cn(
                                            'mb-4 text-[15px] leading-[18px] font-normal tracking-wide uppercase',
                                            navy ? 'text-gold' : 'text-navy',
                                        )}
                                    >
                                        {section.eyebrow}
                                    </p>
                                )}
                                <h2
                                    className={cn(
                                        'text-[clamp(24px,3.8vw,35px)] leading-[clamp(31px,4.6vw,42px)] font-semibold',
                                        navy ? 'text-white' : 'text-navy',
                                    )}
                                >
                                    {section.title}
                                </h2>
                                <div
                                    className={cn(
                                        'mt-6 space-y-5 text-[16px] leading-[26px] font-normal',
                                        navy
                                            ? 'text-white/85'
                                            : 'text-[#282828]',
                                    )}
                                >
                                    {section.paragraphs.map((paragraph, p) => (
                                        <p key={p}>{paragraph}</p>
                                    ))}
                                </div>
                                <Link
                                    href={section.cta.href}
                                    className={cn(
                                        'mt-7 inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.1em] uppercase transition-colors hover:text-gold',
                                        navy ? 'text-white' : 'text-navy',
                                    )}
                                >
                                    {section.cta.label}
                                    <svg
                                        className="h-3.5 w-3.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M5 12h14M13 6l6 6-6 6"
                                        />
                                    </svg>
                                </Link>
                            </div>
                            <div className="group overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                                <img
                                    src={section.image}
                                    alt={section.imageAlt}
                                    className="h-[320px] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 sm:h-[360px] lg:h-[400px]"
                                />
                            </div>
                        </div>
                    </section>
                );
            })}

            <TeamTimeline
                heading="Meet The People Behind Owl's Nest"
                subheading="Our Team"
                members={TEAM_TIMELINE}
            />

            <ValuationTimeline
                heading="How Is A Valuation Performed?"
                subheading="Two Accurate Ways to Perform Home Valuations"
                steps={VALUATION_STEPS}
            />

            <CtaBandNavy
                title="Start Your Home Search"
                cta={{ label: 'Browse Homes', href: '/property-search' }}
            />

            <WorkWithUsBand
                variant="band"
                image="/images/hero-communities.webp"
                eyebrow="Work With Us"
                title="Owl's Nest Real Estate"
                description="Whether you're buying, selling, or investing, our team brings deep local knowledge and personalized service to help you make the right move with confidence across New Hampshire's White Mountains and Lakes Region."
                cta={{ label: 'Contact Us', href: '/contact' }}
            />
        </SiteLayout>
    );
}
