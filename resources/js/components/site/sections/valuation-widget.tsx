// "Instant Property Valuation" band: photo background with an intro on the left
// and a step-1 address capture form on the right.
import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/site/button';
import { Container, DisplayHeading } from '@/components/site/primitives';

interface ValuationWidgetProps {
    image?: string;
    eyebrow?: string;
    title?: ReactNode;
    description?: ReactNode;
    className?: string;
}

export function ValuationWidget({
    image = '/images/waterfront-living.webp',
    eyebrow = 'Instant Property Valuation',
    title = 'Have an Expert Help You Find Out What Your Home Is Really Worth Today',
    description = "Discover your property's value through our accurate evaluation and tailored insights.",
    className,
}: ValuationWidgetProps) {
    const [address, setAddress] = useState('');

    return (
        <section
            className={cn(
                'relative flex min-h-screen w-full items-center bg-cover bg-center bg-no-repeat py-20',
                className,
            )}
            style={{ backgroundImage: `url('${image}')` }}
        >
            <div className="absolute inset-0 bg-navydeep/65" />

            <Container className="relative grid grid-cols-1 items-center gap-16 lg:grid-cols-[3fr_2fr]">
                {/* LEFT content */}
                <div>
                    <div className="mb-6 flex items-center gap-4">
                        <span className="h-px w-16 bg-white" />
                        <span className="text-[14px] leading-[19px] font-normal tracking-widest text-white uppercase">
                            {eyebrow}
                        </span>
                    </div>

                    <DisplayHeading className="mb-8 text-[clamp(30px,4.5vw,52px)] text-white">
                        {title}
                    </DisplayHeading>

                    <p className="text-[16px] leading-[22px] font-light text-white">
                        {description}
                    </p>
                </div>

                {/* RIGHT form */}
                <div className="mx-auto w-full max-w-xs lg:mr-16 lg:ml-auto">
                    <div className="mb-8 flex justify-end gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-navy">
                            1
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-400/70 text-sm font-semibold text-white">
                            2
                        </span>
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-400/70 text-sm font-semibold text-white">
                            3
                        </span>
                    </div>

                    <label
                        htmlFor="valuation-address"
                        className="mb-3 block text-[16px] leading-[22px] font-light text-white"
                    >
                        Enter your address to begin
                    </label>

                    <div className="mb-4 flex items-center gap-3 rounded-full bg-white/95 px-6 py-4 backdrop-blur-sm">
                        <span className="h-3 w-3 flex-shrink-0 rounded-full bg-navy" />
                        <input
                            id="valuation-address"
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Type address"
                            className="flex-1 bg-transparent text-[16px] text-gray-700 placeholder-gray-500 outline-none"
                        />
                    </div>

                    <Button
                        variant="outline-light"
                        affordance="none"
                        className="w-full border-white/80 py-4 text-white/90"
                    >
                        Continue
                    </Button>
                </div>
            </Container>
        </section>
    );
}
