// Small shared typographic / layout primitives reused across many sections.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Centered max-width content wrapper used by nearly every section. */
export function Container({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('mx-auto max-w-[1400px] px-6 lg:px-10', className)}>
            {children}
        </div>
    );
}

/** Uppercase, wide-tracked eyebrow label above headings. */
export function Eyebrow({
    children,
    className,
    tone = 'dark',
}: {
    children: ReactNode;
    className?: string;
    tone?: 'dark' | 'light';
}) {
    return (
        <span
            className={cn(
                'text-[13px] leading-[16px] font-semibold tracking-[0.2em] uppercase',
                tone === 'light' ? 'text-white' : 'text-navy',
                className,
            )}
        >
            {children}
        </span>
    );
}

/** Large variable-font display heading (design contract opsz/wdth setting). */
export function DisplayHeading({
    children,
    className,
    as: Tag = 'h2',
}: {
    children: ReactNode;
    className?: string;
    as?: 'h1' | 'h2' | 'h3';
}) {
    return (
        <Tag
            className={cn(
                "leading-[1.1] font-normal tracking-wide uppercase [font-variation-settings:'opsz'_144,'wdth'_100]",
                className,
            )}
        >
            {children}
        </Tag>
    );
}

/** Round prev/next arrow button used by card rails and carousels. */
export function CarouselArrowButton({
    direction,
    tone = 'dark',
    className,
    ...props
}: {
    direction: 'prev' | 'next';
    tone?: 'dark' | 'light';
} & React.ComponentProps<'button'>) {
    return (
        <button
            type="button"
            aria-label={direction === 'prev' ? 'Previous' : 'Next'}
            className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full border transition-colors',
                tone === 'dark'
                    ? 'border-gray-400 text-gray-700 hover:border-navy hover:bg-navy hover:text-white'
                    : 'border-white/50 text-white hover:bg-white hover:text-navy',
                className,
            )}
            {...props}
        >
            <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                {direction === 'prev' ? (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                    />
                ) : (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                    />
                )}
            </svg>
        </button>
    );
}
