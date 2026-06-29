import { Link, router } from '@inertiajs/react';
import { useState, ReactNode } from 'react';
import Avatar from '@/Components/Crm/Avatar';

interface TimelineEvent {
    id: number;
    event_type: string;
    subject: string;
    description: string | null;
    /** Full note body (note_created events only) — the description column is truncated. */
    full_body?: string | null;
    metadata: Record<string, any> | null;
    is_pinned: boolean;
    created_at: string;
    user?: { id: number; name: string } | null;
    contact?: { id: number; uuid: string; first_name: string; last_name: string } | null;
}

type FilterKey = 'all' | 'pinned' | 'notes' | 'calls' | 'emails' | 'texts' | 'tasks' | 'appointments' | 'other';

interface EventCfg { icon: string; bg: string; label: string; header: string; filter: FilterKey }

const eventConfig: Record<string, EventCfg> = {
    note_created:        { icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z', bg: '#D97706', label: 'Note', header: 'Note added by', filter: 'notes' },
    call_logged:         { icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z', bg: '#1693C9', label: 'Call', header: 'Call logged by', filter: 'calls' },
    email_logged:        { icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75', bg: '#7C3AED', label: 'Email', header: 'Email logged by', filter: 'emails' },
    email_sent:          { icon: 'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5', bg: '#7C36EE', label: 'Email', header: 'Email sent by', filter: 'emails' },
    email_received:      { icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75', bg: '#059669', label: 'Email', header: 'Email received from', filter: 'emails' },
    sms_logged:          { icon: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z', bg: '#0891B2', label: 'Text', header: 'Text sent by', filter: 'texts' },
    meeting_scheduled:   { icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5', bg: '#D97706', label: 'Appt', header: 'Event added by', filter: 'appointments' },
    meeting_completed:   { icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', bg: '#059669', label: 'Appt', header: 'Event completed by', filter: 'appointments' },
    task_created:        { icon: 'M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75', bg: '#5F656D', label: 'Task', header: 'Task added by', filter: 'tasks' },
    task_completed:      { icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', bg: '#059669', label: 'Task', header: 'Task completed by', filter: 'tasks' },
    deal_stage_changed:  { icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z', bg: '#4F46E5', label: 'Deal', header: 'Deal stage changed by', filter: 'other' },
    deal_won:            { icon: 'M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 0 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228M18.75 4.236V2.721', bg: '#D97706', label: 'Deal', header: 'Deal won by', filter: 'other' },
    deal_lost:           { icon: 'M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636', bg: '#DC2626', label: 'Deal', header: 'Deal lost by', filter: 'other' },
    contact_created:     { icon: 'M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z', bg: '#1693C9', label: 'Created', header: 'Created by', filter: 'other' },
    contact_type_changed:{ icon: 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5', bg: '#D97706', label: 'Type', header: 'Type changed by', filter: 'other' },
};

const defaultConfig: EventCfg = { icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', bg: '#8B9096', label: 'Event', header: 'Event', filter: 'other' };

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDateTime(dateStr);
}

interface FilterTab {
    key: FilterKey;
    label: string;
    icon: ReactNode;
}

const filterTabs: FilterTab[] = [
    { key: 'all', label: 'All', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg> },
    { key: 'pinned', label: 'Pinned', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125V17.25m8.25 0V8.25a3 3 0 0 0-3-3h-2.25a3 3 0 0 0-3 3v9m8.25 0H7.5" /></svg> },
    { key: 'notes', label: 'Notes', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg> },
    { key: 'calls', label: 'Calls', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg> },
    { key: 'emails', label: 'Emails', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg> },
    { key: 'texts', label: 'Texts', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg> },
    { key: 'tasks', label: 'Tasks', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
    { key: 'appointments', label: 'Appts', icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg> },
];

function PinIcon({ pinned }: { pinned: boolean }) {
    // Rotated map-pin → reads as a thumbtack/pushpin
    return (
        <svg className="h-3.5 w-3.5" style={{ transform: 'rotate(45deg)' }} fill={pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
    );
}

function EditIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
        </svg>
    );
}

interface CardProps {
    event: TimelineEvent;
    onTogglePin: (id: number) => void;
    onDelete: (id: number) => void;
    onEditNote: (id: number, body: string) => void;
}

function EventCard({ event, onTogglePin, onDelete, onEditNote }: CardProps) {
    const cfg = eventConfig[event.event_type] || defaultConfig;
    const userName = event.user?.name || 'System';
    const body = event.description || '';
    const subjectIsBody = event.subject && !body;
    const isNote = event.event_type === 'note_created';
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');

    function startEdit() {
        setDraft(event.full_body ?? event.description ?? '');
        setEditing(true);
    }
    function saveEdit() {
        const trimmed = draft.trim();
        if (!trimmed) return;
        onEditNote(event.id, trimmed);
        setEditing(false);
    }
    return (
        <div className={`bg-white border ${event.is_pinned ? 'border-[#FCD34D]' : 'border-[#E4E7EB]'} rounded-[4px] overflow-hidden`}>
            <div className="flex items-center justify-between px-3 py-2 bg-[#F3F4F6] border-b border-[#E4E7EB]">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full text-white" style={{ backgroundColor: cfg.bg }}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                        </svg>
                    </span>
                    {event.user ? (
                        <>
                            <span className="text-[12px] font-medium text-[#5F656D] shrink-0">{cfg.header}</span>
                            <Avatar id={event.user.id} name={userName} size="sm" />
                            <span className="text-[12px] font-semibold text-[#111315] truncate">{userName}</span>
                        </>
                    ) : (
                        <span className="text-[12px] font-medium text-[#5F656D] shrink-0">{cfg.label}</span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] text-[#8B9096] mr-1" title={formatDateTime(event.created_at)}>{timeAgo(event.created_at)}</span>
                    {isNote && !editing && (
                        <button
                            type="button"
                            onClick={startEdit}
                            title="Edit"
                            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-[#8B9096] hover:text-[#1693C9] hover:bg-white transition-colors"
                        >
                            <EditIcon />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onTogglePin(event.id)}
                        title={event.is_pinned ? 'Unpin' : 'Pin'}
                        className={`h-6 w-6 inline-flex items-center justify-center rounded-md transition-colors ${event.is_pinned ? 'text-[#D97706] bg-[#FEF3C7] hover:bg-[#FDE68A]' : 'text-[#8B9096] hover:text-[#111315] hover:bg-white'}`}
                    >
                        <PinIcon pinned={event.is_pinned} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(event.id)}
                        title="Delete"
                        className="h-6 w-6 inline-flex items-center justify-center rounded-md text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
            <div className="px-3 py-3">
                {editing ? (
                    <div>
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full border border-[#E4E7EB] rounded-lg text-[13px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] resize-y"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-medium text-[#5F656D] bg-[#F3F4F6] rounded-lg hover:bg-[#E4E7EB] transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={saveEdit} disabled={!draft.trim()} className="bg-[#1693C9] px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-40 transition-colors">
                                Save
                            </button>
                        </div>
                    </div>
                ) : subjectIsBody ? (
                    <p className="text-[13px] text-[#111315] leading-relaxed whitespace-pre-line">{event.subject}</p>
                ) : (
                    <>
                        {event.subject && <p className="text-[12px] font-medium text-[#5F656D] mb-1.5">{event.subject}</p>}
                        {body && (
                            <div className="inline-block max-w-full bg-[#F3F4F6] text-[#111315] text-[13px] leading-relaxed rounded-2xl rounded-tl-sm px-3.5 py-2 whitespace-pre-line">
                                {body}
                            </div>
                        )}
                    </>
                )}
                {event.contact && (
                    <Link href={route('crm.contacts.show', event.contact.uuid)} className="mt-2 inline-block text-xs text-[#1693C9] hover:underline">
                        {event.contact.first_name} {event.contact.last_name}
                    </Link>
                )}
            </div>
        </div>
    );
}

export default function TimelineFeed({ events }: { events: TimelineEvent[] }) {
    const [filter, setFilter] = useState<FilterKey>('all');

    // Build counts per filter key
    const counts = events.reduce((acc, e) => {
        const cfg = eventConfig[e.event_type] || defaultConfig;
        acc.all++;
        if (e.is_pinned) acc.pinned++;
        acc[cfg.filter]++;
        return acc;
    }, { all: 0, pinned: 0, notes: 0, calls: 0, emails: 0, texts: 0, tasks: 0, appointments: 0, other: 0 } as Record<FilterKey, number>);

    const filteredEvents = events.filter((e) => {
        if (filter === 'all') return true;
        if (filter === 'pinned') return e.is_pinned;
        const cfg = eventConfig[e.event_type] || defaultConfig;
        return cfg.filter === filter;
    });

    function handleTogglePin(id: number) {
        router.patch(route('crm.activities.pin', id), {}, { preserveScroll: true });
    }
    function handleDelete(id: number) {
        if (!confirm('Delete this timeline entry? This also removes the underlying record.')) return;
        router.delete(route('crm.activities.destroy', id), { preserveScroll: true });
    }
    function handleEditNote(id: number, body: string) {
        router.patch(route('crm.activities.update', id), { body }, { preserveScroll: true });
    }

    if (events.length === 0) return null;

    return (
        <div>
            {/* Header bar with filter tabs */}
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h3 className="text-[15px] font-semibold text-[#111315] shrink-0">
                    History <span className="text-[#8B9096] font-normal">({counts.all})</span>
                </h3>
                <div className="flex items-center gap-1 bg-[#F3F4F6] border border-[#E4E7EB] rounded-full p-1 flex-wrap">
                    {filterTabs.map((tab) => {
                        const count = counts[tab.key];
                        if (tab.key !== 'all' && count === 0) return null;
                        const isActive = filter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setFilter(tab.key)}
                                className={`inline-flex items-center gap-1 px-2.5 h-6 text-[11px] font-medium rounded-full transition-colors whitespace-nowrap ${
                                    isActive ? 'bg-white text-[#282B36] shadow-sm' : 'text-[#5F656D] hover:text-[#282B36]'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                <span className={`text-[10px] ${isActive ? 'text-[#8B9096]' : 'text-[#8B9096]'}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {filteredEvents.length === 0 ? (
                <p className="text-xs text-[#8B9096] py-4 text-center">No entries match this filter.</p>
            ) : (
                <ul className="space-y-2">
                    {filteredEvents.map((event) => (
                        <li key={event.id}>
                            <EventCard event={event} onTogglePin={handleTogglePin} onDelete={handleDelete} onEditNote={handleEditNote} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
