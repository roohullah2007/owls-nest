// Generic full-width navy CTA band: optional eyebrow + heading + outline-light
// button. Reused by inner pages (about / buyers / sellers / communities) that
// end with a "get in touch" prompt on a navy background.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/site/button';
import {
    Container,
    DisplayHeading,
    Eyebrow,
} from '@/components/site/primitives';

interface CtaBandNavyProps {
    eyebrow?: string;
    title: ReactNode;
    cta: { label: string; href: string };
    className?: string;
}

export function CtaBandNavy({
    eyebrow,
    title,
    cta,
    className,
}: CtaBandNavyProps) {
    return (
        <section className={cn('bg-navy py-20', className)}>
            <Container className="flex flex-col items-center text-center">
                {eyebrow && (
                    <Eyebrow tone="light" className="mb-4">
                        {eyebrow}
                    </Eyebrow>
                )}
                <DisplayHeading className="text-[clamp(34px,5vw,52px)] text-white">
                    {title}
                </DisplayHeading>
                <Button
                    variant="outline-light"
                    href={cta.href}
                    affordance="line"
                    className="mt-8 gap-3"
                >
                    {cta.label}
                </Button>
            </Container>
        </section>
    );
}
