import CrmLayout from '@/Layouts/CrmLayout';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import RowActionMenu from './components/RowActionMenu';
import WebsiteGateModal, { WebsiteGateReason } from './components/WebsiteGateModal';
import { AgentWebsite, TemplateConfig } from './types';
import EditView from './components/EditView';

interface Props {
    websites: AgentWebsite[];
    editing: AgentWebsite | null;
    initialSection?: string;
    initialEditingPage?: string;
    initialBlogPostId?: number;
    isTeam: boolean;
    templates: Record<string, TemplateConfig>;
    canCreateWebsite?: boolean;
    atWebsiteLimit?: boolean;
    websiteLimit?: number | null;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

export default function WebsitesIndex({ websites, editing, initialSection, initialEditingPage, initialBlogPostId, templates, canCreateWebsite = true, atWebsiteLimit = false }: Props) {
    const [gateReason, setGateReason] = useState<WebsiteGateReason | null>(null);

    const startCreate = () => {
        // Explain why creation can't continue instead of redirecting / erroring.
        if (!canCreateWebsite) { setGateReason('restricted'); return; }
        if (atWebsiteLimit) { setGateReason('limit'); return; }
        router.visit(route('crm.onboarding'));
    };

    const handleDelete = (site: AgentWebsite) => {
        if (!confirm(`Delete the website for ${site.agent_name}? This cannot be undone.`)) return;
        router.delete(route('crm.websites.destroy', site.id), { preserveScroll: true });
    };

    if (editing) {
        return (
            <CrmLayout>
                <Head title="Edit Website" />
                <EditView website={editing} templates={templates} initialSection={initialSection} initialEditingPage={initialEditingPage} initialBlogPostId={initialBlogPostId} />
            </CrmLayout>
        );
    }

    return (
        <CrmLayout>
            <Head title="Websites" />
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                <div className="mx-auto max-w-[1350px] space-y-4">
                    {/* Page header */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-lg font-normal text-[#111315]">Websites</h1>
                        <div className="flex-1" />
                        <PrimaryButton onClick={startCreate} label="Create website" />
                    </div>

                    {websites.length === 0 ? (
                        <div className="text-center py-24 bg-white border border-[#E4E7EB] rounded-[4px]">
                            <div className="h-14 w-14 mx-auto bg-[#F3F4F6] rounded-[4px] flex items-center justify-center mb-5">
                                <svg className="h-6 w-6 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                                </svg>
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#111315] mb-1">No websites yet</h3>
                            <p className="text-[13px] text-[#5F656D] mb-6 max-w-sm mx-auto">Create a branded agent website to share with clients and capture leads.</p>
                            <button type="button" onClick={startCreate} className="h-9 px-6 bg-[#111315] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#2a2d30] active:scale-[0.98] transition-all">
                                Create your first website
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {websites.map((site) => {
                                const siteUrl = `${window.location.origin}/site/${site.slug}`;

                                return (
                                    <div
                                        key={site.id}
                                        className="group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center"
                                    >
                                        {/* Icon */}
                                        <Link href={route('crm.websites.edit', site.uuid)} className="shrink-0 pl-5 flex items-center">
                                            <svg className="h-11 w-11" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                {/* back page */}
                                                <rect x="4" y="2.5" width="10" height="13" rx="1" className="fill-[#D5EEFA] text-[#1693C9]" strokeWidth={1.5} />
                                                {/* middle page */}
                                                <rect x="7" y="5.5" width="10" height="13" rx="1" className="fill-[#EAF6FD] text-[#1693C9]" strokeWidth={1.5} />
                                                {/* front page */}
                                                <rect x="10" y="8.5" width="10" height="13" rx="1" className="fill-white text-[#1693C9]" strokeWidth={1.5} />
                                                <path className="text-[#1693C9]" strokeLinecap="round" strokeWidth={1.5} d="M12.5 13h5M12.5 16.5h5" />
                                            </svg>
                                        </Link>

                                        {/* Content + actions */}
                                        <div className="flex-1 min-w-0 flex items-center gap-4 px-5 py-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-semibold text-[#8B9096] uppercase tracking-wider">
                                                    {site.is_published ? 'Published' : 'Draft'}
                                                </p>
                                                <Link
                                                    href={route('crm.websites.edit', site.uuid)}
                                                    className="block text-[15px] font-semibold text-[#111315] truncate hover:text-[#1693C9] transition-colors"
                                                >
                                                    {site.agent_name}
                                                </Link>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <a
                                                    href={siteUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[14px] font-semibold text-[#1693C9] hover:text-[#1380AF] transition-colors flex items-center gap-1.5"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                                                    View in Browser
                                                </a>

                                                {/* 3-dot menu */}
                                                <RowActionMenu
                                                    actions={[
                                                        { label: 'Edit', href: route('crm.websites.edit', site.uuid) },
                                                        { label: 'Delete', onClick: () => handleDelete(site), danger: true },
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {gateReason && <WebsiteGateModal reason={gateReason} onClose={() => setGateReason(null)} />}
        </CrmLayout>
    );
}
