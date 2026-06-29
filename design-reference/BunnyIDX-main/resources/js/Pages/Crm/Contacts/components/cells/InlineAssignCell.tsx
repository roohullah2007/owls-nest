import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { getAvatarColor } from '@/utils/avatarColors';
import { Contact, TeamMember } from '../types';

/**
 * Inline assignment cell — shows assigned team members as removable chips, plus
 * a dashed "+ Assign" button that opens a searchable dropdown of available members.
 */
export default function InlineAssignCell({ contact, teamMembers }: { contact: Contact; teamMembers: TeamMember[] }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const assigned = contact.assigned_users || [];
    const assignedIds = assigned.map((u) => u.id);

    useEffect(() => {
        function onDoc(e: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        if (open) {
            document.addEventListener('mousedown', onDoc);
            document.addEventListener('keydown', onKey);
            return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
        }
    }, [open]);

    // Solo accounts (no teammates) have nobody to assign to — show a quiet
    // placeholder instead of a permanently-disabled "+ Assign" button that
    // looks broken when clicked.
    if (teamMembers.length === 0 && assigned.length === 0) {
        return <span className="text-[13px] text-[#C8CCD1]" title="Assigning requires team members">—</span>;
    }

    const available = teamMembers.filter((m) => {
        if (assignedIds.includes(m.id)) return false;
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });

    function saveAssignment(ids: number[]) {
        setSaving(true);
        // Minimal PATCH — backend merges with existing values.
        router.patch(route('crm.contacts.update', contact.uuid), {
            first_name: contact.first_name,
            last_name: contact.last_name,
            type: contact.type,
            source: contact.source,
            status: contact.status,
            assigned_user_ids: ids,
        } as any, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    }

    // 0 assigned   → dashed "+ Assign" chip.
    // 1 assigned   → chip with avatar + name + hover ×.
    // 2+ assigned  → chips that wrap to new lines like the Tags column.

    return (
        <div ref={wrapperRef} className="relative flex items-center flex-wrap gap-1 min-w-0 w-full">
            {assigned.map((u) => (
                <span
                    key={u.id}
                    className="inline-flex shrink-0 items-center gap-1 pl-0.5 pr-1 py-0.5 text-[11px] font-medium rounded-full bg-[#F3F4F6] text-[#374151] border border-[#E4E7EB]"
                    title={u.email}
                >
                    <span className="h-5 w-5 inline-flex items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: getAvatarColor(u.id) }}>
                        {u.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate max-w-[80px]">{u.name}</span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); saveAssignment(assignedIds.filter((id) => id !== u.id)); }}
                        disabled={saving}
                        title={`Unassign ${u.name}`}
                        className="ml-0.5 h-3.5 w-3.5 inline-flex items-center justify-center rounded-full text-[#8B9096] hover:bg-[#E4E7EB] hover:text-[#DC2626] transition-colors disabled:opacity-50"
                    >
                        <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </span>
            ))}

            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                disabled={saving || teamMembers.length === 0}
                title={assigned.length === 0 ? 'Assign member' : 'Assign another member'}
                className={`shrink-0 inline-flex items-center justify-center rounded-full border border-dashed transition-colors disabled:opacity-50 ${
                    assigned.length === 0
                        ? 'gap-1 h-6 px-2 text-[11px] font-medium border-[#C8CCD1] text-[#5F656D] hover:border-[#1693C9] hover:text-[#1693C9] hover:bg-[#EBF5FF]'
                        : 'h-5 w-5 border-[#C8CCD1] text-[#8B9096] hover:border-[#1693C9] hover:text-[#1693C9] hover:bg-[#EBF5FF]'
                }`}
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                {assigned.length === 0 && <span>Assign</span>}
            </button>

            {open && (
                <div role="menu" className="absolute left-0 top-full mt-1 z-50 min-w-[220px] bg-white border border-[#E4E7EB] shadow-lg rounded-[4px] overflow-hidden">
                    <div className="p-2 border-b border-[#E4E7EB]">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search members…"
                            className="w-full h-7 px-2 text-[11px] bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded-[4px] focus:outline-none focus:bg-white focus:border-[#1693C9]"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                        {teamMembers.length === 0 ? (
                            <p className="px-3 py-2 text-[11px] text-[#8B9096]">No team members configured.</p>
                        ) : available.length === 0 ? (
                            <p className="px-3 py-2 text-[11px] text-[#8B9096]">{assignedIds.length === teamMembers.length ? 'Everyone is assigned.' : 'No members match.'}</p>
                        ) : (
                            available.slice(0, 20).map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); saveAssignment([...assignedIds, m.id]); setSearch(''); }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-left hover:bg-[#F9FAFB] transition-colors"
                                >
                                    <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: getAvatarColor(m.id) }}>
                                        {m.name.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[#111315] truncate leading-tight">{m.name}</p>
                                        <p className="text-[10px] text-[#8B9096] truncate leading-tight">{m.email}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
