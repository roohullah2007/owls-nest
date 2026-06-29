// THE button for the marketing site. Every CTA renders this with a `variant`.
// Never hand-write pill/border button markup in a page — add a variant here.
import { Link } from '@inertiajs/react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRightIcon } from './icons';

export type ButtonVariant =
    | 'solid' // navy pill, used inside the hero search bar
    | 'outline-dark' // navy-bordered pill on light backgrounds (most common CTA)
    | 'outline-light' // white-bordered pill on navy/photo backgrounds
    | 'square-dark'; // navy-bordered square button ("Get Started")

const BASE =
    'group inline-flex items-center justify-center font-semibold uppercase transition-colors';

const VARIANTS: Record<ButtonVariant, string> = {
    solid: 'gap-2 rounded-full bg-navy px-5 py-3 text-[13px] tracking-[0.1em] text-white hover:bg-navydark sm:px-7',
    'outline-dark':
        'gap-3 rounded-full border border-navy px-8 py-3 text-[12px] leading-[16px] tracking-widest text-navy hover:bg-navy hover:text-white',
    'outline-light':
        'rounded-full border border-white px-8 py-3 text-[12px] leading-[16px] tracking-widest text-white hover:bg-white hover:text-navy',
    'square-dark':
        'gap-2 border border-navy px-6 py-3 text-[14px] tracking-wide text-navy hover:bg-navy hover:text-white',
};

interface CommonProps {
    variant?: ButtonVariant;
    className?: string;
    children: ReactNode;
    /** Trailing affordance: solid arrow, a short underline rule, or none. */
    affordance?: 'arrow' | 'line' | 'none';
}

type ButtonAsLink = CommonProps & {
    href: string;
} & Omit<ComponentProps<'a'>, 'href' | 'className' | 'children'>;

type ButtonAsButton = CommonProps & {
    href?: undefined;
} & Omit<ComponentProps<'button'>, 'className' | 'children'>;

export type ButtonProps = ButtonAsLink | ButtonAsButton;

function Affordance({
    kind,
}: {
    kind: NonNullable<CommonProps['affordance']>;
}) {
    if (kind === 'arrow') {
        return <ArrowRightIcon className="h-3 w-3" />;
    }

    if (kind === 'line') {
        return <span className="h-px w-8 bg-current" />;
    }

    return null;
}

export function Button({
    variant = 'outline-dark',
    className,
    children,
    affordance = 'none',
    ...rest
}: ButtonProps) {
    const classes = cn(BASE, VARIANTS[variant], className);
    const inner = (
        <>
            {children}
            <Affordance kind={affordance} />
        </>
    );

    if ('href' in rest && rest.href !== undefined) {
        const { href, onClick, target, rel, ...anchorRest } =
            rest as ButtonAsLink;

        // Internal app routes go through Inertia; everything else is a plain <a>.
        if (href.startsWith('/')) {
            return (
                <Link href={href} className={classes} target={target} rel={rel}>
                    {inner}
                </Link>
            );
        }

        return (
            <a
                href={href}
                className={classes}
                onClick={onClick}
                target={target}
                rel={rel}
                {...anchorRest}
            >
                {inner}
            </a>
        );
    }

    const buttonRest = rest as ButtonAsButton;

    return (
        <button className={classes} {...buttonRest}>
            {inner}
        </button>
    );
}
