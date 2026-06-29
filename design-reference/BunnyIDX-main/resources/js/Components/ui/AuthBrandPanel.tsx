import Logo from '@/Components/ui/Logo';

interface Feature {
    title: string;
    description: string;
    icon: JSX.Element;
}

const FEATURES: Feature[] = [
    {
        title: 'IDX websites that convert',
        description: 'Branded, MLS-powered sites in minutes — no code.',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 9h18M7 6.5h.01M10 6.5h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        title: 'Live MLS & IDX search',
        description: 'Real-time listings across every connection in one search.',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    {
        title: 'CRM, deals & AI assist',
        description: 'Track leads, close deals, and let AI handle the busywork.',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
                <path d="M12 3 4 7v5c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V7l-8-4Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
];

/** Property photo behind the brand panel (downloaded locally — see public/images/backgrounds). */
const BG_IMAGE = '/images/backgrounds/bg-1.jpg';

/**
 * Dark brand panel for the auth screens — a real-estate background photo behind
 * a dark overlay (keeps the white headline/features legible) plus the SVG grid
 * texture and teal glow accents for brand depth.
 */
export default function AuthBrandPanel() {
    return (
        <div className="relative hidden w-1/2 overflow-hidden bg-[#0B0E11] lg:flex">
            {/* Background photo */}
            <img
                src={BG_IMAGE}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Flat dark overlay — tints the whole photo so the white text reads clearly (no grid). */}
            <div className="pointer-events-none absolute inset-0 bg-[#0B0E11]/70" />
            {/* Depth gradient — stronger top & bottom (behind brand mark + trust row), lighter middle. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B0E11]/80 via-[#0B0E11]/40 to-[#0B0E11]/90" />

            <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
                {/* Brand */}
                <div className="flex items-center gap-2.5">
                    <Logo variant="icon" size="default" className="text-[#1693C9]" />
                    <span className="text-xl font-semibold text-white">BunnyChamp</span>
                </div>

                {/* Headline + features */}
                <div className="max-w-md">
                    <h2 className="text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.75rem]">
                        The all-in-one platform for{' '}
                        <span className="text-[#3FB6E5]">modern real estate.</span>
                    </h2>
                    <p className="mt-5 text-base leading-relaxed text-white/60">
                        CRM, MLS search, and stunning agent websites — built for agents and teams who want to move faster.
                    </p>

                    <ul className="mt-10 space-y-5">
                        {FEATURES.map((feature) => (
                            <li key={feature.title} className="flex items-start gap-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1693C9]/15 text-[#3FB6E5] ring-1 ring-inset ring-white/10">
                                    {feature.icon}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-white">{feature.title}</p>
                                    <p className="mt-0.5 text-sm text-white/50">{feature.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer trust row */}
                <div className="flex items-center gap-6 text-xs text-white/45">
                    <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#63A205]" />
                        Trusted by agents nationwide
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#3FB6E5]" />
                        Real-time MLS data
                    </span>
                </div>
            </div>
        </div>
    );
}
