import { useEffect, useState } from 'react';
import type { TeamMemberPermissions } from '@/types';
import { cardTitleClass, btnPrimary, btnPrimarySmall, btnDanger } from '../../constants';
import { CONTACT_TYPE_OPTIONS, getRoleColor, getRoleLabel } from '../utils';

interface Props {
    role: string;
    permissions: TeamMemberPermissions;
    memberCount: number;
    isCustom: boolean;
    onSave: (perms: TeamMemberPermissions) => void;
    onDelete?: () => void;
}

export default function RolePermissionEditor({ role, permissions, memberCount, isCustom, onSave, onDelete }: Props) {
    const [perms, setPerms] = useState<TeamMemberPermissions>(permissions);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setPerms(permissions);
        setDirty(false);
    }, [role]);

    const set = <K extends keyof TeamMemberPermissions>(key: K, value: TeamMemberPermissions[K]) => {
        setPerms(prev => ({ ...prev, [key]: value }));
        setDirty(true);
    };

    const toggleContactType = (type: string) => {
        const current = perms.contact_types ?? [];
        set('contact_types', current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
    };

    const handleSave = () => {
        onSave(perms);
        setDirty(false);
    };

    const PermRow = ({ label, resource, options }: {
        label: string;
        resource: keyof TeamMemberPermissions;
        options: { value: string; label: string }[];
    }) => (
        <div className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
            <span className="text-[13px] font-medium text-[#374151]">{label}</span>
            <div className="flex items-center gap-1">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => set(resource, opt.value as any)}
                        className={`h-7 px-3 text-[11px] font-medium rounded-lg transition-colors ${
                            perms[resource] === opt.value
                                ? 'bg-[#111315] text-white'
                                : 'bg-[#F3F4F6] text-[#5F656D] hover:bg-[#E4E7EB]'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Role header */}
            <div className="flex items-center gap-3 pb-3 border-b border-[#E4E7EB]">
                <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white text-[13px] font-bold shrink-0"
                    style={{ backgroundColor: getRoleColor(role) }}
                >
                    {role.charAt(0).toUpperCase()}
                </span>
                <div>
                    <p className="text-sm font-semibold text-[#111315]">{getRoleLabel(role)}</p>
                    <p className="text-[13px] text-[#5F656D]">
                        {memberCount} member{memberCount !== 1 ? 's' : ''} with this role
                        {isCustom && ' · Custom role'}
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {dirty && (
                        <button onClick={handleSave} className={btnPrimarySmall}>
                            Save Changes
                        </button>
                    )}
                    {isCustom && onDelete && memberCount === 0 && (
                        <button onClick={onDelete} className={btnDanger}>
                            Delete Role
                        </button>
                    )}
                </div>
            </div>

            {/* Permission rows */}
            <div className="bg-white border border-[#E4E7EB] rounded-xl shadow-sm px-4">
                <PermRow label="Properties" resource="listings" options={[
                    { value: 'all', label: 'All' },
                    { value: 'own', label: 'Own' },
                    { value: 'none', label: 'None' },
                ]} />
                <PermRow label="Contacts" resource="contacts" options={[
                    { value: 'all', label: 'All' },
                    { value: 'own', label: 'Own' },
                    { value: 'none', label: 'None' },
                ]} />
                <PermRow label="Tasks" resource="tasks" options={[
                    { value: 'all', label: 'All' },
                    { value: 'own', label: 'Own' },
                ]} />
                <PermRow label="Calendar" resource="calendar" options={[
                    { value: 'all', label: 'All' },
                    { value: 'own', label: 'Own' },
                ]} />
                <PermRow label="Deals" resource="deals" options={[
                    { value: 'all', label: 'All' },
                    { value: 'own', label: 'Own' },
                    { value: 'none', label: 'None' },
                ]} />
                <PermRow label="Phone & SMS" resource="phone" options={[
                    { value: 'all', label: 'All' },
                    { value: 'own', label: 'Own' },
                    { value: 'none', label: 'None' },
                ]} />
            </div>

            {/* Contact types filter */}
            {perms.contacts !== 'none' && (
            <div className="bg-white border border-[#E4E7EB] rounded-xl shadow-sm p-4">
                    <div className="mb-3">
                        <p className={cardTitleClass}>Contact Types Filter</p>
                        <p className="text-[11px] text-[#8B9096] mt-0.5">Leave all unchecked to allow all types</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {CONTACT_TYPE_OPTIONS.map(type => {
                            const checked = (perms.contact_types ?? []).includes(type);
                            return (
                                <button
                                    key={type}
                                    onClick={() => toggleContactType(type)}
                                    className={`h-7 px-3 text-[11px] font-medium rounded-lg capitalize transition-colors ${
                                        checked
                                            ? 'bg-[#111315] text-white'
                                            : 'bg-[#F3F4F6] text-[#5F656D] hover:bg-[#E4E7EB]'
                                    }`}
                                >
                                    {type}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Bottom save */}
            {dirty && (
                <div className="flex justify-end pt-2">
                    <button onClick={handleSave} className={btnPrimary}>
                        Save Permissions
                    </button>
                </div>
            )}

            {/* Delete warning */}
            {isCustom && memberCount > 0 && (
                <p className="text-[11px] text-[#8B9096]">
                    To delete this role, reassign all {memberCount} member{memberCount !== 1 ? 's' : ''} to another role first.
                </p>
            )}
        </div>
    );
}
