import { useState } from 'react';
import { router } from '@inertiajs/react';
import type { TeamMemberItem } from '../types';
import { getRoleColor, getRoleLabel } from '../utils';

interface Props {
    member: TeamMemberItem;
    availableRoles: string[];
    canManage: boolean;
    currentUserId: number;
    isOwner: boolean;
}

export default function MemberRow({ member, availableRoles, canManage, currentUserId, isOwner }: Props) {
    const [actionsOpen, setActionsOpen] = useState(false);
    const [roleChangeOpen, setRoleChangeOpen] = useState(false);

    const updateRole = (role: string) => {
        router.patch(route('crm.team.members.role', member.id), { role }, { preserveScroll: true });
        setActionsOpen(false);
        setRoleChangeOpen(false);
    };

    const removeMember = () => {
        if (!confirm('Remove this team member?')) return;
        router.delete(route('crm.team.members.remove', member.id), { preserveScroll: true });
        setActionsOpen(false);
    };

    const toggleActive = () => {
        router.patch(route('crm.team.members.toggle-active', member.id), {}, { preserveScroll: true });
        setActionsOpen(false);
    };

    const showActions = canManage && member.role !== 'owner' && member.user_id !== currentUserId;

    return (
        <tr className={`hover:bg-[#F9FAFB] transition-colors ${!member.is_active ? 'opacity-40' : ''}`}>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-[11px] font-semibold shrink-0"
                        style={{ backgroundColor: getRoleColor(member.role) }}
                    >
                        {member.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-[12px] font-medium text-[#111315]">{member.name}</span>
                </div>
            </td>
            <td className="px-4 py-3 text-[12px] text-[#5F656D] hidden sm:table-cell">{member.email}</td>
            <td className="px-4 py-3">
                <span
                    className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                    style={{ backgroundColor: getRoleColor(member.role) }}
                >
                    {getRoleLabel(member.role)}
                </span>
            </td>
            <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${member.is_active ? 'bg-[#059669]' : 'bg-[#DC2626]'}`} />
                    <span className="text-[11px] text-[#5F656D]">{member.is_active ? 'Active' : 'Inactive'}</span>
                </span>
            </td>
            <td className="px-4 py-3 text-[12px] text-[#5F656D] hidden md:table-cell">
                {member.accepted_at
                    ? new Date(member.accepted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '-'}
            </td>
            {canManage && (
                <td className="px-4 py-3 text-right relative">
                    {showActions && (
                        <>
                            <button
                                onClick={() => setActionsOpen(v => !v)}
                                className="h-6 w-6 flex items-center justify-center rounded text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                </svg>
                            </button>
                            {actionsOpen && (
                                <div className="absolute right-4 top-full mt-1 z-50 w-44 bg-white border border-[#E4E7EB] rounded-lg shadow-lg py-1">
                                    {/* Change Role submenu */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setRoleChangeOpen(v => !v)}
                                            className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-[#5F656D] hover:bg-[#F9FAFB]"
                                        >
                                            Change Role
                                            <svg className="h-3 w-3 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </button>
                                        {roleChangeOpen && (
                                            <div className="absolute right-full top-0 mr-1 w-36 bg-white border border-[#E4E7EB] rounded-lg shadow-lg py-1">
                                                {availableRoles.filter(r => r !== member.role).map(r => (
                                                    <button
                                                        key={r}
                                                        onClick={() => updateRole(r)}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#5F656D] hover:bg-[#F9FAFB]"
                                                    >
                                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getRoleColor(r) }} />
                                                        {getRoleLabel(r)}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={toggleActive} className="w-full text-left px-3 py-1.5 text-[12px] text-[#5F656D] hover:bg-[#F9FAFB]">
                                        {member.is_active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <div className="border-t border-[#E4E7EB] my-1" />
                                    <button onClick={removeMember} className="w-full text-left px-3 py-1.5 text-[12px] text-[#EF4444] hover:bg-[#FEF2F2]">
                                        Remove
                                    </button>
                                </div>
                            )}
                            {/* Backdrop for dropdown */}
                            {actionsOpen && (
                                <div className="fixed inset-0 z-40" onClick={() => { setActionsOpen(false); setRoleChangeOpen(false); }} />
                            )}
                        </>
                    )}
                </td>
            )}
        </tr>
    );
}
