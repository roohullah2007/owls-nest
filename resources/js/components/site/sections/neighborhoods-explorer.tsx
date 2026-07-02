// Home "Neighborhoods": a clickable list on the left synced to a horizontal card
// rail on the right. Selecting a list row scrolls the rail to the matching card.
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/site/button';
import { Container, DisplayHeading } from '@/components/site/primitives';
import { CardRail } from '@/components/site/sections/card-rail';
import type { CardRailHandle } from '@/components/site/sections/card-rail';
import { CommunityCardOverlay } from '@/components/site/cards/community-card-overlay';
import { NEIGHBORHOODS } from '@/data/neighborhoods';
import type { Neighborhood } from '@/data/neighborhoods';

interface NeighborhoodsExplorerProps {
    heading?: string;
    neighborhoods?: Neighborhood[];
}

export function NeighborhoodsExplorer({
    heading = 'NEIGHBORHOODS',
    neighborhoods = NEIGHBORHOODS,
}: NeighborhoodsExplorerProps) {
    const railRef = useRef<CardRailHandle>(null);
    const [active, setActive] = useState(0);

    const select = (index: number) => {
        setActive(index);
        railRef.current?.scrollToIndex(index);
    };

    return (
        <section className="overflow-hidden bg-white py-20">
            <Container className="grid grid-cols-1 gap-10 lg:grid-cols-3">
                {/* LEFT: list */}
                <div className="flex flex-col">
                    <DisplayHeading className="mb-10 text-[clamp(34px,5vw,52px)] leading-[1.05] tracking-normal text-navy">
                        {heading}
                    </DisplayHeading>

                    <ul className="flex flex-col">
                        {neighborhoods.map((n, i) => (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => select(i)}
                                    className={cn(
                                        'flex w-full items-center justify-between border-b py-4 text-[18px] leading-[22px] font-light tracking-wide text-navy uppercase',
                                        i === active
                                            ? 'border-navy'
                                            : 'border-gray-300',
                                    )}
                                >
                                    <span>{n.name}</span>
                                    <svg
                                        className={cn(
                                            'h-4 w-4 transition-opacity',
                                            i === active
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 5l7 7-7 7"
                                        />
                                    </svg>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-auto flex justify-start pt-10">
                        <Button
                            variant="outline-dark"
                            href="/neighborhoods"
                            affordance="none"
                            className="w-full max-w-[280px]"
                        >
                            View All
                            <span className="h-px w-8 bg-gray-500" />
                        </Button>
                    </div>
                </div>

                {/* RIGHT: rail */}
                <div className="lg:col-span-2">
                    <CardRail
                        ref={railRef}
                        showArrows
                        arrowsClassName="justify-end mb-6"
                        className="lg:-mr-[220px]"
                        trackClassName="lg:pr-[240px]"
                    >
                        {neighborhoods.map((n) => (
                            <CommunityCardOverlay key={n.id} neighborhood={n} />
                        ))}
                    </CardRail>
                </div>
            </Container>
        </section>
    );
}
