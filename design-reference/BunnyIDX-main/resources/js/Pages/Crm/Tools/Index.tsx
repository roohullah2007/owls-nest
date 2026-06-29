import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link } from '@inertiajs/react';
import { ReactNode, useMemo, useState } from 'react';

type Status = 'available' | 'coming_soon' | 'requires_setup';

interface ToolCard {
    title: string;
    description: string;
    icon: ReactNode;
    href?: string;
    /** Optional positional params for `route()` when href needs them (e.g. tab names). */
    hrefParams?: any;
    external?: boolean;
    cta: string;
    status?: Status;
}

const PIN = (path: string) => (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const tools: ToolCard[] = [
    {
        title: 'Websites',
        description: 'Launch an agent website in minutes. Pick a template, customize the brand, and your IDX feed plugs in automatically.',
        icon: PIN('M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21'),
        href: 'crm.websites.index',
        cta: 'Create Websites',
        status: 'available',
    },
    {
        title: 'Landing Pages',
        description: 'Single-page squeeze pages tuned for lead capture — perfect for paid ad traffic and property campaigns.',
        icon: PIN('M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25'),
        href: 'crm.landing-pages.index',
        cta: 'Manage Landing Pages',
        status: 'available',
    },
    {
        title: 'Chatbots',
        description: 'AI assistants on your website and SMS — qualify leads 24/7 and book showings on your behalf.',
        icon: PIN('M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z'),
        cta: 'Coming soon',
        status: 'coming_soon',
    },
];

const businessEmails: ToolCard[] = [
    {
        title: 'Custom Domain Email',
        description: 'Buy and host professional inboxes on your own domain — you@yourbrokerage.com — provisioned in minutes.',
        icon: PIN('M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75'),
        cta: 'Buy email',
        status: 'coming_soon',
    },
    {
        title: 'Connect Gmail',
        description: 'Connect a Google Workspace or Gmail account to send and receive from BunnyIDX. Replies sync straight into the contact timeline.',
        icon: PIN('M3.75 6.75A2.25 2.25 0 0 1 6 4.5h12a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V6.75ZM6 8.25l6 4.5 6-4.5M7.5 16.5v-6L12 13.5l4.5-3v6'),
        cta: 'Connect Gmail',
        status: 'coming_soon',
    },
    {
        title: 'Connect Outlook',
        description: 'Plug in Microsoft 365 / Outlook so your business email lives inside the CRM — send, receive, and track opens.',
        icon: PIN('M3.75 5.25h16.5v13.5H3.75zM3.75 5.25l8.25 6.75 8.25-6.75'),
        cta: 'Connect Outlook',
        status: 'coming_soon',
    },
    {
        title: 'Email Signatures',
        description: 'Branded, role-aware signatures applied to every outbound email — photo, license, social links, all in one place.',
        icon: PIN('M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10'),
        cta: 'Coming soon',
        status: 'coming_soon',
    },
];

const services: ToolCard[] = [
    {
        title: 'Google Ads',
        description: 'Done-for-you Google Search & Display campaigns targeting buyers and sellers in your farm area. Track ROI in CRM.',
        icon: PIN('M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z'),
        cta: 'Request consultation',
        status: 'requires_setup',
    },
    {
        title: 'Facebook Ads',
        description: 'Hyper-targeted Facebook & Instagram lead campaigns with creative templates proven for real-estate audiences.',
        icon: PIN('M21 12.5a9 9 0 1 0-10.4 8.9v-6.3H8.4v-2.6h2.2V10c0-2.2 1.3-3.4 3.3-3.4.9 0 1.9.2 1.9.2v2.1h-1.1c-1 0-1.4.7-1.4 1.4v1.6h2.4l-.4 2.6h-2v6.3A9 9 0 0 0 21 12.5'),
        cta: 'Request consultation',
        status: 'requires_setup',
    },
    {
        title: 'SEO & AEO',
        description: 'Get found in Google and answered by ChatGPT/Perplexity. Local SEO + Answer-Engine Optimization tuned for agents.',
        icon: PIN('m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z'),
        cta: 'Request consultation',
        status: 'requires_setup',
    },
    {
        title: 'Social Media',
        description: 'Done-for-you social presence — posts, reels, story templates and engagement, all branded for your business.',
        icon: PIN('M6.115 5.19l.319 1.913A6 6 0 0 0 8.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 0 0 2.288-4.042 1.087 1.087 0 0 0-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 0 1-.98-.314l-.295-.295a1.125 1.125 0 0 1 0-1.591l.13-.132a1.125 1.125 0 0 1 1.3-.21l.603.302a.809.809 0 0 0 1.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 0 0 1.528-1.732l.146-.292M6.115 5.19A9 9 0 1 0 17.18 4.64M6.115 5.19A8.965 8.965 0 0 1 12 3c1.929 0 3.716.607 5.18 1.64'),
        cta: 'Request consultation',
        status: 'requires_setup',
    },
];

function statusPill(status?: Status) {
    if (status === 'coming_soon') return { label: 'Coming soon', bg: '#F3F4F6', text: '#8B9096' };
    if (status === 'requires_setup') return { label: 'Service', bg: '#F3F4F6', text: '#5F656D' };
    return { label: 'Available', bg: '#E0F2FE', text: '#1693C9' };
}

function Card({ tool }: { tool: ToolCard }) {
    const pill = statusPill(tool.status);
    const disabled = tool.status === 'coming_soon';
    const cta = (
        <button
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg transition-colors ${
                disabled
                    ? 'text-[#8B9096] bg-[#F3F4F6] cursor-not-allowed'
                    : 'text-white bg-[#1693C9] hover:bg-[#1380AF]'
            }`}
        >
            {tool.cta}
            {!disabled && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            )}
        </button>
    );

    return (
        <div className="group bg-white border border-[#E4E7EB] rounded-xl p-5 hover:border-[#1693C9] hover:shadow-sm transition-all flex flex-col">
            <div className="flex items-start justify-between mb-4">
                <span className="h-11 w-11 inline-flex items-center justify-center rounded-lg bg-[#E0F2FE] text-[#1693C9]">
                    {tool.icon}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ backgroundColor: pill.bg, color: pill.text }}>
                    {pill.label}
                </span>
            </div>
            <h3 className="text-[15px] font-semibold text-[#111315]">{tool.title}</h3>
            <p className="text-xs text-[#5F656D] leading-relaxed mt-1.5 flex-1">{tool.description}</p>
            <div className="mt-4">
                {tool.href && !disabled ? (
                    tool.external
                        ? <a href={tool.href} target="_blank" rel="noopener noreferrer">{cta}</a>
                        : <Link href={tool.hrefParams !== undefined ? route(tool.href, tool.hrefParams) : route(tool.href)}>{cta}</Link>
                ) : cta}
            </div>
        </div>
    );
}

function matchTool(t: ToolCard, q: string) {
    if (!q) return true;
    const needle = q.toLowerCase();
    return t.title.toLowerCase().includes(needle) || t.description.toLowerCase().includes(needle);
}

export default function ToolsIndex() {
    const [query, setQuery] = useState('');

    const filteredTools = useMemo(() => tools.filter((t) => matchTool(t, query)), [query]);
    const filteredEmails = useMemo(() => businessEmails.filter((t) => matchTool(t, query)), [query]);
    const filteredServices = useMemo(() => services.filter((t) => matchTool(t, query)), [query]);

    const hasAny = filteredTools.length + filteredEmails.length + filteredServices.length > 0;

    return (
        <CrmLayout>
            <Head title="Marketing" />

            <div className="min-h-[calc(100vh-56px)] bg-[#F7F8FB]">
                <div className="max-w-[1350px] mx-auto p-4 sm:p-5 md:p-6 space-y-6">
                    {/* Page header — title + inline search, matching the Calendar page */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-lg font-normal text-[#111315]">Marketing</h1>

                        <div className="flex-1" />

                        <div className="relative w-full sm:w-72">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search tools, services…"
                                className="w-full h-9 pl-9 pr-3 bg-white border border-[#C8CCD1] rounded-[4px] text-xs text-[#111315] placeholder:text-[#8B9096] focus:outline-none focus:border-[#1693C9] transition-colors"
                            />
                        </div>
                    </div>

                    {filteredTools.length > 0 && (
                        <section>
                            <h2 className="text-lg font-normal text-[#111315] mb-3">Tools</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredTools.map((t) => <Card key={t.title} tool={t} />)}
                            </div>
                        </section>
                    )}

                    {filteredEmails.length > 0 && (
                        <section>
                            <h2 className="text-lg font-normal text-[#111315] mb-3">Business Emails</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredEmails.map((b) => <Card key={b.title} tool={b} />)}
                            </div>
                        </section>
                    )}

                    {filteredServices.length > 0 && (
                        <section>
                            <h2 className="text-lg font-normal text-[#111315] mb-3">Services</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {filteredServices.map((s) => <Card key={s.title} tool={s} />)}
                            </div>
                        </section>
                    )}

                    {!hasAny && (
                        <div className="bg-white border border-[#E4E7EB] rounded-xl px-5 py-12 text-center">
                            <p className="text-sm text-[#5F656D]">No matches for "{query}".</p>
                            <button onClick={() => setQuery('')} className="mt-2 text-xs font-medium text-[#1693C9] hover:underline">Clear search</button>
                        </div>
                    )}
                </div>
            </div>
        </CrmLayout>
    );
}
