import { router } from '@inertiajs/react';
import CrmCard from '@/Components/Crm/CrmCard';
import type { Invitation } from '../types';
import { getRoleLabel } from '../utils';
import InviteMemberForm from './InviteMemberForm';

interface Props {
    invitations: Invitation[];
    canManage: boolean;
    availableRoles: string[];
}

const EMAIL_STATUS_BADGE: Record<string, { label: string; className: string }> = {
    queued: { label: 'Sending', className: 'bg-[#FEF3C7] text-[#92400E]' },
    sent: { label: 'Sent', className: 'bg-[#DCFCE7] text-[#166534]' },
    delivered: { label: 'Delivered', className: 'bg-[#DCFCE7] text-[#166534]' },
    failed: { label: 'Email failed', className: 'bg-[#FEE2E2] text-[#991B1B]' },
    bounced: { label: 'Bounced', className: 'bg-[#FEE2E2] text-[#991B1B]' },
    complained: { label: 'Complaint', className: 'bg-[#FEE2E2] text-[#991B1B]' },
};

export default function InvitationsTab({ invitations, canManage, availableRoles }: Props) {
    const cancelInvitation = (id: number) => {
        router.delete(route('crm.team.invitations.destroy', id), { preserveScroll: true });
    };

    const resendInvitation = (id: number) => {
        router.post(route('crm.team.invitations.resend', id), {}, { preserveScroll: true });
    };

    return (
        <div className="space-y-4">
            {canManage && (
                <CrmCard title="Invite Team Member">
                    <InviteMemberForm availableRoles={availableRoles} />
                </CrmCard>
            )}

            {invitations.length > 0 ? (
                <CrmCard title="Pending Invitations" noPadding>
                    <ul className="divide-y divide-[#F3F4F6]">
                        {invitations.map((inv) => {
                            const isExpired = new Date(inv.expires_at) < new Date();
                            return (
                                <li
                                    key={inv.id}
                                    className={`flex items-center justify-between px-5 py-3 ${isExpired ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#5F656D] text-xs font-semibold shrink-0">
                                            {inv.email.charAt(0).toUpperCase()}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="flex items-center gap-2 text-[13px] font-medium text-[#111315]">
                                                <span className="truncate">{inv.email}</span>
                                                {inv.email_status && EMAIL_STATUS_BADGE[inv.email_status] && (
                                                    <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${EMAIL_STATUS_BADGE[inv.email_status].className}`}>
                                                        {EMAIL_STATUS_BADGE[inv.email_status].label}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-[#5F656D]">
                                                {getRoleLabel(inv.role)} · invited by {inv.invited_by_name} ·{' '}
                                                {isExpired ? (
                                                    <span className="text-[#EF4444]">expired</span>
                                                ) : (
                                                    <>expires {new Date(inv.expires_at).toLocaleDateString()}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="flex items-center gap-3 shrink-0 ml-3">
                                            <button
                                                onClick={() => resendInvitation(inv.id)}
                                                className="text-xs font-medium text-[#1693C9] hover:underline"
                                            >
                                                Resend
                                            </button>
                                            <button
                                                onClick={() => cancelInvitation(inv.id)}
                                                className="text-xs font-medium text-[#EF4444] hover:underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </CrmCard>
            ) : (
                !canManage && (
                    <CrmCard>
                        <div className="px-5 py-12 text-center">
                            <svg className="h-10 w-10 mx-auto text-[#D1D5DB] mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                            <p className="text-sm font-medium text-[#5F656D] mb-1">No pending invitations</p>
                            <p className="text-xs text-[#8B9096]">All team invitations have been accepted or expired.</p>
                        </div>
                    </CrmCard>
                )
            )}
        </div>
    );
}
