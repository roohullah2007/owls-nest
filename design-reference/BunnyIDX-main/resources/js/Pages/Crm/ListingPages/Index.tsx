import CrmLayout from '@/Layouts/CrmLayout';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import RowActionMenu from '@/Pages/Crm/Websites/components/RowActionMenu';
import { Head, Link, router } from '@inertiajs/react';

interface ListingPageRow {
    id: number;
    uuid: string;
    slug: string;
    name: string;
    type: string;
    accent_color: string;
    is_published: boolean;
    submissions_count: number;
    created_at: string;
}

interface Props {
    pages: ListingPageRow[];
}

export default function ListingPagesIndex({ pages }: Props) {
    const startCreate = () => router.visit(route('crm.listing-pages.create'));

    const remove = (page: ListingPageRow) => {
        if (!confirm(`Delete "${page.name}"? This cannot be undone.`)) return;
        router.delete(route('crm.listing-pages.destroy', page.uuid), { preserveScroll: true });
    };

    return (
        <CrmLayout>
            <Head title="Listing Pages" />
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                <div className="mx-auto max-w-[1350px] space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-lg font-normal text-[#111315]">Listing Pages</h1>
                        {pages.length > 0 && (
                            <span className="text-xs text-[#8B9096]">
                                {pages.length} page{pages.length !== 1 ? 's' : ''}
                            </span>
                        )}
                        <div className="flex-1" />
                        <PrimaryButton onClick={startCreate} label="Create listing page" />
                    </div>

                    {pages.length === 0 ? (
                        <div className="rounded-[4px] border border-[#E4E7EB] bg-white py-24 text-center">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[4px] bg-[#FFE4E0]">
                                <svg className="h-6 w-6 text-[#F0563F]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
                                </svg>
                            </div>
                            <h3 className="mb-1 text-[15px] font-semibold text-[#111315]">No listing pages yet</h3>
                            <p className="mx-auto mb-6 max-w-sm text-[13px] text-[#5F656D]">
                                Market a single listing or run a video funnel with a high-converting IDX squeeze page.
                            </p>
                            <button type="button" onClick={startCreate} className="h-9 rounded-[4px] bg-[#111315] px-6 text-[13px] font-medium text-white transition-all hover:bg-[#2a2d30] active:scale-[0.98]">
                                Create your first listing page
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pages.map((page) => {
                                const publicUrl = `${window.location.origin}/l/${page.slug}`;
                                return (
                                    <div
                                        key={page.uuid}
                                        className="group flex items-center rounded-[4px] border border-[#E4E7EB] bg-white shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] transition-all hover:border-[#D1D5DB] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)]"
                                    >
                                        <Link href={route('crm.listing-pages.edit', page.uuid)} className="flex shrink-0 items-center pl-5">
                                            <span className="flex h-11 w-11 items-center justify-center rounded-[6px]" style={{ backgroundColor: (page.accent_color || '#F0563F') + '22' }}>
                                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke={page.accent_color || '#F0563F'} strokeWidth={1.7}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 12h.01M9 15h.01M15 9h.01M15 12h.01M15 15h.01" />
                                                </svg>
                                            </span>
                                        </Link>
                                        <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8B9096]">
                                                    {page.is_published ? 'Published' : 'Draft'}
                                                    <span className="font-medium normal-case text-[#C4C9D1]"> · {page.submissions_count} {page.submissions_count === 1 ? 'lead' : 'leads'}</span>
                                                </p>
                                                <Link
                                                    href={route('crm.listing-pages.edit', page.uuid)}
                                                    className="block truncate text-[15px] font-semibold text-[#111315] transition-colors hover:text-[#F0563F]"
                                                >
                                                    {page.name}
                                                </Link>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <a
                                                    href={publicUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-[14px] font-semibold text-[#1693C9] transition-colors hover:text-[#1380AF]"
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                                                    View in Browser
                                                </a>
                                                <RowActionMenu
                                                    actions={[
                                                        { label: 'Edit', href: route('crm.listing-pages.edit', page.uuid) },
                                                        { label: 'Delete', onClick: () => remove(page), danger: true },
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
        </CrmLayout>
    );
}
