// Native <details> accordion: navy summary bars with a chevron that rotates
// when open. No JS needed — the browser drives open/close. Data-driven so it
// can be reused by any page that needs an FAQ list.
import { cn } from '@/lib/utils';
import type { Faq } from '@/data/buyer-faqs';

interface FaqAccordionProps {
    items: Faq[];
    heading?: string;
    className?: string;
}

export function FaqAccordion({
    items,
    heading = 'Frequently Asked Questions',
    className,
}: FaqAccordionProps) {
    return (
        <section className={cn('bg-white py-12 md:py-16', className)}>
            <div className="mx-auto w-full max-w-[1000px] px-6 lg:px-8">
                <h2 className="text-center text-[clamp(26px,4.5vw,40px)] leading-[40px] font-semibold tracking-[0.05em] text-navy uppercase">
                    {heading}
                </h2>

                <div className="mt-10 space-y-4">
                    {items.map((item) => (
                        <details
                            key={item.q}
                            className="group overflow-hidden rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-all duration-300 open:shadow-2xl hover:-translate-y-0.5 hover:shadow-2xl"
                        >
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-navy px-7 py-4 text-[16px] leading-[24px] font-semibold text-white transition-colors hover:bg-navydark">
                                {item.q}
                                <svg
                                    className="h-3 w-3 shrink-0 text-white transition-transform duration-200 group-open:-rotate-90"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                >
                                    <path d="M6 4l9 6-9 6z" />
                                </svg>
                            </summary>
                            <div className="space-y-4 border-t border-navy/10 bg-white px-7 py-5 text-[15px] leading-[23px] font-normal text-navy">
                                {item.a.map((paragraph, i) => (
                                    <p key={i}>{paragraph}</p>
                                ))}
                            </div>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
