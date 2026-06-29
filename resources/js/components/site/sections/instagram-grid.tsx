// "Follow Us On Instagram" band: a circular IG button, eyebrow + @handle, then a
// responsive 6-up image grid with hover-zoom tiles. Reused anywhere we surface
// the brand's Instagram feed.
import { Container } from '@/components/site/primitives';
import { InstagramIcon } from '@/components/site/icons';

const IG_URL = 'https://instagram.com/owlsnestrealestate';

const DEFAULT_IMAGES = [
    '/images/ig-1.webp',
    '/images/ig-2.webp',
    '/images/ig-3.webp',
    '/images/ig-4.webp',
    '/images/ig-5.webp',
    '/images/ig-6.webp',
];

interface InstagramGridProps {
    heading?: string;
    handle?: string;
    images?: string[];
    className?: string;
}

export function InstagramGrid({
    heading = 'Follow Us On Instagram',
    handle = '@OwlsNestRE',
    images = DEFAULT_IMAGES,
    className,
}: InstagramGridProps) {
    return (
        <section className={className ?? 'bg-white pt-20 pb-0'}>
            <Container className="max-w-[1400px] text-center lg:px-16">
                <div className="mb-6 flex justify-center">
                    <a
                        href={IG_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Owl's Nest Real Estate on Instagram"
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white transition-colors hover:bg-navydark"
                    >
                        <InstagramIcon className="h-5 w-5" />
                    </a>
                </div>
                <p className="mb-4 text-[12px] leading-[16px] font-semibold tracking-[0.2em] text-navy uppercase">
                    {heading}
                </p>
                <h2 className="mb-12 text-[52px] leading-[60px] font-normal text-navy">
                    {handle}
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    {images.map((src, index) => (
                        <a
                            key={src}
                            href={IG_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square overflow-hidden"
                        >
                            <img
                                src={src}
                                alt={`Instagram post ${index + 1}`}
                                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                        </a>
                    ))}
                </div>
            </Container>
        </section>
    );
}
