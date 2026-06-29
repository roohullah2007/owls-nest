// "Recent Blog Posts": a big featured post beside three smaller ones, rotating
// through the slides with prev/next arrows.
import { cn } from '@/lib/utils';
import { Button } from '@/components/site/button';
import {
    CarouselArrowButton,
    Container,
    DisplayHeading,
} from '@/components/site/primitives';
import { useCarousel } from '@/hooks/use-carousel';
import { BLOG_SLIDES } from '@/data/home-blog';
import type { BlogSlide } from '@/data/home-blog';

interface BlogRotatorProps {
    heading?: string;
    slides?: BlogSlide[];
    /** "View Blog Posts" CTA destination. */
    href?: string;
}

export function BlogRotator({
    heading = 'Recent Blog Posts',
    slides = BLOG_SLIDES,
    href = '#',
}: BlogRotatorProps) {
    const { index, next, prev } = useCarousel(slides.length);
    const slide = slides[index];

    return (
        <section className="bg-white py-20">
            <Container>
                <DisplayHeading className="mb-8 text-[clamp(34px,5vw,52px)] text-navy">
                    {heading}
                </DisplayHeading>

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                    {/* LEFT: featured post */}
                    <div className="flex flex-col">
                        <div className="mb-8 w-full overflow-hidden">
                            <img
                                src={slide.big.image}
                                alt={slide.big.title}
                                className="h-[360px] w-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                        </div>
                        <p className="mb-3 text-[14px] leading-[20px] font-light text-gray-500">
                            {slide.big.date}
                        </p>
                        <a href={href} className="block">
                            <h3 className="mb-8 text-[28px] leading-[34px] font-light tracking-wide text-navy uppercase transition-colors [font-variation-settings:'opsz'_144,'wdth'_100] hover:text-gray-700">
                                {slide.big.title}
                            </h3>
                        </a>
                        <div className="mt-auto">
                            <Button
                                variant="outline-dark"
                                href={href}
                                affordance="line"
                            >
                                View Blog Posts
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT: 3 smaller posts */}
                    <div className="flex flex-col">
                        {slide.small.map((post, i) => (
                            <a
                                key={i}
                                href={href}
                                className={cn(
                                    'group grid grid-cols-[110px_1fr] items-center gap-4 border-b border-gray-300 sm:grid-cols-[200px_1fr] sm:gap-6',
                                    i === 0 ? 'pb-6' : 'py-6',
                                )}
                            >
                                <div className="h-[110px] w-full overflow-hidden">
                                    <img
                                        src={post.image}
                                        alt={post.title}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div>
                                    <p className="mb-2 text-[14px] leading-[20px] font-light text-gray-500">
                                        {post.date}
                                    </p>
                                    <h3 className="text-[20px] leading-[26px] font-light tracking-wide text-navy uppercase transition-colors [font-variation-settings:'opsz'_144,'wdth'_100] group-hover:text-gray-700">
                                        {post.title}
                                    </h3>
                                </div>
                            </a>
                        ))}

                        <div className="mt-auto flex justify-end gap-3 pt-6">
                            <CarouselArrowButton
                                direction="prev"
                                onClick={prev}
                                className="h-12 w-12"
                            />
                            <CarouselArrowButton
                                direction="next"
                                onClick={next}
                                className="h-12 w-12"
                            />
                        </div>
                    </div>
                </div>
            </Container>
        </section>
    );
}
