import AdminLayout from '@/Layouts/AdminLayout';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import SlideOverModal, { FieldLabel, slideOverInputClass } from '@/Components/Crm/SlideOverModal';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Owner { name: string; email: string }
interface WebsiteRow {
    id: number;
    uuid: string;
    agent_name: string;
    slug: string;
    is_published: boolean;
    custom_domain: string | null;
    domain_status: string | null;
    created_at: string | null;
    owner: Owner | null;
    is_team: boolean;
}
interface UserOption { id: number; name: string; email: string }

interface Props {
    websites: WebsiteRow[];
    filters: { q: string | null };
    users: UserOption[];
}

export default function AdminWebsitesIndex({ websites, filters, users }: Props) {
    const [q, setQ] = useState(filters.q || '');
    const [creating, setCreating] = useState(false);
    const [userId, setUserId] = useState('');

    function applyFilters() {
        router.get(route('admin.websites'), { q: q || undefined }, { preserveState: true });
    }

    // Launch the SAME onboarding wizard the user-side flow uses, scoped to the
    // selected user — so the admin-created site is seeded identically.
    function startCreate() {
        if (!userId) return;
        router.visit(route('crm.onboarding', { for_user: userId }));
    }

    return (
        <AdminLayout active="websites" title="Admin · Websites"
            header={
                <>
                    <h1 className="text-lg font-normal text-[#111315]">Websites</h1>
                    <div className="flex-1" />
                    <p className="text-xs text-[#8B9096]">{websites.length} shown</p>
                    <button
                        onClick={() => setCreating(true)}
                        className="ml-auto h-8 px-4 bg-[#1693C9] text-white text-xs font-semibold rounded-lg hover:bg-[#1380AF]"
                    >
                        + Create website
                    </button>
                </>
            }
        >
            {/* Filters */}
            <div className="bg-white border border-[#E4E7EB] rounded-xl p-4 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Search</label>
                    <input
                        type="text"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                        placeholder="Site name, owner or domain"
                        className="block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                    />
                </div>
                <button onClick={applyFilters} className="h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF]">Apply</button>
            </div>

            {/* Table */}
            {websites.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-12 text-center">
                    <p className="text-sm text-[#8B9096]">No websites match.</p>
                </div>
            ) : (
                <DataTable>
                    <DataTableHead>
                        <DataTableHeadCell>Site</DataTableHeadCell>
                        <DataTableHeadCell>Owner</DataTableHeadCell>
                        <DataTableHeadCell>Status</DataTableHeadCell>
                        <DataTableHeadCell>Domain</DataTableHeadCell>
                        <DataTableHeadCell>Created</DataTableHeadCell>
                        <DataTableHeadCell align="right" last>Manage</DataTableHeadCell>
                    </DataTableHead>
                    <tbody>
                        {websites.map((site) => (
                            <DataTableRow key={site.id}>
                                <DataTableCell>
                                    <p className="text-[13px] font-medium text-[#111315]">{site.agent_name}</p>
                                    <p className="text-[10px] text-[#8B9096]">/{site.slug}</p>
                                </DataTableCell>
                                <DataTableCell>
                                    {site.owner ? (
                                        <>
                                            <p className="text-[13px] text-[#111315]">{site.owner.name}</p>
                                            <p className="text-[10px] text-[#8B9096]">{site.owner.email}</p>
                                        </>
                                    ) : (
                                        <span className="text-xs text-[#8B9096]">{site.is_team ? 'Team site' : '—'}</span>
                                    )}
                                </DataTableCell>
                                <DataTableCell>
                                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${site.is_published ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                        {site.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </DataTableCell>
                                <DataTableCell className="text-xs text-[#5F656D]">
                                    {site.custom_domain
                                        ? <span>{site.custom_domain} <span className="text-[#8B9096]">({site.domain_status || 'pending'})</span></span>
                                        : '—'}
                                </DataTableCell>
                                <DataTableCell className="text-xs text-[#5F656D]">
                                    {site.created_at ? new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </DataTableCell>
                                <DataTableCell align="right" last>
                                    <Link href={route('crm.websites.edit', site.uuid)} className="px-2.5 py-1 text-[10px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB]">
                                        Open editor
                                    </Link>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </tbody>
                </DataTable>
            )}

            {/* Create — pick a user, then continue into the standard setup wizard */}
            {creating && (
                <SlideOverModal
                    title="New Website"
                    width={460}
                    onClose={() => setCreating(false)}
                    footer={
                        <>
                            <button type="button" onClick={() => setCreating(false)} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors">Cancel</button>
                            <button
                                type="button"
                                onClick={startCreate}
                                disabled={!userId}
                                className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                            >
                                Continue to setup
                            </button>
                        </>
                    }
                >
                    <div className="p-5">
                        <FieldLabel>User</FieldLabel>
                        <select value={userId} onChange={(e) => setUserId(e.target.value)} className={slideOverInputClass}>
                            <option value="">Select a user…</option>
                            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                        </select>
                        <p className="mt-2 text-[11px] text-[#8B9096]">Opens the standard website setup wizard for this user — the site is created under their account.</p>
                    </div>
                </SlideOverModal>
            )}
        </AdminLayout>
    );
}
