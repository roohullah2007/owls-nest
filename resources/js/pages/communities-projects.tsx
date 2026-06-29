import { Head } from '@inertiajs/react';
import { SiteLayout } from '@/layouts/site-layout';
import { Container } from '@/components/site/primitives';
import { PageHero } from '@/components/site/sections/page-hero';
import { ImageTextSplit } from '@/components/site/sections/image-text-split';
import { CtaBandNavy } from '@/components/site/sections/cta-band-navy';
import { WorkWithUsBand } from '@/components/site/sections/work-with-us-band';
import { ValuationTimeline } from '@/components/site/sections/valuation-timeline';
import { CommunityCardOverlay } from '@/components/site/cards/community-card-overlay';
import { TeamMemberRow } from '@/components/site/cards/team-member-row';
import { TEAM } from '@/data/team';
import {
    COMMUNITY_PROJECTS,
    WELCOME_SECTIONS,
    VALUATION_STEPS,
} from '@/data/communities';

const REALTORS = TEAM.filter((member) => member.id !== 'enzo');

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

            {/* Welcome write-ups for each area */}
            {WELCOME_SECTIONS.map((section, i) => (
                <ImageTextSplit
                    key={section.id}
                    image={section.image}
                    imageAlt={section.imageAlt}
                    eyebrow={section.eyebrow}
                    title={section.title}
                    cta={section.cta}
                    reverse={i % 2 === 1}
                >
                    {section.paragraphs.map((paragraph, p) => (
                        <p key={p}>{paragraph}</p>
                    ))}
                </ImageTextSplit>
            ))}

            {/* Meet our team */}
            <section className="bg-white pt-16 md:pt-20">
                <div className="text-center">
                    <p className="text-[15px] leading-[18px] font-normal tracking-[0.18em] text-navy uppercase">
                        Our Team
                    </p>
                    <h2 className="mt-2 text-[clamp(26px,4.5vw,40px)] leading-[clamp(32px,5vw,44px)] font-semibold text-navy uppercase">
                        Meet The People Behind Owl's Nest
                    </h2>
                </div>
            </section>
            {REALTORS.map((member, i) => (
                <TeamMemberRow
                    key={member.id}
                    member={member}
                    tone={i % 2 === 0 ? 'navy' : 'white'}
                    reverse={i % 2 === 0}
                />
            ))}

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
                image="/images/hero-communities.webp"
                eyebrow="Work With Us"
                title="Owl's Nest Real Estate"
                description="Whether you're buying, selling, or investing, our team brings deep local knowledge and personalized service to help you make the right move with confidence across New Hampshire's White Mountains and Lakes Region."
                cta={{ label: 'Contact Us', href: '/contact' }}
            />
        </SiteLayout>
    );
}
