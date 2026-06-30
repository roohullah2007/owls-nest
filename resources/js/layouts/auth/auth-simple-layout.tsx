import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import { cn } from '@/lib/utils';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh flex-col bg-sand lg:flex-row">
            {/* LEFT — branded navy hero panel (desktop only) */}
            <aside className="relative hidden w-1/2 overflow-hidden bg-navy lg:flex">
                <img
                    src="/images/hero-owls-nest-resort.webp"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-navy/65 via-navy/55 to-navydark/80" />

                <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
                    <Link
                        href={home()}
                        className="inline-flex w-fit items-center"
                        aria-label="Owl's Nest Real Estate — home"
                    >
                        <img
                            src="/images/logo.webp"
                            alt="Owl's Nest Real Estate"
                            className="h-12 w-auto brightness-0 invert"
                        />
                    </Link>

                    <div className="max-w-md">
                        <span className="block text-[13px] leading-[16px] font-semibold tracking-[0.2em] text-gold uppercase">
                            Owl's Nest Real Estate
                        </span>
                        <p className="mt-5 text-[clamp(28px,3vw,40px)] leading-[1.15] font-normal tracking-wide text-white uppercase [font-variation-settings:'opsz'_144,'wdth'_100]">
                            Your gateway to the White Mountains &amp; Lakes
                            Region
                        </p>
                        <p className="mt-6 text-sm leading-relaxed text-white/70">
                            Sign in to manage saved searches, favorite listings,
                            and connect with our Waterville Valley team.
                        </p>
                    </div>
                </div>
            </aside>

            {/* RIGHT — form panel */}
            <main className="flex w-full flex-1 items-center justify-center p-6 sm:p-10 lg:w-1/2">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col items-center gap-6 text-center">
                            <Link
                                href={home()}
                                className="inline-flex items-center lg:hidden"
                                aria-label="Owl's Nest Real Estate — home"
                            >
                                <img
                                    src="/images/logo.webp"
                                    alt="Owl's Nest Real Estate"
                                    className="h-12 w-auto"
                                />
                            </Link>

                            <div className="space-y-2">
                                <h1
                                    className={cn(
                                        'text-2xl font-semibold tracking-tight text-navy',
                                    )}
                                >
                                    {title}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
