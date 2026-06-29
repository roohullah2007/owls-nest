import Dropdown from '@/Components/Dropdown';
import { Link } from '@inertiajs/react';
import { getAvatarColor } from '@/utils/avatarColors';
import { formatShortDate } from '@/utils/dateFormatters';
import { humanize } from '@/utils/text';
import type { TeamMember } from '@/types';
import type { RecentLead } from './types';

function createdAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Created just now';
    if (diff < 3600) return `Created ${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `Created ${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `Created ${Math.floor(diff / 86400)}d ago`;
    return `Created ${formatShortDate(dateStr)}`;
}

interface LeadRowProps {
    lead: RecentLead;
    isTeam: boolean;
    teamMembers: TeamMember[];
    onAssign: (lead: RecentLead, userId: number) => void;
    onDelete: (lead: RecentLead) => void;
}

export default function LeadRow({ lead, isTeam, teamMembers, onAssign, onDelete }: LeadRowProps) {
    const color = getAvatarColor(lead.id);
    const assignedIds = new Set(lead.assigned_users.map((u) => u.id));
    const unassigned = teamMembers.filter((m) => !assignedIds.has(m.user.id));

    return (
        <div className="flex items-center gap-4 py-3.5 px-1 group">
            {/* Avatar */}
            <span
                className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: color }}
            >
                {lead.first_name.charAt(0)}
            </span>

            {/* Name + type + created ago */}
            <div className="min-w-0 flex-1">
                <Link
                    href={route('crm.contacts.show', lead.uuid)}
                    className="text-[13px] font-medium text-[#111315] hover:underline truncate block"
                >
                    {lead.first_name} {lead.last_name}
                </Link>
                <p className="text-[11px] text-[#5F656D] truncate mt-0.5">
                    <span style={{ color }}>{lead.type ? humanize(lead.type) : 'Lead'}</span> · {createdAgo(lead.created_at)}{lead.source ? ` · ${humanize(lead.source)}` : ''}
                </p>
            </div>

            {/* Deals */}
            <div className="shrink-0 w-12">
                <p className="text-[10px] text-[#8B9096]">Deals</p>
                <div className="flex items-center gap-1 mt-0.5 text-[#111315]">
                    <svg className="h-3 w-3 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                    <span className="text-xs font-medium">{lead.deals_count}</span>
                </div>
            </div>

            {/* Tasks */}
            <div className="shrink-0 w-12">
                <p className="text-[10px] text-[#8B9096]">Tasks</p>
                <div className="flex items-center gap-1 mt-0.5 text-[#111315]">
                    <svg className="h-3 w-3 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="text-xs font-medium">{lead.tasks_count}</span>
                </div>
            </div>

            {/* Source */}
            <div className="shrink-0 w-20 hidden md:block">
                <p className="text-[10px] text-[#8B9096]">Source</p>
                <p className="text-xs font-medium text-[#111315] truncate mt-0.5">{lead.source ? humanize(lead.source) : '—'}</p>
            </div>

            {/* Assigned */}
            <div className="shrink-0">
                <p className="text-[10px] text-[#8B9096]">Assigned</p>
                <div className="flex items-center -space-x-1.5 mt-0.5">
                    {lead.assigned_users.length > 0 ? (
                        lead.assigned_users.map((u) => (
                            <span
                                key={u.id}
                                title={u.name}
                                className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ backgroundColor: getAvatarColor(u.id) }}
                            >
                                {u.name.charAt(0)}
                            </span>
                        ))
                    ) : (
                        <span className="text-[11px] text-[#8B9096]">—</span>
                    )}
                    {isTeam && unassigned.length > 0 && (
                        <Dropdown>
                            <Dropdown.Trigger>
                                <span className="h-6 w-6 rounded-full border border-[#E4E7EB] bg-[#F3F4F6] flex items-center justify-center cursor-pointer hover:bg-[#E4E7EB] transition-colors">
                                    <svg className="h-3 w-3 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </span>
                            </Dropdown.Trigger>
                            <Dropdown.Content align="right" contentClasses="py-1 bg-white max-h-48 overflow-y-auto">
                                {unassigned.map((m) => (
                                    <button
                                        key={m.user.id}
                                        type="button"
                                        onClick={() => onAssign(lead, m.user.id)}
                                        className="block w-full px-4 py-2 text-start text-sm text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                                    >
                                        {m.user.name}
                                    </button>
                                ))}
                            </Dropdown.Content>
                        </Dropdown>
                    )}
                </div>
            </div>

            {/* 3-dot menu */}
            <Dropdown>
                <Dropdown.Trigger>
                    <button className="shrink-0 p-1 rounded-md hover:bg-[#F3F4F6] transition-colors">
                        <svg className="h-5 w-5 text-[#5F656D]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm6 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm6 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                        </svg>
                    </button>
                </Dropdown.Trigger>
                <Dropdown.Content align="right" contentClasses="py-1 bg-white">
                    <Dropdown.Link href={route('crm.contacts.show', lead.uuid)}>View</Dropdown.Link>
                    <Dropdown.Link href={route('crm.contacts.edit', lead.uuid)}>Edit</Dropdown.Link>
                    {lead.phone && (
                        <>
                            <Dropdown.Link href={route('crm.sms.index', { contact: lead.uuid })}>Send SMS</Dropdown.Link>
                            <button
                                type="button"
                                onClick={() => window.__openDialer?.(lead.phone ?? undefined, lead.id, `${lead.first_name} ${lead.last_name}`)}
                                className="block w-full px-4 py-1.5 text-start text-xs leading-5 text-gray-700 hover:bg-gray-100 transition"
                            >
                                Call
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => onDelete(lead)}
                        className="block w-full px-4 py-1.5 text-start text-xs leading-5 text-red-600 hover:bg-red-50 transition"
                    >
                        Delete
                    </button>
                </Dropdown.Content>
            </Dropdown>
        </div>
    );
}
