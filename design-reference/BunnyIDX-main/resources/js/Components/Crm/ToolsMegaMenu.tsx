import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { PageProps } from '@/types';

type Status = 'available' | 'coming_soon' | 'requires_setup';

interface MenuItem {
    title: string;
    description: string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    href?: string;
    hrefParams?: any;
    status: Status;
    /** Plan feature key required to use this tool (omit for ungated tools). */
    feature?: string;
}

const PIN = (path: string) => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

// One single list — tools + services together, no separate sections.
const items: MenuItem[] = [
    {
        title: 'Websites',
        description: 'Agent websites with built-in IDX.',
        icon: PIN('M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21'),
        iconBg: '#EBF5FF', iconColor: '#1693C9',
        href: 'crm.websites.index', status: 'available', feature: 'websites',
    },
    {
        title: 'Landing Pages',
        description: 'Single-page lead capture.',
        icon: PIN('M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25'),
        iconBg: '#FEF3C7', iconColor: '#D97706',
        href: 'crm.landing-pages.index', status: 'available', feature: 'websites',
    },
    {
        title: 'Listing Pages',
        description: 'IDX squeeze pages for a single listing.',
        icon: PIN('M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21'),
        iconBg: '#FFE4E0', iconColor: '#F0563F',
        href: 'crm.listing-pages.index', status: 'available', feature: 'websites',
    },
    {
        title: 'Chatbots',
        description: 'AI assistants 24/7.',
        icon: PIN('M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z'),
        iconBg: '#FCE7F3', iconColor: '#9D174D',
        status: 'coming_soon',
    },
    {
        title: 'Gmail Accounts',
        description: 'Branded inboxes on your own domain.',
        icon: PIN('M3.75 6.75A2.25 2.25 0 0 1 6 4.5h12a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V6.75ZM6 8.25l6 4.5 6-4.5M7.5 16.5v-6L12 13.5l4.5-3v6'),
        iconBg: '#FEE2E2', iconColor: '#B91C1C',
        status: 'coming_soon',
    },
    {
        title: 'Phone Numbers',
        description: 'Local numbers for calling and SMS.',
        icon: PIN('M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z'),
        iconBg: '#DCFCE7', iconColor: '#15803D',
        status: 'coming_soon',
    },
    {
        title: 'Advertising Services',
        description: 'Google & Facebook Ads, SEO, social.',
        icon: PIN('M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46'),
        iconBg: '#FEF2F2', iconColor: '#DC2626',
        href: 'crm.tools.index', status: 'requires_setup',
    },
];

function Item({ item, locked }: { item: MenuItem; locked: boolean }) {
    const disabled = item.status === 'coming_soon';
    const inner = (
        <div className={`group flex gap-3 p-2.5 rounded-lg transition-colors ${disabled ? 'cursor-not-allowed' : 'hover:bg-[#F3F4F6]'}`}>
            <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-white border border-[#E4E7EB] text-[#111315]">
                {item.icon}
            </span>
            <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#111315]">
                    <span className="truncate">{item.title}</span>
                    {locked && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded px-1 py-0.5">
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            Upgrade
                        </span>
                    )}
                </span>
                <p className="text-[11px] text-[#111315] truncate">{item.description}</p>
            </div>
        </div>
    );
    if (disabled) return <div>{inner}</div>;
    // Locked tools route to the upgrade page instead of the (server-gated) tool.
    if (locked) return <Link href={route('crm.settings.tab', { tab: 'subscription' })}>{inner}</Link>;
    if (!item.href) return <div>{inner}</div>;
    const href = item.hrefParams !== undefined ? route(item.href, item.hrefParams) : route(item.href);
    return <Link href={href}>{inner}</Link>;
}

export default function ToolsMegaMenu({ isActive }: { isActive: boolean }) {
    const { auth } = usePage<PageProps>().props;
    const features = auth.features ?? {};
    // Admins bypass feature gates (mirrors the server-side EnsureFeature middleware).
    const isLocked = (feature?: string) => !!feature && !auth.is_admin && !features[feature];

    const [open, setOpen] = useState(false);
    const closeTimer = useRef<number | null>(null);

    const handleEnter = () => {
        if (closeTimer.current) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
        setOpen(true);
    };
    const handleLeave = () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setOpen(false), 150);
    };

    useEffect(() => () => {
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
    }, []);

    return (
        <div
            className="relative flex items-stretch"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            <Link
                href={route('crm.tools.index')}
                className={`flex items-center gap-1 px-3.5 lg:px-4 text-[13px] font-semibold border-r border-white/10 transition-colors whitespace-nowrap text-white ${
                    isActive || open
                        ? 'bg-white/15'
                        : 'hover:bg-white/10'
                }`}
            >
                Marketing
                <svg className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </Link>

            {open && (
                <div className="absolute right-0 top-full z-[1001] w-[min(720px,calc(100vw-2rem))] mr-2">
                    <div className="bg-white border border-[#E4E7EB] rounded-xl shadow-2xl overflow-hidden">
                        {/* One single list — tools + services together, no section headings. */}
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {items.map((item) => (
                                <Item key={item.title} item={item} locked={isLocked(item.feature)} />
                            ))}
                        </div>
                        <div className="bg-[#F9FAFB] px-5 py-2.5 border-t border-[#F3F4F6] flex items-center justify-between">
                            <span className="text-[11px] text-[#8B9096]">Browse the full catalog with descriptions and CTAs.</span>
                            <Link
                                href={route('crm.tools.index')}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1693C9] hover:text-[#1380AF]"
                            >
                                Open Marketing
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
