// Navy band of three square teaser cards (Home Search / Home Valuation /
// Contact). Thin wrapper over the shared PathCard.
import { cn } from '@/lib/utils';
import { Container } from '@/components/site/primitives';
import { PathCard } from '@/components/site/cards/path-card';
import { PATH_CARDS } from '@/data/home-listings';
import type { PathCardItem } from '@/types/listing';

interface PathCardsProps {
    cards?: PathCardItem[];
    className?: string;
}

export function PathCards({ cards = PATH_CARDS, className }: PathCardsProps) {
    return (
        <section className={cn('bg-navy py-20', className)}>
            <Container className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {cards.map((card) => (
                    <PathCard key={card.title} card={card} />
                ))}
            </Container>
        </section>
    );
}
