// Centered "How Is A Valuation Performed?" timeline: a vertical navy rule with
// alternating rows (navy label pill on one side, heading + copy on the other)
// and a centered node dot per row. Data-driven from ValuationStep[].
import { cn } from '@/lib/utils';
import type { ValuationStep } from '@/data/communities';

interface ValuationTimelineProps {
    heading: string;
    subheading: string;
    steps: ValuationStep[];
    className?: string;
}

export function ValuationTimeline({
    heading,
    subheading,
    steps,
    className,
}: ValuationTimelineProps) {
    return (
        <section className={cn('bg-white py-16 md:py-24', className)}>
            <div className="text-center">
                <h2 className="text-[clamp(28px,5vw,48px)] leading-[1.1] font-semibold tracking-wide text-navy uppercase">
                    {heading}
                </h2>
                <p className="mt-4 text-[16px] font-normal text-[#555]">
                    {subheading}
                </p>
            </div>

            <div className="relative mx-auto mt-16 max-w-[1120px] px-6">
                <div className="absolute top-2 bottom-2 left-1/2 hidden w-px -translate-x-1/2 bg-navy/25 md:block" />

                {steps.map((step, i) => {
                    const reverse = i % 2 === 1;
                    const pill = (
                        <div
                            className={cn(
                                'flex',
                                reverse
                                    ? 'md:order-2 md:justify-start'
                                    : 'md:justify-end',
                            )}
                        >
                            <span className="inline-block bg-navy px-8 py-4 text-[15px] font-semibold tracking-[0.08em] text-white uppercase">
                                {step.label}
                            </span>
                        </div>
                    );
                    const body = (
                        <div
                            className={cn(
                                reverse
                                    ? 'md:order-1 md:pr-4 md:text-right'
                                    : 'md:pl-4',
                            )}
                        >
                            <h3 className="text-[clamp(20px,2.8vw,28px)] leading-[1.2] font-semibold text-navy uppercase">
                                {step.title}
                            </h3>
                            <p className="mt-4 text-[15px] leading-[25px] font-normal text-[#444]">
                                {step.body}
                            </p>
                        </div>
                    );

                    return (
                        <div
                            key={step.id}
                            className="relative mb-12 grid items-start gap-6 last:mb-0 md:grid-cols-2 md:gap-16"
                        >
                            {reverse ? (
                                <>
                                    {body}
                                    {pill}
                                </>
                            ) : (
                                <>
                                    {pill}
                                    {body}
                                </>
                            )}
                            <span className="absolute top-7 left-1/2 hidden h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-navy ring-4 ring-white md:block" />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
