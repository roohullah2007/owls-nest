// Brand/social SVG icons used across the site. Kept in one place so the exact
// paths from the design contract are never re-pasted into markup.
import type { SVGProps } from 'react';

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692V11.09h3.128V8.413c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.464.099 2.797.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.616h-3.12V24h6.116C23.407 24 24 23.407 24 22.676V1.325C24 .593 23.407 0 22.675 0z" />
        </svg>
    );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
            />
        </svg>
    );
}

// Small solid play-style arrow used inside primary buttons.
export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
            <path d="M7 4l8 6-8 6z" />
        </svg>
    );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
            />
        </svg>
    );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
            />
        </svg>
    );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
        </svg>
    );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
            />
        </svg>
    );
}

// Listing spec icons (bed / bath / floor-area) shared by the listing cards.
export function BedIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12h18M3 12v6a2 2 0 002 2h14a2 2 0 002-2v-6M3 12V6a2 2 0 012-2h14a2 2 0 012 2v6"
            />
        </svg>
    );
}

export function BathIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 10V6a2 2 0 012-2h2v6M4 10h16M4 10v8a2 2 0 002 2h12a2 2 0 002-2v-8"
            />
        </svg>
    );
}

export function AreaIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
            />
        </svg>
    );
}

export function HeartIcon({
    filled = false,
    ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) {
    return (
        <svg
            fill={filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
        </svg>
    );
}
