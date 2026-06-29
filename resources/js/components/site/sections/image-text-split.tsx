// Two-column "image beside text" band: photo on one side, eyebrow + heading +
// copy + optional CTA on the other. `reverse` swaps the image to the right.
// Reused by the home About section and the about/buyers/sellers/communities
// pages. All variant props default to the original home behavior.
import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/site/button';
import {
    Container,
    DisplayHeading,
    Eyebrow,
} from '@/components/site/primitives';

interface ImageTextSplitProps {
    image: string;
    imageAlt: string;
    eyebrow?: string;
    title: ReactNode;
    /** Body copy (usually several <p> elements). */
    children: ReactNode;
    cta?: { label: string; href: string };
    /** Place the image on the right instead of the left. */
    reverse?: boolean;
    /** `'navy'` = navy background with white copy + gold eyebrow. */
    tone?: 'light' | 'navy';
    /** Body font weight. `'normal'` is heavier than the default `'light'`. */
    bodyWeight?: 'light' | 'normal';
    /** `'semibold'` swaps the variable-font display heading for a font-semibold one. */
    headingWeight?: 'display' | 'semibold';
    /** `'card'` wraps the image in a rounded, shadowed card that lifts on hover. */
    imageStyle?: 'plain' | 'card';
    /** `'link'` renders the CTA as a gold-hover text link instead of a pill button. */
    ctaStyle?: 'button' | 'link';
    /** Optional anchor id for scroll-target links (e.g. hero chevrons). */
    id?: string;
    className?: string;
}

export function ImageTextSplit({
    image,
    imageAlt,
    eyebrow,
    title,
    children,
    cta,
    reverse = false,
    tone = 'light',
    bodyWeight = 'light',
    headingWeight = 'display',
    imageStyle = 'plain',
    ctaStyle = 'button',
    id,
    className,
}: ImageTextSplitProps) {
    const navy = tone === 'navy';

    const figure = (
        <div
            className={cn(
                imageStyle === 'card'
                    ? 'group overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl'
                    : 'overflow-hidden',
                reverse && 'lg:order-2',
            )}
        >
            <img
                src={image}
                alt={imageAlt}
                className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[520px]"
            />
        </div>
    );

    const heading =
        headingWeight === 'semibold' ? (
            <h2
                className={cn(
                    'font-display mt-4 text-[clamp(24px,3.8vw,35px)] leading-[clamp(31px,4.6vw,42px)] font-semibold',
                    navy ? 'text-white' : 'text-navy',
                )}
            >
                {title}
            </h2>
        ) : (
            <DisplayHeading
                className={
                    navy
                        ? 'mt-4 text-[clamp(28px,3.8vw,42px)] leading-[1.1] tracking-wide text-white normal-case'
                        : 'mt-4 text-[clamp(28px,3.8vw,42px)] leading-[1.1] tracking-wide text-navy normal-case'
                }
            >
                {title}
            </DisplayHeading>
        );

    return (
        <section
            id={id}
            className={cn(navy ? 'bg-navy py-20' : 'bg-white py-20', className)}
        >
            <Container className="grid items-center gap-10 lg:grid-cols-[460px_minmax(0,1fr)] lg:gap-14">
                {figure}
                <div className={cn(reverse && 'lg:order-1')}>
                    {eyebrow &&
                        (bodyWeight === 'normal' ? (
                            <p
                                className={cn(
                                    'mb-4 text-[15px] leading-[18px] font-normal tracking-wide uppercase',
                                    navy ? 'text-gold' : 'text-navy',
                                )}
                            >
                                {eyebrow}
                            </p>
                        ) : (
                            <Eyebrow tone={navy ? 'light' : 'dark'}>
                                {eyebrow}
                            </Eyebrow>
                        ))}
                    {heading}
                    <div
                        className={cn(
                            'mt-6 space-y-5 text-[16px] leading-[26px]',
                            bodyWeight === 'normal'
                                ? 'font-normal'
                                : 'font-light',
                            navy ? 'text-white/85' : 'text-[#282828]',
                        )}
                    >
                        {children}
                    </div>
                    {cta &&
                        (ctaStyle === 'link' ? (
                            <CtaLink
                                href={cta.href}
                                className={cn(
                                    'mt-7 inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.1em] uppercase transition-colors hover:text-gold',
                                    navy ? 'text-white' : 'text-navy',
                                )}
                            >
                                {cta.label}
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
                            </CtaLink>
                        ) : (
                            <Button
                                variant="outline-dark"
                                href={cta.href}
                                affordance="arrow"
                                className="mt-8 gap-2 px-8 py-4 text-[13px] tracking-[0.1em]"
                            >
                                {cta.label}
                            </Button>
                        ))}
                </div>
            </Container>
        </section>
    );
}

/** Internal routes use Inertia's <Link>; external/anchors stay plain <a>. */
function CtaLink({
    href,
    className,
    children,
}: {
    href: string;
    className?: string;
    children: ReactNode;
}) {
    if (href.startsWith('/')) {
        return (
            <Link href={href} className={className}>
                {children}
            </Link>
        );
    }

    return (
        <a href={href} className={className}>
            {children}
        </a>
    );
}
