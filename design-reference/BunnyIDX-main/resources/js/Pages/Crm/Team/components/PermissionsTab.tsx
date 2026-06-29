import { useState } from 'react';
import { router } from '@inertiajs/react';
import type { TeamMemberPermissions } from '@/types';
import type { TeamMemberItem } from '../types';
import { BUILT_IN_ROLES, getRoleColor, getRoleLabel } from '../utils';
import RolePermissionEditor from './RolePermissionEditor';

interface Props {
    teamId: number;
    availableRoles: string[];
    rolePermissions: Record<string, TeamMemberPermissions>;
    members: TeamMemberItem[];
    canManage: boolean;
}

export default function PermissionsTab({ teamId, availableRoles, rolePermissions, members, canManage }: Props) {
    const [selectedRole, setSelectedRole] = useState<string>(availableRoles[0] ?? 'admin');
    const [addRoleOpen, setAddRoleOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');

    const roleMemberCounts: Record<string, number> = {};
    for (const r of availableRoles) {
        roleMemberCounts[r] = members.filter(m => m.role === r).length;
    }

    const saveRolePermissions = (role: string, perms: TeamMemberPermissions) => {
        router.patch(route('crm.team.role-permissions.update', teamId), { role, permissions: perms as any }, { preserveScroll: true });
    };

    const addCustomRole = () => {
        const name = newRoleName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!name) return;
        router.post(route('crm.team.roles.store', teamId), { name }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewRoleName('');
                setAddRoleOpen(false);
                setSelectedRole(name);
            },
        });
    };

    const deleteRole = (role: string) => {
        if (!confirm(`Delete the "${getRoleLabel(role)}" role?`)) return;
        router.delete(route('crm.team.roles.destroy', teamId), {
            data: { role },
            preserveScroll: true,
            onSuccess: () => setSelectedRole(availableRoles[0] ?? 'admin'),
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                {/* Role list sidebar */}
                <div className="w-48 shrink-0 space-y-1">
                    <p className="text-[12px] font-medium text-[#374151] mb-2 px-1">Roles</p>
                    {availableRoles.map((r, i) => (
                        <button
                            key={r}
                            onClick={() => setSelectedRole(r)}
                            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left transition-colors ${
                                selectedRole === r
                                    ? 'bg-[#111315] text-white'
                                    : 'bg-white border border-[#E4E7EB] text-[#5F656D] hover:bg-[#F9FAFB]'
                            }`}
                        >
                            <span
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shrink-0 ${
                                    selectedRole === r ? 'bg-white/20 text-white' : 'text-white'
                                }`}
                                style={selectedRole !== r ? { backgroundColor: getRoleColor(r, i) } : undefined}
                            >
                                {r.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className={`text-[12px] font-medium truncate ${selectedRole === r ? 'text-white' : ''}`}>{getRoleLabel(r)}</p>
                                <p className={`text-[11px] ${selectedRole === r ? 'text-white/60' : 'text-[#5F656D]'}`}>
                                    {roleMemberCounts[r] ?? 0} member{(roleMemberCounts[r] ?? 0) !== 1 ? 's' : ''}
                                </p>
                            </div>
                            {!BUILT_IN_ROLES.includes(r) && (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    selectedRole === r ? 'bg-white/15 text-white/80' : 'bg-[#F3F4F6] text-[#5F656D]'
                                }`}>
                                    Custom
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Add Role */}
                    {canManage && (
                        <>
                            {addRoleOpen ? (
                                <div className="bg-white border border-[#E4E7EB] rounded-lg shadow-sm p-2 space-y-2">
                                    <input
                                        type="text"
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        placeholder="e.g. showing_agent"
                                        className="w-full h-8 px-2 text-[12px] border border-[#E4E7EB] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-2 focus:ring-[#111315]/5"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') addCustomRole();
                                            if (e.key === 'Escape') { setAddRoleOpen(false); setNewRoleName(''); }
                                        }}
                                    />
                                    <p className="text-[11px] text-[#8B9096]">Lowercase, underscores only</p>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={addCustomRole}
                                            disabled={!newRoleName.trim()}
                                            className="flex-1 h-7 text-[11px] font-medium bg-[#111315] text-white rounded-lg hover:bg-[#2a2d30] disabled:opacity-30 transition-colors"
                                        >
                                            Create
                                        </button>
                                        <button
                                            onClick={() => { setAddRoleOpen(false); setNewRoleName(''); }}
                                            className="h-7 px-2 text-[11px] font-medium text-[#5F656D] bg-[#F3F4F6] rounded-lg hover:bg-[#E4E7EB] transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setAddRoleOpen(true)}
                                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left border border-dashed border-[#D1D5DB] text-[#5F656D] hover:border-[#111315] hover:text-[#111315] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    <span className="text-[12px] font-medium">Add Role</span>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Role permission editor */}
                <div className="flex-1 min-w-0">
                    {canManage ? (
                        <RolePermissionEditor
                            key={selectedRole}
                            role={selectedRole}
                            permissions={rolePermissions[selectedRole] ?? { listings: 'all', contacts: 'all', contact_types: [], tasks: 'all', calendar: 'all', deals: 'all', phone: 'own' }}
                            memberCount={roleMemberCounts[selectedRole] ?? 0}
                            isCustom={!BUILT_IN_ROLES.includes(selectedRole)}
                            onSave={(perms) => saveRolePermissions(selectedRole, perms)}
                            onDelete={() => deleteRole(selectedRole)}
                        />
                    ) : (
                        <div className="bg-white border border-[#E4E7EB] rounded-xl shadow-sm px-5 py-12 text-center">
                            <p className="text-[13px] text-[#5F656D]">Only owners and admins can manage role permissions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
