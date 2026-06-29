// White "article" card for the Neighborhoods page grid: image on top, body with
// title + description + a "Read More" link. Data-driven, one per area/project.
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import type { NeighborhoodCard as NeighborhoodCardData } from '@/data/neighborhood-cards';

interface NeighborhoodCardProps {
    neighborhood: NeighborhoodCardData;
    className?: string;
}

export function NeighborhoodCard({
    neighborhood,
    className,
}: NeighborhoodCardProps) {
    const { name, image, description, href } = neighborhood;

    return (
        <article
            className={cn(
                'group flex flex-col overflow-hidden bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl',
                className,
            )}
        >
            <div className="overflow-hidden">
                <img
                    src={image}
                    alt={name}
                    className="h-[240px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>
            <div className="flex flex-1 flex-col p-7">
                <h3 className="text-[22px] leading-[28px] font-semibold text-navy">
                    {name}
                </h3>
                <p className="mt-3 flex-1 text-[15px] leading-[24px] font-normal text-[#444]">
                    {description}
                </p>
                <Link
                    href={href}
                    className="mt-5 flex items-center gap-2 border-t border-gray-200 pt-4 text-[13px] font-semibold tracking-[0.1em] text-navy uppercase transition-colors hover:text-gold"
                >
                    Read More
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
                </Link>
            </div>
        </article>
    );
}
