// Full-width navy CTA strip: heading on the left, outline-light button on the
// right. Reused by the about + communities pages ("Start Your Home Search").
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
        <section className={cn('bg-navy', className)}>
            <Container className="flex flex-col items-center justify-between gap-8 py-16 md:flex-row md:py-20">
                <div className="text-center md:text-left">
                    {eyebrow && (
                        <Eyebrow tone="light" className="mb-4 block">
                            {eyebrow}
                        </Eyebrow>
                    )}
                    <DisplayHeading className="text-[clamp(30px,5vw,52px)] text-white">
                        {title}
                    </DisplayHeading>
                </div>
                <Button
                    variant="outline-light"
                    href={cta.href}
                    className="px-10 py-4 text-[13px] tracking-[0.1em] whitespace-nowrap"
                >
                    {cta.label}
                </Button>
            </Container>
        </section>
    );
}
