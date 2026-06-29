// The one and only site navigation bar. Renders identically whether it sits at
// the top of an inner page or overlays the home hero (it's an opaque navy bar
// either way). Includes the Communities dropdown and a real mobile menu.
import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { NAV_LINKS, SITE } from '@/data/site';
import type { NavLink } from '@/data/site';
import { ChevronDownIcon } from '@/components/site/icons';

const LINK_CLASS =
    'uppercase whitespace-nowrap transition-colors hover:text-gray-300';

function isActive(currentUrl: string, href: string) {
    if (href === '/') {
        return currentUrl === '/';
    }

    return currentUrl.startsWith(href);
}

function DesktopLink({
    link,
    currentUrl,
}: {
    link: NavLink;
    currentUrl: string;
}) {
    if (link.children?.length) {
        return (
            <li className="group relative">
                <Link
                    href={link.href}
                    className={cn(
                        'flex cursor-pointer items-center gap-1',
                        LINK_CLASS,
                        isActive(currentUrl, link.href) && 'text-gray-300',
                    )}
                >
                    <span>{link.label}</span>
                    <ChevronDownIcon className="h-3 w-3" />
                </Link>
                <div className="invisible absolute top-full left-0 z-30 w-64 pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100">
                    <div className="border border-white bg-white shadow-lg">
                        {link.children.map((child) => (
                            <Link
                                key={child.href}
                                href={child.href}
                                className="block px-5 py-3 text-[13px] tracking-wide text-gray-800 uppercase transition-colors hover:bg-navy hover:text-white"
                            >
                                {child.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </li>
        );
    }

    return (
        <li>
            <Link
                href={link.href}
                className={cn(
                    LINK_CLASS,
                    isActive(currentUrl, link.href) && 'text-gray-300',
                )}
            >
                {link.label}
            </Link>
        </li>
    );
}

export function SiteHeader() {
    const { url } = usePage();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="relative z-20 w-full bg-navy/95">
            <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-4 lg:px-10">
                {/* Logo */}
                <Link href="/" className="flex-shrink-0">
                    <img
                        src={SITE.logo}
                        alt={SITE.name}
                        className="h-10 w-auto [filter:brightness(0)_invert(1)]"
                    />
                </Link>

                {/* Desktop menu */}
                <ul className="ml-auto hidden items-center gap-6 text-[13px] leading-[19px] font-normal tracking-wide text-white lg:flex">
                    {NAV_LINKS.map((link) => (
                        <DesktopLink
                            key={link.href}
                            link={link}
                            currentUrl={url}
                        />
                    ))}
                </ul>

                {/* Phone button (the one in §3 PhoneButton) */}
                <div className="ml-auto flex items-center gap-3 lg:ml-0">
                    <a
                        href={SITE.phoneHref}
                        className="hidden items-center justify-center rounded-full border border-white bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white md:inline-flex"
                    >
                        {SITE.phoneDisplay}
                    </a>

                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        aria-label="Toggle menu"
                        aria-expanded={mobileOpen}
                        onClick={() => setMobileOpen((o) => !o)}
                        className="inline-flex h-10 w-10 items-center justify-center text-white lg:hidden"
                    >
                        <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {mobileOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile panel */}
            {mobileOpen && (
                <div className="border-t border-white/10 bg-navy/95 lg:hidden">
                    <ul className="flex flex-col px-6 py-4 text-[13px] tracking-wide text-white">
                        {NAV_LINKS.map((link) => (
                            <li
                                key={link.href}
                                className="border-b border-white/10 last:border-0"
                            >
                                <Link
                                    href={link.href}
                                    className="block py-3 uppercase"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {link.label}
                                </Link>
                                {link.children?.map((child) => (
                                    <Link
                                        key={child.href}
                                        href={child.href}
                                        className="block py-2 pl-4 text-[12px] text-gray-300 uppercase"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        {child.label}
                                    </Link>
                                ))}
                            </li>
                        ))}
                        <li className="pt-4">
                            <a
                                href={SITE.phoneHref}
                                className="inline-flex items-center justify-center rounded-full border border-white bg-white px-6 py-3 text-sm font-semibold text-navy"
                            >
                                {SITE.phoneDisplay}
                            </a>
                        </li>
                    </ul>
                </div>
            )}
        </nav>
    );
}
