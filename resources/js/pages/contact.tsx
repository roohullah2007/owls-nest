import { Head, Link } from '@inertiajs/react';
import { ContactForm } from '@/components/site/forms/contact-form';
import { FacebookIcon, InstagramIcon, XIcon } from '@/components/site/icons';
import { SITE } from '@/data/site';
import { SiteLayout } from '@/layouts/site-layout';

// Contact is a standalone fullscreen "Get In Touch" modal: no navbar, just a
// close-X back home, a two-column info + form layout, and the shared footer.
// Design contract: design-reference/contact.html.

const SOCIAL_CLASS =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white text-white transition-colors hover:border-gold hover:bg-gold';
const INFO_TEXT = 'text-[16px] font-light uppercase leading-[22px] text-white';

export default function Contact() {
    return (
        <SiteLayout showHeader={false}>
            <Head title="Contact - Owl's Nest Real Estate" />

            <section className="relative min-h-screen w-full overflow-hidden bg-navy">
                {/* Right-side background image (desktop only) */}
                <div className="absolute top-0 right-0 hidden h-full w-[35%] lg:block">
                    <img
                        src="/images/contact-hero.webp"
                        alt="Luxury home staircase"
                        className="h-full w-full object-cover"
                    />
                </div>

                {/* Close X (exits to home) */}
                <Link
                    href="/"
                    aria-label="Close"
                    className="absolute top-5 right-5 z-30 text-white transition-opacity hover:opacity-70 sm:top-6 sm:right-8"
                >
                    <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </Link>

                <div className="relative z-10 w-full">
                    <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:px-16 lg:py-32">
                        {/* LEFT: Get in touch info */}
                        <div className="text-white">
                            <h2 className="mb-10 text-[clamp(34px,6vw,55px)] leading-[1.05] font-normal text-white sm:mb-14 lg:mb-16">
                                GET IN TOUCH
                            </h2>

                            <div className="mb-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
                                <div>
                                    <p className="mb-4 text-[16px] leading-[22px] font-light text-white uppercase">
                                        {SITE.name}
                                    </p>
                                    <a
                                        href={SITE.phoneHref}
                                        className="mb-1 block text-[16px] leading-[22px] font-light break-words text-white underline"
                                    >
                                        {SITE.phoneDisplay}
                                    </a>
                                    <a
                                        href={`mailto:${SITE.email}`}
                                        className="block text-[16px] leading-[22px] font-light break-words text-white underline"
                                    >
                                        {SITE.email}
                                    </a>
                                </div>
                                <div>
                                    <p className={INFO_TEXT}>
                                        {SITE.address.line1}
                                    </p>
                                    <p className={INFO_TEXT}>
                                        {SITE.address.line2}
                                    </p>
                                </div>
                            </div>

                            {/* Social icons */}
                            <div className="flex flex-wrap items-center gap-3">
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

                        {/* RIGHT: White form card (overlays the image) */}
                        <ContactForm />
                    </div>
                </div>
            </section>
        </SiteLayout>
    );
}
