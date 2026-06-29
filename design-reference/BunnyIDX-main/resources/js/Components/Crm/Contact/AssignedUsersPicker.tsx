import { useEffect, useRef, useState } from 'react';
import Avatar from '@/Components/Crm/Avatar';

interface User {
    id: number;
    name: string;
    email: string;
}

interface Props {
    assignedUsers: User[];
    teamMembers: User[];
    onSave: (ids: number[]) => void;
}

export default function AssignedUsersPicker({ assignedUsers, teamMembers, onSave }: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const assignedIds = assignedUsers.map((u) => u.id);

    useEffect(() => {
        function handleClick(e: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); }
        function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    useEffect(() => {
        if (open) {
            setSearch('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const available = teamMembers.filter((m) => {
        if (assignedIds.includes(m.id)) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    });

    return (
        <div ref={wrapperRef} className="relative">
            {assignedUsers.length > 0 ? (
                <ul className="space-y-1 mb-2">
                    {assignedUsers.map((u) => (
                        <li
                            key={u.id}
                            className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                        >
                            <Avatar id={u.id} name={u.name} size="md" ring />
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-[#111315] truncate leading-tight">{u.name}</p>
                                <p className="text-[11px] text-[#8B9096] truncate leading-tight">{u.email}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => onSave(assignedIds.filter((id) => id !== u.id))}
                                title={`Remove ${u.name}`}
                                className="shrink-0 opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-full text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all"
                            >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex flex-col items-center text-center py-3 px-2 mb-2">
                    <div className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F3F4F6] mb-2">
                        <svg className="h-4 w-4 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </div>
                    <p className="text-[11px] text-[#8B9096]">No team members assigned</p>
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium text-[#5F656D] hover:text-[#111315] bg-white border border-dashed border-[#D1D5DB] hover:border-[#9CA3AF] hover:bg-[#F9FAFB] rounded-[4px] transition-colors"
            >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add member
            </button>

            {open && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-[#E4E7EB]">
                        <div className="relative">
                            <svg
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B9096] pointer-events-none"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search members..."
                                className="w-full h-8 pl-8 pr-2.5 text-xs bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded-[4px] focus:outline-none focus:bg-white focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9] transition-colors"
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        {available.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                                <p className="text-xs text-[#8B9096]">
                                    {search ? 'No members match' : 'Everyone is already assigned'}
                                </p>
                            </div>
                        ) : (
                            available.map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => { onSave([...assignedIds, m.id]); setSearch(''); }}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#F3F4F6] transition-colors text-left"
                                >
                                    <Avatar id={m.id} name={m.name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-[#111315] truncate leading-tight">{m.name}</p>
                                        <p className="text-[11px] text-[#8B9096] truncate leading-tight">{m.email}</p>
                                    </div>
                                    <svg className="h-3.5 w-3.5 text-[#8B9096] opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
