import CrmLayout from '@/Layouts/CrmLayout';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import RowActionMenu from '@/Pages/Crm/Websites/components/RowActionMenu';
import DeletePageModal from './components/DeletePageModal';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface LandingPageRow {
    id: number;
    uuid: string;
    slug: string;
    name: string;
    type: string;
    template: string;
    accent_color: string;
    is_published: boolean;
    submissions_count: number;
    created_at: string;
}

interface Props {
    pages: LandingPageRow[];
    isTeam: boolean;
}

export default function LandingPagesIndex({ pages }: Props) {
    const startCreate = () => router.visit(route('crm.landing-pages.create'));

    // In-app delete confirmation (replaces the native browser confirm()).
    const [pendingDelete, setPendingDelete] = useState<LandingPageRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const confirmDelete = () => {
        if (!pendingDelete || deleting) return;
        router.delete(route('crm.landing-pages.destroy', pendingDelete.uuid), {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onFinish: () => { setDeleting(false); setPendingDelete(null); },
        });
    };

    return (
        <CrmLayout>
            <Head title="Landing Pages" />
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                <div className="mx-auto max-w-[1350px] space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-lg font-normal text-[#111315]">Landing Pages</h1>
                        {pages.length > 0 && (
                            <span className="text-xs text-[#8B9096]">
                                {pages.length} page{pages.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        <div className="flex-1" />
                        <PrimaryButton onClick={startCreate} label="Create landing page" />
                    </div>

                    {pages.length === 0 ? (
                        <div className="text-center py-24 bg-white border border-[#E4E7EB] rounded-[4px]">
                            <div className="h-14 w-14 mx-auto bg-[#F3F4F6] rounded-[4px] flex items-center justify-center mb-5">
                                <svg className="h-6 w-6 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                                </svg>
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#111315] mb-1">No landing pages yet</h3>
                            <p className="text-[13px] text-[#5F656D] mb-6 max-w-sm mx-auto">Pick a template or describe your offer and let AI build a high-converting page.</p>
                            <button type="button" onClick={startCreate} className="h-9 px-6 bg-[#1693C9] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#1380AF] active:scale-[0.98] transition-all">
                                Create your first landing page
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pages.map((page) => {
                                const publicUrl = `${window.location.origin}/l/${page.slug}`;
                                return (
                                    <div
                                        key={page.uuid}
                                        className="group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center"
                                    >
                                        <Link href={route('crm.landing-pages.edit', page.uuid)} className="shrink-0 pl-5 flex items-center">
                                            <svg className="h-11 w-11" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <rect x="4" y="3" width="16" height="18" rx="1.5" className="fill-[#EAF6FD] text-[#1693C9]" strokeWidth={1.5} />
                                                <path className="text-[#1693C9]" strokeLinecap="round" strokeWidth={1.5} d="M8 7h8M8 10.5h8" />
                                                <rect x="8" y="13.5" width="8" height="4" rx="1" className="fill-white text-[#1693C9]" strokeWidth={1.5} />
                                            </svg>
                                        </Link>
                                        <div className="flex-1 min-w-0 flex items-center gap-4 px-5 py-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-semibold text-[#8B9096] uppercase tracking-wider">
                                                    {page.is_published ? 'Published' : 'Draft'}
                                                    <span className="text-[#C4C9D1] normal-case font-medium"> · {page.submissions_count} {page.submissions_count === 1 ? 'lead' : 'leads'}</span>
                                                </p>
                                                <Link
                                                    href={route('crm.landing-pages.edit', page.uuid)}
                                                    className="block text-[15px] font-semibold text-[#111315] truncate hover:text-[#1693C9] transition-colors"
                                                >
                                                    {page.name}
                                                </Link>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <a
                                                    href={publicUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[14px] font-semibold text-[#1693C9] hover:text-[#1380AF] transition-colors flex items-center gap-1.5"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                                                    View in Browser
                                                </a>
                                                <RowActionMenu
                                                    actions={[
                                                        { label: 'Edit', href: route('crm.landing-pages.edit', page.uuid) },
                                                        { label: 'Delete', onClick: () => setPendingDelete(page), danger: true },
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

            <DeletePageModal
                open={pendingDelete !== null}
                name={pendingDelete?.name}
                deleting={deleting}
                onCancel={() => { if (!deleting) setPendingDelete(null); }}
                onConfirm={confirmDelete}
            />
        </CrmLayout>
    );
}
