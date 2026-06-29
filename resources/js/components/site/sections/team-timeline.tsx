// Compact "Meet The People Behind Owl's Nest" timeline: a centered vertical
// navy rule with alternating rows — a navy name chip on one side and a short
// role line + one-sentence blurb on the other, plus a centered node dot per
// row. Photo-free; data-driven from TeamTimelineMember[].
import { cn } from '@/lib/utils';
import type { TeamTimelineMember } from '@/data/communities';

interface TeamTimelineProps {
    heading: string;
    /** Optional eyebrow rendered above the heading. */
    subheading?: string;
    members: TeamTimelineMember[];
    className?: string;
}

export function TeamTimeline({
    heading,
    subheading,
    members,
    className,
}: TeamTimelineProps) {
    return (
        <section className={cn('bg-white py-16 md:py-20', className)}>
            <div className="text-center">
                {subheading && (
                    <p className="text-[15px] leading-[18px] font-normal tracking-[0.18em] text-navy uppercase">
                        {subheading}
                    </p>
                )}
                <h2 className="mt-2 text-[clamp(26px,4.5vw,40px)] leading-[clamp(32px,5vw,44px)] font-semibold text-navy uppercase">
                    {heading}
                </h2>
            </div>

            <div className="relative mx-auto mt-14 max-w-[1080px] px-6">
                <div className="absolute top-2 bottom-2 left-1/2 hidden w-px -translate-x-1/2 bg-navy/25 md:block" />

                {members.map((member, i) => {
                    const reverse = i % 2 === 1;
                    const chip = (
                        <div
                            className={cn(
                                'flex',
                                reverse
                                    ? 'md:order-2 md:justify-start'
                                    : 'md:justify-end',
                            )}
                        >
                            <span className="inline-block bg-navy px-8 py-4 text-[16px] font-semibold tracking-[0.08em] text-white uppercase">
                                {member.name}
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
                            <h3 className="text-[clamp(20px,2.6vw,26px)] leading-[30px] font-semibold text-navy">
                                {member.role}
                            </h3>
                            <p className="mt-3 text-[15px] leading-[24px] font-normal text-[#444]">
                                {member.blurb}
                            </p>
                        </div>
                    );

                    return (
                        <div
                            key={member.name}
                            className="relative mb-12 grid items-center gap-6 last:mb-0 md:grid-cols-2 md:gap-16"
                        >
                            {reverse ? (
                                <>
                                    {body}
                                    {chip}
                                </>
                            ) : (
                                <>
                                    {chip}
                                    {body}
                                </>
                            )}
                            <span className="absolute top-1/2 left-1/2 hidden h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy ring-4 ring-white md:block" />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
