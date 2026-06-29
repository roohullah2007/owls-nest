import { useState, ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import AssignedUsersPicker from './AssignedUsersPicker';
import TasksList from './TasksList';
import AppointmentsList from './AppointmentsList';
import TaskFormModal from './TaskFormModal';
import AppointmentFormModal from './AppointmentFormModal';
import { Contact } from './types';

const DEFAULT_CARD_ORDER = ['team_members', 'tasks', 'appointments', 'favourites', 'website_activity'];
const STORAGE_KEY = 'contact_sidebar_card_order';

const cardIcons: Record<string, string> = {
    team_members: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
    tasks: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    appointments: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
    favourites: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z',
    website_activity: 'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418',
};

interface CardShellProps {
    iconPath: string;
    title: string;
    count?: number;
    collapsed: boolean;
    onToggle: () => void;
    actions?: ReactNode;
    children: ReactNode;
}

function CardShell({ iconPath, title, count, collapsed, onToggle, actions, children }: CardShellProps) {
    return (
        <div className="bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden">
            <button onClick={onToggle} className={`flex items-center justify-between w-full px-4 py-3 text-left bg-[#F3F4F6] hover:bg-[#E4E7EB] transition-colors ${!collapsed ? 'border-b border-[#E4E7EB]' : ''}`}>
                <div className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                    </svg>
                    <span className="text-[13px] font-semibold text-[#111315]">{title}</span>
                    {count !== undefined && count > 0 && <span className="text-[10px] font-medium text-[#8B9096]">({count})</span>}
                </div>
                <div className="flex items-center gap-1">
                    {!collapsed && actions}
                    <svg className={`h-3.5 w-3.5 text-[#8B9096] transition-transform ${collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </button>
            {!collapsed && <div>{children}</div>}
        </div>
    );
}

const PlusIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const EmptyState = ({ iconPath, title, hint }: { iconPath: string; title: string; hint?: string }) => (
    <div className="flex flex-col items-center justify-center py-6 text-center px-4">
        <svg className="h-7 w-7 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
        <p className="mt-2 text-xs text-[#8B9096]">{title}</p>
        {hint && <p className="text-[11px] text-[#C4C9D1] mt-0.5">{hint}</p>}
    </div>
);

interface Props {
    contact: Contact;
    teamMembers: { id: number; name: string; email: string }[];
    patchContact: (partial: Record<string, unknown>) => void;
    mobileSection: 'info' | 'timeline' | 'sidebar';
}

function readCardOrder(): string[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as string[];
            const merged = parsed.filter((k) => DEFAULT_CARD_ORDER.includes(k));
            DEFAULT_CARD_ORDER.forEach((k) => { if (!merged.includes(k)) merged.push(k); });
            return merged;
        }
    } catch {}
    return DEFAULT_CARD_ORDER;
}

export default function RightSidebar({ contact, teamMembers, patchContact, mobileSection }: Props) {
    const [cardOrder, setCardOrder] = useState<string[]>(readCardOrder);
    const [dragCard, setDragCard] = useState<string | null>(null);
    const [dragOverCard, setDragOverCard] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);

    function toggle(key: string) {
        setCollapsed((p) => ({ ...p, [key]: !p[key] }));
    }

    function dropCard(target: string) {
        if (!dragCard || dragCard === target) { setDragCard(null); setDragOverCard(null); return; }
        setCardOrder((prev) => {
            const next = [...prev];
            const fromIdx = next.indexOf(dragCard);
            const toIdx = next.indexOf(target);
            if (fromIdx === -1 || toIdx === -1) return prev;
            next.splice(fromIdx, 1);
            next.splice(toIdx, 0, dragCard);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
        setDragCard(null);
        setDragOverCard(null);
    }

    function renderCard(key: string): ReactNode {
        switch (key) {
            case 'team_members':
                return (
                    <CardShell iconPath={cardIcons.team_members} title="Team Members" count={(contact.assigned_users || []).length} collapsed={!!collapsed.team_members} onToggle={() => toggle('team_members')}>
                        <div className="p-3">
                            {teamMembers.length > 0 ? (
                                <AssignedUsersPicker
                                    assignedUsers={contact.assigned_users || []}
                                    teamMembers={teamMembers}
                                    onSave={(ids) => patchContact({ assigned_user_ids: ids })}
                                />
                            ) : (
                                <div className="flex flex-col items-center text-center py-4 px-3">
                                    <div className="h-9 w-9 flex items-center justify-center rounded-full bg-[#EBF5FF] mb-2">
                                        <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={cardIcons.team_members} /></svg>
                                    </div>
                                    <p className="text-xs font-medium text-[#111315] mb-0.5">Collaborate with your team</p>
                                    <p className="text-[11px] text-[#8B9096] mb-3">Assign contacts to team members and work together</p>
                                    <Link href={route('crm.settings')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                                        Upgrade to Team
                                    </Link>
                                </div>
                            )}
                        </div>
                    </CardShell>
                );
            case 'tasks': {
                const pendingCount = (contact.tasks || []).filter((t: any) => !t.is_completed).length;
                return (
                    <CardShell
                        iconPath={cardIcons.tasks}
                        title="Tasks"
                        count={pendingCount}
                        collapsed={!!collapsed.tasks}
                        onToggle={() => toggle('tasks')}
                        actions={
                            <span onClick={(e) => { e.stopPropagation(); setShowTaskForm(true); }} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6] border border-transparent hover:border-[#E4E7EB] rounded-[4px] transition-colors cursor-pointer">
                                {PlusIcon}
                            </span>
                        }
                    >
                        <div className="p-3"><TasksList tasks={contact.tasks || []} /></div>
                    </CardShell>
                );
            }
            case 'appointments': {
                const upcoming = (contact.meetings || []).filter((m: any) => !m.is_completed && new Date(m.starts_at) >= new Date());
                const past = (contact.meetings || []).filter((m: any) => m.is_completed || new Date(m.starts_at) < new Date());
                return (
                    <CardShell
                        iconPath={cardIcons.appointments}
                        title="Appointments"
                        count={upcoming.length}
                        collapsed={!!collapsed.appointments}
                        onToggle={() => toggle('appointments')}
                        actions={
                            <span onClick={(e) => { e.stopPropagation(); setShowAppointmentModal(true); }} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6] border border-transparent hover:border-[#E4E7EB] rounded-[4px] transition-colors cursor-pointer">
                                {PlusIcon}
                            </span>
                        }
                    >
                        <div className="p-3"><AppointmentsList meetings={upcoming} pastMeetings={past} /></div>
                    </CardShell>
                );
            }
            case 'favourites':
                return (
                    <CardShell iconPath={cardIcons.favourites} title="Favourites" collapsed={!!collapsed.favs} onToggle={() => toggle('favs')}>
                        <div className="p-4">
                            <EmptyState iconPath={cardIcons.favourites} title="No favourite listings" hint="Listings this lead liked on your website" />
                        </div>
                    </CardShell>
                );
            case 'website_activity':
                return (
                    <CardShell iconPath={cardIcons.website_activity} title="Website Activity" collapsed={!!collapsed.activity} onToggle={() => toggle('activity')}>
                        <div className="p-4">
                            <EmptyState
                                iconPath="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                                title="No activity tracked yet"
                                hint="Page views and browsing history from IDX"
                            />
                        </div>
                    </CardShell>
                );
            default:
                return null;
        }
    }

    return (
        <>
            <div className={`min-w-0 flex flex-col gap-4 ${mobileSection !== 'sidebar' ? 'hidden lg:flex' : ''}`}>
                {cardOrder.map((key) => {
                    const content = renderCard(key);
                    if (!content) return null;
                    return (
                        <div
                            key={key}
                            draggable
                            onDragStart={() => setDragCard(key)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverCard(key); }}
                            onDrop={() => dropCard(key)}
                            onDragEnd={() => { setDragCard(null); setDragOverCard(null); }}
                            className={`transition-all ${dragCard === key ? 'opacity-40 scale-[0.98]' : ''} ${dragOverCard === key && dragCard !== key ? 'ring-2 ring-[#1693C9]/30 ring-offset-1 rounded-[4px]' : ''}`}
                        >
                            {content}
                        </div>
                    );
                })}
            </div>

            <TaskFormModal
                isOpen={showTaskForm}
                onClose={() => setShowTaskForm(false)}
                contactId={contact.id}
            />

            <AppointmentFormModal
                isOpen={showAppointmentModal}
                onClose={() => setShowAppointmentModal(false)}
                contactId={contact.id}
            />
        </>
    );
}
