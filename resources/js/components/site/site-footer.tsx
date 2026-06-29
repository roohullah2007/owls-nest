// The one site footer. Identical on every public page (design contract).
import { Link } from '@inertiajs/react';
import { FacebookIcon, InstagramIcon, XIcon } from '@/components/site/icons';
import { SITE, FOOTER_NAV, MLS_DISCLAIMER } from '@/data/site';

const SOCIAL_CLASS =
    'flex h-9 w-9 items-center justify-center rounded-full border border-white text-white transition-colors hover:bg-white hover:text-navy';
const COL_LABEL =
    'mb-3 text-[12px] font-light uppercase leading-[16px] tracking-[0.15em] text-white';
const COL_TEXT = 'text-[14px] font-light uppercase leading-[20px] text-white';

export function SiteFooter() {
    return (
        <footer className="bg-navy pt-20 pb-8 font-light">
            <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
                {/* Top row: logo + social */}
                <div className="mb-10 flex items-start justify-between">
                    <img
                        src={SITE.logo}
                        alt={SITE.name}
                        className="h-10 w-auto [filter:brightness(0)_invert(1)]"
                    />
                    <div className="flex items-center gap-3">
                        <a
                            href={SITE.social.facebook}
                            aria-label="Facebook"
                            className={SOCIAL_CLASS}
                        >
                            <FacebookIcon className="h-4 w-4" />
                        </a>
                        <a
                            href={SITE.social.instagram}
                            aria-label="Instagram"
                            className={SOCIAL_CLASS}
                        >
                            <InstagramIcon className="h-4 w-4" />
                        </a>
                        <a
                            href={SITE.social.x}
                            aria-label="X"
                            className={SOCIAL_CLASS}
                        >
                            <XIcon className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>

                {/* Contact / Office / Navigation */}
                <div className="mb-12 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0">
                    <div className="sm:pr-8">
                        <p className={COL_LABEL}>Contact</p>
                        <a
                            href={SITE.phoneHref}
                            className="mb-1 block text-[14px] leading-[20px] font-light text-white underline"
                        >
                            {SITE.phoneDisplay}
                        </a>
                        <a
                            href={`mailto:${SITE.email}`}
                            className="block text-[14px] leading-[20px] font-light text-white uppercase underline"
                        >
                            {SITE.email}
                        </a>
                    </div>
                    <div className="sm:border-l sm:border-white/20 sm:px-8">
                        <p className={COL_LABEL}>Office</p>
                        <p className={COL_TEXT}>{SITE.address.line1}</p>
                        <p className={COL_TEXT}>{SITE.address.line2}</p>
                    </div>
                    <div className="sm:border-l sm:border-white/20 sm:pl-8">
                        <p className={COL_LABEL}>Navigation</p>
                        <nav className="flex flex-col gap-2">
                            {FOOTER_NAV.map((item) =>
                                item.href.startsWith('/') ? (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className="text-[14px] leading-[20px] font-light tracking-[0.1em] text-white uppercase underline"
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className="text-[14px] leading-[20px] font-light tracking-[0.1em] text-white uppercase underline"
                                    >
                                        {item.label}
                                    </a>
                                ),
                            )}
                        </nav>
                    </div>
                </div>

                <div className="mb-6 border-t border-white/20" />

                <p className="mb-8 text-[14px] leading-[20px] font-light text-white">
                    {MLS_DISCLAIMER}
                </p>

                <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <img
                        src={SITE.realtorEhoLogo}
                        alt="Realtor and Equal Housing Opportunity"
                        className="h-12 w-auto flex-shrink-0 [filter:brightness(0)_invert(1)]"
                    />
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] leading-[20px] font-light text-gray-200">
                        <span>
                            &copy; 2026 Owl's Nest Real Estate. All rights
                            reserved
                        </span>
                        <span className="text-white/30">|</span>
                        <a
                            href="#"
                            className="text-gray-200 uppercase underline"
                        >
                            Privacy Policy
                        </a>
                        <span className="text-white/30">|</span>
                        <a
                            href="#"
                            className="text-gray-200 uppercase underline"
                        >
                            Sitemap
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
