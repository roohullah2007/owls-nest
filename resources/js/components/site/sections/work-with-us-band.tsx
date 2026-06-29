// Full-bleed photo band with a centered translucent card (eyebrow + rule +
// heading + copy + CTA). Reused on home and the about/contact pages.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/site/button';

interface WorkWithUsBandProps {
    image: string;
    eyebrow: string;
    title: ReactNode;
    description: ReactNode;
    cta: { label: string; href: string };
    className?: string;
}

export function WorkWithUsBand({
    image,
    eyebrow,
    title,
    description,
    cta,
    className,
}: WorkWithUsBandProps) {
    return (
        <section
            className={cn(
                'relative flex min-h-screen w-full items-center justify-center bg-cover bg-center bg-no-repeat py-20',
                className,
            )}
            style={{ backgroundImage: `url('${image}')` }}
        >
            {/* Dull/muted overlay */}
            <div className="absolute inset-0 bg-gray-500/30" />

            <div className="relative mx-6 w-full max-w-2xl bg-[#e8e8e6]/85 px-6 py-12 text-center backdrop-blur-sm sm:px-12 sm:py-16">
                <p className="mb-4 text-[12px] leading-[16px] font-semibold tracking-[0.2em] text-navy uppercase">
                    {eyebrow}
                </p>
                <div className="mx-auto mb-8 h-px w-16 bg-navy" />
                <h2 className="mb-8 text-[clamp(30px,5vw,52px)] leading-[1.1] font-normal tracking-[0.02em] text-navy uppercase [font-variation-settings:'opsz'_144,'wdth'_100]">
                    {title}
                </h2>
                <p className="mx-auto mb-10 max-w-md text-[16px] leading-[22px] font-light text-[rgb(26,26,26)]">
                    {description}
                </p>
                <Button
                    variant="outline-dark"
                    href={cta.href}
                    affordance="line"
                >
                    {cta.label}
                </Button>
            </div>
        </section>
    );
}
