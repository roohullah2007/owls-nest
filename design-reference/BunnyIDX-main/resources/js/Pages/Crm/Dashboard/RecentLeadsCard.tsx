import CrmCard from '@/Components/Crm/CrmCard';
import DeleteConfirmModal from '@/Components/Crm/DeleteConfirmModal';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { PageProps } from '@/types';
import LeadRow from './LeadRow';
import type { RecentLead } from './types';

export default function RecentLeadsCard({ leads }: { leads: RecentLead[] }) {
    const { auth } = usePage<PageProps>().props;
    const isTeam = auth.active_context === 'team' && (auth.team?.members?.length ?? 0) > 1;
    const teamMembers = auth.team?.members ?? [];

    // Single-contact delete uses the same type-name confirmation modal as the
    // Contacts list (rather than a native confirm()) so the destructive action
    // is deliberate and consistent across the app.
    const [deleteTarget, setDeleteTarget] = useState<RecentLead | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function handleAssign(lead: RecentLead, userId: number) {
        const currentIds = lead.assigned_users.map((u) => u.id);
        router.put(route('crm.contacts.update', lead.uuid), {
            assigned_user_ids: [...currentIds, userId],
        }, { preserveScroll: true });
    }

    function handleDelete(lead: RecentLead) {
        setDeleteError(null);
        setDeleteTarget(lead);
    }

    function confirmDelete() {
        if (!deleteTarget) return;
        router.delete(route('crm.contacts.destroy', deleteTarget.uuid), {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onError: () => setDeleteError('Could not delete this contact — please try again.'),
            onSuccess: () => setDeleteTarget(null),
            onFinish: () => setDeleting(false),
        });
    }

    return (
        <>
            <CrmCard
                title="Recent Leads"
                headerRight={
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('crm.contacts.index')}
                            className="px-3 py-1.5 text-xs font-medium text-[#111315] rounded-lg border border-[#E4E7EB] hover:bg-[#F3F4F6] transition-colors"
                        >
                            View All
                        </Link>
                        <Link
                            href={route('crm.contacts.create')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1693C9] text-white hover:bg-[#1380AF] transition-colors"
                        >
                            Add Lead
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                }
            >
                {leads.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-[13px] text-[#8B9096]">No leads yet</p>
                        <Link
                            href={route('crm.contacts.create')}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1693C9] text-white hover:bg-[#1380AF] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add your first lead
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-[#F3F4F6]">
                        {leads.map((lead) => (
                            <LeadRow
                                key={lead.id}
                                lead={lead}
                                isTeam={isTeam}
                                teamMembers={teamMembers}
                                onAssign={handleAssign}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </CrmCard>

            <DeleteConfirmModal
                open={deleteTarget !== null}
                onClose={() => { if (!deleting) setDeleteTarget(null); }}
                entity="contact"
                mode="type-name"
                name={deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}`.trim() : ''}
                confirming={deleting}
                error={deleteError}
                onConfirm={confirmDelete}
            />
        </>
    );
}
