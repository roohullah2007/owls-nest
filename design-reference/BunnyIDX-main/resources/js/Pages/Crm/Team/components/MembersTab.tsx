import StatStrip from '@/Components/Crm/StatStrip';
import type { TeamMemberItem } from '../types';
import MemberRow from './MemberRow';

interface Props {
    members: TeamMemberItem[];
    availableRoles: string[];
    canManage: boolean;
    currentUserId: number;
    isOwner: boolean;
    memberCount: number;
    activeCount: number;
    pendingInvitations: number;
}

export default function MembersTab({
    members, availableRoles, canManage, currentUserId, isOwner,
    memberCount, activeCount, pendingInvitations,
}: Props) {
    const stats = [
        { label: 'Members', value: String(memberCount) },
        { label: 'Active', value: String(activeCount), accent: '#059669' },
        { label: 'Pending', value: String(pendingInvitations), accent: pendingInvitations > 0 ? '#D97706' : undefined },
    ];

    return (
        <div className="space-y-4">
            <StatStrip stats={stats} />

            {/* Members Table */}
            <div className="bg-white border border-[#E4E7EB] rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-[13px]">
                    <thead>
                        <tr className="bg-[#F9FAFB] border-b border-[#E4E7EB]">
                            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#5F656D]">Member</th>
                            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#5F656D] hidden sm:table-cell">Email</th>
                            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#5F656D]">Role</th>
                            <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-[#5F656D]">Status</th>
                            <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#5F656D] hidden md:table-cell">Joined</th>
                            {canManage && <th className="px-4 py-2.5 w-10" />}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3F4F6]">
                        {members.map(member => (
                            <MemberRow
                                key={member.id}
                                member={member}
                                availableRoles={availableRoles}
                                canManage={canManage}
                                currentUserId={currentUserId}
                                isOwner={isOwner}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
