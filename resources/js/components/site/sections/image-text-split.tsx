// Two-column "image beside text" band: photo on one side, eyebrow + heading +
// copy + optional CTA on the other. `reverse` swaps the image to the right.
// Reused by the home About section and the about/buyers/sellers pages.
import type { ReactNode } from 'react';
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
    className,
}: ImageTextSplitProps) {
    const figure = (
        <div className={cn('overflow-hidden', reverse && 'lg:order-2')}>
            <img
                src={image}
                alt={imageAlt}
                className="h-[360px] w-full object-cover sm:h-[460px] lg:h-[520px]"
            />
        </div>
    );

    return (
        <section className={cn('bg-white py-20', className)}>
            <Container className="grid items-center gap-10 lg:grid-cols-[460px_minmax(0,1fr)] lg:gap-14">
                {figure}
                <div className={cn(reverse && 'lg:order-1')}>
                    {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
                    <DisplayHeading className="mt-4 text-[clamp(28px,3.8vw,42px)] leading-[1.1] tracking-wide text-navy normal-case">
                        {title}
                    </DisplayHeading>
                    <div className="mt-6 space-y-5 text-[16px] leading-[26px] font-light text-[#282828]">
                        {children}
                    </div>
                    {cta && (
                        <Button
                            variant="outline-dark"
                            href={cta.href}
                            affordance="arrow"
                            className="mt-8 gap-2 px-8 py-4 text-[13px] tracking-[0.1em]"
                        >
                            {cta.label}
                        </Button>
                    )}
                </div>
            </Container>
        </section>
    );
}
