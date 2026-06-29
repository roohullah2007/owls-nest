// Navy band of "Popular Searches" link columns. Data-driven so it can be reused
// wherever a grouped link directory is needed.
import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { Container, DisplayHeading } from '@/components/site/primitives';
import type { SearchColumn } from '@/data/popular-searches';

interface PopularSearchesProps {
    heading?: string;
    columns: SearchColumn[];
    className?: string;
}

export function PopularSearches({
    heading = 'Popular Searches',
    columns,
    className,
}: PopularSearchesProps) {
    return (
        <section className={cn('bg-navy py-20', className)}>
            <Container>
                <DisplayHeading className="mb-12 text-center text-[clamp(34px,5vw,52px)] text-white">
                    {heading}
                </DisplayHeading>

                <div className="grid grid-cols-1 gap-x-10 gap-y-12 text-left sm:grid-cols-2 lg:grid-cols-3">
                    {columns.map((column) => (
                        <div key={column.title}>
                            <h3 className="mb-5 text-[20px] leading-[26px] font-light text-white [font-variation-settings:'opsz'_144,'wdth'_100]">
                                {column.title}
                            </h3>
                            <ul className="space-y-2 text-[15px] leading-[24px] text-white/85">
                                {column.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="transition-colors hover:text-gold"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}
