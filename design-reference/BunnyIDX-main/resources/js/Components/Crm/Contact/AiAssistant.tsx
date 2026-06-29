import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Contact } from './types';

interface AiChatResponse {
    interpretation?: string;
    answer?: string;
    action?: string;
    draft?: { type: string; subject?: string; body: string; cc?: string; bcc?: string };
    tasks?: Array<{ title: string; description: string; priority: string; due_date: string; selected?: boolean }>;
    new_status?: string;
    suggestions?: string[];
    meeting?: { title: string; meeting_type: string; description: string; location: string; starts_at: string; ends_at: string | null };
    listings?: Array<{ address?: { full?: string; city?: string; state_province?: string }; price?: number; bedrooms?: number; bathrooms?: number; sqft?: number; photos?: string[]; mls_number?: string; mls_id?: string; property_type?: string }>;
    listing_search?: Record<string, any>;
    listings_total?: number;
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    data?: AiChatResponse;
    timestamp: Date;
}

const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export type Draft = NonNullable<AiChatResponse['draft']>;

interface Props {
    contact: Contact;
    userEmail: string;
    onApplyDraft: (draft: Draft) => void;
    onStatusChange: (newStatus: string) => void;
}

export default function AiAssistant({ contact, userEmail, onApplyDraft, onStatusChange }: Props) {
    // Chat state
    const [aiQuery, setAiQuery] = useState('');
    const [aiChatLoading, setAiChatLoading] = useState(false);
    const [aiExpanded, setAiExpanded] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatMsgId, setChatMsgId] = useState(0);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Action modal state
    const [aiModal, setAiModal] = useState<'tasks' | 'email' | 'sms' | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiTasks, setAiTasks] = useState<Array<{ title: string; description: string; priority: string; due_date: string; selected: boolean }>>([]);
    const [aiEmail, setAiEmail] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
    const [aiSms, setAiSms] = useState('');
    const [aiError, setAiError] = useState('');
    const [aiSaving, setAiSaving] = useState(false);

    // Modal handlers
    async function handleCreateTasks() {
        const selected = aiTasks.filter((t) => t.selected);
        if (selected.length === 0) return;
        setAiSaving(true);
        try {
            const res = await fetch(`/crm/contacts/${contact.uuid}/ai/create-tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' },
                body: JSON.stringify({ tasks: selected }),
            });
            const data = await res.json();
            if (data.created) { setAiModal(null); router.reload(); }
        } catch { setAiError('Failed to save tasks.'); }
        finally { setAiSaving(false); }
    }

    async function handleSaveEmail() {
        setAiSaving(true);
        try {
            router.post(route('crm.email-logs.store'), {
                contact_id: contact.id,
                direction: 'outbound',
                from_address: userEmail,
                to_address: contact.email || '',
                subject: aiEmail.subject,
                body_preview: aiEmail.body,
                sent_at: new Date().toISOString(),
            }, {
                preserveScroll: true,
                onSuccess: () => { setAiModal(null); },
                onFinish: () => { setAiSaving(false); },
            });
        } catch { setAiSaving(false); }
    }

    async function handleSaveSms() {
        setAiSaving(true);
        try {
            router.post(route('crm.sms-logs.store'), {
                contact_id: contact.id,
                direction: 'outbound',
                phone_number: contact.phone || contact.mobile || '',
                body: aiSms,
                sent_at: new Date().toISOString(),
            }, {
                preserveScroll: true,
                onSuccess: () => { setAiModal(null); },
                onFinish: () => { setAiSaving(false); },
            });
        } catch { setAiSaving(false); }
    }

    // Chat handlers
    function handleAiBlur() {
        blurTimeoutRef.current = setTimeout(() => {
            if (!aiQuery && chatMessages.length === 0) setAiExpanded(false);
        }, 200);
    }
    function handleAiFocus() {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        setAiExpanded(true);
    }

    function handleAiSuggestionClick(suggestion: string) {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        setAiQuery(suggestion);
        submitAiChat(suggestion);
    }

    async function handleAiSubmit(e: React.FormEvent) {
        e.preventDefault();
        submitAiChat(aiQuery);
    }

    async function submitAiChat(queryText: string) {
        if (!queryText.trim() || aiChatLoading) return;
        setAiChatLoading(true);
        setAiExpanded(true);

        const userMsg: ChatMessage = { id: chatMsgId + 1, role: 'user', text: queryText, timestamp: new Date() };
        setChatMsgId((prev) => prev + 2);
        setChatMessages((prev) => [...prev, userMsg]);
        setAiQuery('');

        try {
            const res = await fetch(`/crm/contacts/${contact.uuid}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' },
                body: JSON.stringify({ query: queryText }),
            });

            if (!res.ok) {
                setChatMessages((prev) => [...prev, { id: chatMsgId + 2, role: 'assistant', text: 'Something went wrong. Please try again.', timestamp: new Date() }]);
                setAiChatLoading(false);
                return;
            }

            const data: AiChatResponse = await res.json();
            setChatMessages((prev) => [...prev, {
                id: chatMsgId + 2,
                role: 'assistant',
                text: data.answer || data.interpretation || 'Done.',
                data,
                timestamp: new Date(),
            }]);
            if (data.action === 'change_status' && data.new_status) {
                onStatusChange(data.new_status);
            }
        } catch {
            setChatMessages((prev) => [...prev, { id: chatMsgId + 2, role: 'assistant', text: 'Failed to connect. Please try again.', timestamp: new Date() }]);
        } finally {
            setAiChatLoading(false);
            setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
    }

    function clearAiChat() {
        setAiQuery('');
        setChatMessages([]);
        setAiExpanded(false);
    }

    function handleDirectSaveDraft(draft: Draft) {
        if (draft.type === 'email') {
            router.post(route('crm.email-logs.store'), {
                contact_id: contact.id, direction: 'outbound', from_address: userEmail, to_address: contact.email || '',
                subject: draft.subject || '', body_preview: draft.body, cc: draft.cc || '', bcc: draft.bcc || '',
                sent_at: new Date().toISOString(),
            }, { preserveScroll: true });
        } else if (draft.type === 'sms') {
            router.post(route('crm.sms-logs.store'), {
                contact_id: contact.id, direction: 'outbound', phone_number: contact.phone || contact.mobile || '',
                body: draft.body, sent_at: new Date().toISOString(),
            }, { preserveScroll: true });
        } else if (draft.type === 'note') {
            router.post(route('crm.notes.store'), {
                notable_type: 'contact', notable_id: contact.id, body: draft.body,
            }, { preserveScroll: true });
        } else if (draft.type === 'call_notes') {
            router.post(route('crm.call-logs.store'), {
                contact_id: contact.id, direction: 'outbound', outcome: 'connected',
                phone_number: contact.phone || contact.mobile || '', notes: draft.body,
            }, { preserveScroll: true });
        }
    }

    function handleApplyTasks(tasks: AiChatResponse['tasks']) {
        if (!tasks) return;
        setAiTasks(tasks.map((t) => ({ ...t, selected: true })));
        setAiModal('tasks');
    }

    async function handleScheduleMeeting(meeting: AiChatResponse['meeting']) {
        if (!meeting) return;
        try {
            const res = await fetch(`/crm/contacts/${contact.uuid}/ai/create-meeting`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), 'Accept': 'application/json' },
                body: JSON.stringify(meeting),
            });
            const data = await res.json();
            if (data.created) router.reload();
        } catch {}
    }

    const draftTypeLabel = (type: string) => type === 'call_notes' ? 'Call Notes' : type === 'email' ? 'Email Draft' : type === 'sms' ? 'SMS Draft' : 'Note Draft';

    return (
        <>
            <style>{`@keyframes ai-border-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
                <div className="mx-auto max-w-2xl px-4 pb-4 pointer-events-auto">
                    {aiExpanded && chatMessages.length > 0 && (
                        <div ref={chatScrollRef} className="mb-2 bg-white border border-[#BFDBFE] rounded-[4px] shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
                            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#EBF5FF] to-[#DBEAFE] border-b border-[#BFDBFE]">
                                <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 flex items-center justify-center rounded-[4px] bg-[#1693C9]">
                                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                                    </div>
                                    <span className="text-[11px] font-semibold text-[#1693C9]">AI Assistant</span>
                                </div>
                                <button onMouseDown={(e) => { e.preventDefault(); clearAiChat(); }} className="text-[10px] font-medium text-[#8B9096] hover:text-[#5F656D] transition-colors">Clear chat</button>
                            </div>
                            <div className="divide-y divide-[#F3F4F6]">
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`px-4 py-3 ${msg.role === 'user' ? 'bg-[#FAFAFA]' : ''}`}>
                                        {msg.role === 'user' ? (
                                            <div className="flex items-start gap-2.5">
                                                <div className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-[#E4E7EB] text-[9px] font-bold text-[#5F656D]">You</div>
                                                <p className="text-sm text-[#5F656D] pt-0.5">{msg.text}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {msg.data?.interpretation && msg.data.interpretation !== msg.text && (
                                                    <div className="flex items-center gap-1.5">
                                                        <svg className="h-3 w-3 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
                                                        <span className="text-[10px] text-[#8B9096] italic">{msg.data.interpretation}</span>
                                                    </div>
                                                )}
                                                {msg.text && <p className="text-sm text-[#111315] leading-relaxed whitespace-pre-line">{msg.text}</p>}

                                                {msg.data?.draft && (
                                                    <div className="mt-2 p-3 bg-white border border-[#E4E7EB] rounded-[4px]">
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <span className="text-[11px] font-medium text-[#1693C9]">{draftTypeLabel(msg.data.draft.type)}</span>
                                                        </div>
                                                        {msg.data.draft.subject && (
                                                            <p className="text-[11px] font-semibold text-[#5F656D] mb-1">Subject: {msg.data.draft.subject}</p>
                                                        )}
                                                        <p className="text-[12px] text-[#5F656D] leading-relaxed whitespace-pre-line">{msg.data.draft.body}</p>
                                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F3F4F6]">
                                                            <button onMouseDown={(e) => { e.preventDefault(); handleDirectSaveDraft(msg.data!.draft!); }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-[4px] transition-colors">
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                                                                {msg.data.draft.type === 'email' || msg.data.draft.type === 'sms' ? 'Send' : 'Confirm & Log'}
                                                            </button>
                                                            <button onMouseDown={(e) => { e.preventDefault(); onApplyDraft(msg.data!.draft!); }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#1693C9] bg-[#E6F0FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[4px] transition-colors">
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                                                                {msg.data.draft.type === 'email' || msg.data.draft.type === 'sms' ? 'Edit in Tab' : 'Edit'}
                                                            </button>
                                                            <button onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                const text = msg.data?.draft?.subject ? `Subject: ${msg.data.draft.subject}\n\n${msg.data.draft.body}` : msg.data?.draft?.body || '';
                                                                navigator.clipboard.writeText(text);
                                                            }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#5F656D] bg-[#F9FAFB] border border-[#E4E7EB] hover:bg-[#F3F4F6] rounded-[4px] transition-colors">
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                                                                Copy
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {msg.data?.tasks && msg.data.tasks.length > 0 && (
                                                    <div className="mt-2 p-3 bg-white border border-[#E4E7EB] rounded-[4px]">
                                                        <p className="text-[11px] font-medium text-[#1693C9] mb-1.5">{msg.data.tasks.length} Suggested Tasks</p>
                                                        {msg.data.tasks.map((t, i) => (
                                                            <p key={i} className="text-[12px] text-[#5F656D] truncate">- {t.title}</p>
                                                        ))}
                                                        <button onMouseDown={(e) => { e.preventDefault(); handleApplyTasks(msg.data?.tasks); }} className="mt-2 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#1693C9] bg-[#E6F0FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-[4px] transition-colors">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                                            Review & Create Tasks
                                                        </button>
                                                    </div>
                                                )}

                                                {msg.data?.action === 'schedule_meeting' && msg.data.meeting && (
                                                    <div className="mt-2 p-3 bg-white border border-[#E4E7EB] rounded-[4px]">
                                                        <p className="text-[11px] font-medium text-[#D97706] mb-1.5">Meeting</p>
                                                        <p className="text-[12px] font-medium text-[#5F656D]">{msg.data.meeting.title}</p>
                                                        <p className="text-[11px] text-[#5F656D] mt-0.5">
                                                            {new Date(msg.data.meeting.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(msg.data.meeting.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                            {' '}&middot; {cap(msg.data.meeting.meeting_type)}
                                                        </p>
                                                        {msg.data.meeting.location && <p className="text-[11px] text-[#8B9096] mt-0.5">{msg.data.meeting.location}</p>}
                                                        <button onMouseDown={(e) => { e.preventDefault(); handleScheduleMeeting(msg.data?.meeting); }} className="mt-2 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#D97706] bg-[#FFFBEB] border border-[#FDE68A] hover:bg-[#FEF3C7] rounded-[4px] transition-colors">
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
                                                            Add to Calendar
                                                        </button>
                                                    </div>
                                                )}

                                                {msg.data?.action === 'search_listings' && msg.data.listings && msg.data.listings.length > 0 && (
                                                    <div className="mt-2 p-3 bg-white border border-[#E4E7EB] rounded-[4px]">
                                                        <p className="text-[11px] font-medium text-[#059669] mb-1.5">{msg.data.listings_total ?? msg.data.listings.length} Listings Found</p>
                                                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                            {msg.data.listings.map((l, i) => (
                                                                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-[#F3F4F6] last:border-0">
                                                                    {l.photos && l.photos[0] && (
                                                                        <img src={l.photos[0]} alt="" className="shrink-0 h-10 w-14 rounded-[4px] object-cover bg-[#F3F4F6]" />
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[11px] font-medium text-[#5F656D] truncate">{l.address?.full || l.mls_number || 'Listing'}</p>
                                                                        <div className="flex items-center gap-2 text-[10px] text-[#8B9096]">
                                                                            {l.price && <span className="font-medium text-[#059669]">${l.price.toLocaleString()}</span>}
                                                                            {l.bedrooms && <span>{l.bedrooms}bd</span>}
                                                                            {l.bathrooms && <span>{l.bathrooms}ba</span>}
                                                                            {l.sqft && <span>{l.sqft.toLocaleString()}sf</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {msg.data?.action === 'change_status' && msg.data.new_status && (
                                                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[4px] px-3 py-2 mt-1">
                                                        <p className="text-xs text-[#059669] font-medium">Status changed to {cap(msg.data.new_status)}</p>
                                                    </div>
                                                )}

                                                {msg.data?.suggestions && msg.data.suggestions.length > 0 && (
                                                    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                                                        {msg.data.suggestions.map((s, i) => (
                                                            <button key={i} onMouseDown={(e) => { e.preventDefault(); handleAiSuggestionClick(s); }} className="shrink-0 px-2.5 py-1 text-[10px] font-medium text-[#5F656D] bg-white border border-[#E4E7EB] hover:bg-[#F3F4F6] hover:text-[#5F656D] rounded-full transition-colors whitespace-nowrap">
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {aiChatLoading && (
                                    <div className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-[#1693C9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                            <span className="text-[11px] text-[#8B9096]">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="relative rounded-[4px] p-[1.5px]" style={{ background: aiExpanded || chatMessages.length > 0 ? undefined : 'transparent' }}>
                        {(aiExpanded || chatMessages.length > 0) && (
                            <div className="absolute inset-0 rounded-[4px]" style={{ background: 'linear-gradient(90deg, #1693C9, #0891B2, #1693C9, #0891B2)', backgroundSize: '200% 100%', animation: 'ai-border-shimmer 3s linear infinite' }} />
                        )}
                        <div className={`relative bg-white rounded-[4px] shadow-xl ${!(aiExpanded || chatMessages.length > 0) ? 'border border-[#E4E7EB] hover:border-[#93C5FD]' : ''} transition-all`}>
                            <form onSubmit={handleAiSubmit} className="flex items-center">
                                <div className="flex items-center pl-4 pr-1.5">
                                    {aiChatLoading ? (
                                        <svg className="animate-spin h-5 w-5 text-[#1693C9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    ) : (
                                        <div className="h-7 w-7 flex items-center justify-center rounded-[4px] bg-gradient-to-br from-[#1693C9] to-[#1380AF]">
                                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={aiInputRef}
                                    type="text"
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    onFocus={handleAiFocus}
                                    onBlur={handleAiBlur}
                                    placeholder={chatMessages.length > 0 ? 'Ask a follow-up...' : aiExpanded ? `Ask about ${contact.first_name} — draft emails, tasks, call prep...` : `AI Assistant — ask about ${contact.first_name}, draft emails, tasks...`}
                                    className="flex-1 text-sm text-[#111315] placeholder:text-[#8B9096] border-0 py-3.5 px-3 focus:outline-none focus:ring-0 bg-transparent"
                                    disabled={aiChatLoading}
                                />
                                {(aiQuery || aiExpanded || chatMessages.length > 0) && (
                                    <button type="submit" disabled={aiChatLoading || !aiQuery.trim()} className="shrink-0 mr-2 h-8 w-8 flex items-center justify-center rounded-[4px] bg-gradient-to-br from-[#1693C9] to-[#1380AF] text-white hover:from-[#1380AF] hover:to-[#004099] disabled:opacity-30 transition-all">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>
                                    </button>
                                )}
                            </form>

                            {aiExpanded && !aiQuery && chatMessages.length === 0 && (
                                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                                    {[
                                        { label: 'Draft follow-up email', q: 'Draft a follow-up email' },
                                        { label: 'Draft text message', q: 'Draft a text message' },
                                        { label: 'Call talking points', q: 'Give me talking points for a call' },
                                        { label: 'Generate tasks', q: 'Suggest follow-up tasks' },
                                        { label: 'Schedule meeting', q: 'Schedule a showing for this week' },
                                        ...(contact.type === 'buyer' ? [{ label: 'Find listings', q: 'Search MLS listings for this buyer' }] : []),
                                        { label: 'Summarize contact', q: 'Give me a summary of this contact' },
                                        { label: 'What should I do next?', q: 'What should I focus on next with this contact?' },
                                    ].map((chip, i) => (
                                        <button key={i} onMouseDown={(e) => { e.preventDefault(); handleAiSuggestionClick(chip.q); }} className="shrink-0 px-3 py-1.5 text-xs font-medium text-[#5F656D] bg-[#F9FAFB] border border-[#E4E7EB] hover:bg-[#F3F4F6] hover:text-[#111315] hover:border-[#D1D5DB] rounded-full transition-colors whitespace-nowrap">
                                            {chip.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {aiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setAiModal(null)} />
                    <div className="relative bg-white border border-[#E4E7EB] shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col rounded-[4px] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EB] shrink-0">
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                                <h2 className="text-sm font-semibold text-[#111315]">
                                    {aiModal === 'tasks' && 'AI Task Generator'}
                                    {aiModal === 'email' && 'AI Email Draft'}
                                    {aiModal === 'sms' && 'AI Text Draft'}
                                </h2>
                            </div>
                            <button onClick={() => setAiModal(null)} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            {aiLoading && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <svg className="animate-spin h-6 w-6 text-[#1693C9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                    <p className="mt-3 text-sm text-[#8B9096]">
                                        {aiModal === 'tasks' && 'Generating tasks...'}
                                        {aiModal === 'email' && 'Drafting email...'}
                                        {aiModal === 'sms' && 'Drafting message...'}
                                    </p>
                                </div>
                            )}

                            {aiError && !aiLoading && (
                                <div className="bg-red-50 border border-red-200 rounded-[4px] p-4"><p className="text-sm text-red-800">{aiError}</p></div>
                            )}

                            {aiModal === 'tasks' && !aiLoading && aiTasks.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-xs text-[#8B9096]">Select tasks to create for {contact.first_name}:</p>
                                    {aiTasks.map((task, i) => (
                                        <label key={i} className={`flex items-start gap-3 p-3 border rounded-[4px] cursor-pointer transition-colors ${task.selected ? 'border-[#1693C9] bg-[#E6F0FF]' : 'border-[#E4E7EB] bg-white hover:bg-[#F9FAFB]'}`}>
                                            <input type="checkbox" checked={task.selected} onChange={() => setAiTasks((prev) => prev.map((t, j) => j === i ? { ...t, selected: !t.selected } : t))} className="mt-0.5 rounded border-[#D1D5DB] text-[#1693C9] focus:ring-[#1693C9]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#111315]">{task.title}</p>
                                                {task.description && <p className="text-xs text-[#5F656D] mt-0.5">{task.description}</p>}
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${
                                                        task.priority === 'urgent' ? 'bg-[#DC2626] text-white'
                                                        : task.priority === 'high' ? 'bg-[#D97706] text-white'
                                                        : task.priority === 'low' ? 'bg-[#F3F4F6] text-[#5F656D]'
                                                        : 'bg-[#E4E7EB] text-[#5F656D]'
                                                    }`}>{task.priority}</span>
                                                    {task.due_date && <span className="text-[10px] text-[#8B9096]">Due {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {aiModal === 'email' && !aiLoading && aiEmail.subject && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[#5F656D] mb-1">Subject</label>
                                        <input type="text" value={aiEmail.subject} onChange={(e) => setAiEmail((prev) => ({ ...prev, subject: e.target.value }))} className="w-full text-sm border border-[#E4E7EB] rounded-[4px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#5F656D] mb-1">Body</label>
                                        <textarea value={aiEmail.body} onChange={(e) => setAiEmail((prev) => ({ ...prev, body: e.target.value }))} rows={8} className="w-full text-sm border border-[#E4E7EB] rounded-[4px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] resize-y" />
                                    </div>
                                    {contact.email && <p className="text-[11px] text-[#8B9096]">Will be logged as outbound email to {contact.email}</p>}
                                </div>
                            )}

                            {aiModal === 'sms' && !aiLoading && aiSms && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[#5F656D] mb-1">Message</label>
                                        <textarea value={aiSms} onChange={(e) => setAiSms(e.target.value)} rows={4} className="w-full text-sm border border-[#E4E7EB] rounded-[4px] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0891B2] focus:border-[#0891B2] resize-y" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-[#8B9096]">{aiSms.length} characters</p>
                                        {(contact.phone || contact.mobile) && <p className="text-[11px] text-[#8B9096]">To: {contact.phone || contact.mobile}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E4E7EB] shrink-0">
                            <button onClick={() => setAiModal(null)} className="px-4 py-2 text-[13px] font-medium text-[#5F656D] border border-[#E4E7EB] hover:bg-[#F9FAFB] rounded-[4px] transition-colors">Cancel</button>
                            {aiModal === 'tasks' && aiTasks.length > 0 && !aiLoading && (
                                <button onClick={handleCreateTasks} disabled={aiSaving || aiTasks.filter((t) => t.selected).length === 0} className="px-4 py-2 text-[13px] font-medium bg-[#1693C9] text-white hover:bg-[#1380AF] disabled:opacity-40 rounded-[4px] transition-colors">
                                    {aiSaving ? 'Creating...' : `Create ${aiTasks.filter((t) => t.selected).length} Task(s)`}
                                </button>
                            )}
                            {aiModal === 'email' && aiEmail.subject && !aiLoading && (
                                <button onClick={handleSaveEmail} disabled={aiSaving} className="px-4 py-2 text-[13px] font-medium bg-[#1693C9] text-white hover:bg-[#1380AF] disabled:opacity-40 rounded-[4px] transition-colors">
                                    {aiSaving ? 'Saving...' : 'Log Email'}
                                </button>
                            )}
                            {aiModal === 'sms' && aiSms && !aiLoading && (
                                <button onClick={handleSaveSms} disabled={aiSaving} className="px-4 py-2 text-[13px] font-medium bg-[#1693C9] text-white hover:bg-[#1380AF] disabled:opacity-40 rounded-[4px] transition-colors">
                                    {aiSaving ? 'Saving...' : 'Log SMS'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
