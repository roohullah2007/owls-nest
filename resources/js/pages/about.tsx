import { Head } from '@inertiajs/react';
import { SiteLayout } from '@/layouts/site-layout';
import { PageHero } from '@/components/site/sections/page-hero';
import { ImageTextSplit } from '@/components/site/sections/image-text-split';
import { TeamMemberRow } from '@/components/site/cards/team-member-row';
import { CtaBandNavy } from '@/components/site/sections/cta-band-navy';
import { TestimonialsCarousel } from '@/components/site/sections/testimonials-carousel';
import { WorkWithUsBand } from '@/components/site/sections/work-with-us-band';
import { TEAM } from '@/data/team';
import { TESTIMONIALS } from '@/data/testimonials';

export default function About() {
    return (
        <SiteLayout showHeader showFooter>
            <Head title="About - Owl's Nest Real Estate" />

            <PageHero
                eyebrow="About"
                title="Owl's Nest Real Estate"
                subtitle="Elevate Your Real Estate Journey with Owl's Nest Real Estate."
                image="/images/about-hero.webp"
            />

            <ImageTextSplit
                image="/images/about-story.webp"
                imageAlt="A mountain-view home at sunset"
                eyebrow="About"
                title="Owl's Nest Real Estate"
                cta={{ label: 'Get Started', href: '/contact' }}
            >
                <p>
                    At Owl's Nest Real Estate, we believe real estate is about
                    more than transactions—it's about helping people find the
                    right place to build their future. Based in the heart of New
                    Hampshire's White Mountains, our brokerage is proud to serve
                    buyers, sellers, and investors with a personalized approach
                    rooted in trust, local expertise, and genuine relationships.
                </p>
                <p>
                    Our team brings deep knowledge of the regional market and a
                    firsthand understanding of the lifestyle that makes this
                    area so special. From mountain retreats and vacation homes
                    to full-time residences and investment properties, we help
                    clients discover opportunities that align with both their
                    goals and the way they want to live.
                </p>
                <p>
                    What sets Owl's Nest Real Estate apart is our commitment to
                    delivering a high-level experience from start to finish. We
                    combine responsive communication, honest guidance, and
                    strategic market insight to ensure every client feels
                    informed, supported, and confident throughout the process.
                    Whether you're buying your first home, expanding your
                    portfolio, or selling a cherished property, our mission is
                    to make your experience seamless and successful.
                </p>
            </ImageTextSplit>

            {TEAM.map((member, i) => (
                <TeamMemberRow
                    key={member.id}
                    member={member}
                    tone={i % 2 === 0 ? 'navy' : 'white'}
                    reverse={i % 2 === 0}
                />
            ))}

            <CtaBandNavy
                title="Start Your Home Search"
                cta={{ label: 'Browse Homes', href: '/property-search' }}
            />

            <TestimonialsCarousel testimonials={TESTIMONIALS} />

            <WorkWithUsBand
                image="/images/hero-communities.webp"
                eyebrow="Work With Us"
                title="Owl's Nest Real Estate"
                description="Their work ethic and enthusiasm are grounded in a corporate sales discipline and hospitality industry background. They routinely go above and beyond to exceed their clients' expectations in the New Hampshire residential real estate market."
                cta={{ label: 'Contact Us', href: '/contact' }}
            />
        </SiteLayout>
    );
}
