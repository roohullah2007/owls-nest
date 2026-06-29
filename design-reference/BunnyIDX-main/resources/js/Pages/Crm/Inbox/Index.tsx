import CrmLayout from '@/Layouts/CrmLayout';
import Avatar from '@/Components/Crm/Avatar';
import MessageComposer from '@/Components/Crm/MessageComposer';
import PillTabs from '@/Components/Crm/PillTabs';
import TagPicker from '@/Components/Crm/Contact/TagPicker';
import axios from 'axios';
import { getAvatarColor } from '@/utils/avatarColors';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { InboxConversation, InboxMessage, PageProps } from '@/types';

interface Props {
    conversations: InboxConversation[];
}

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function ChannelIcon({ channel, className = 'h-3 w-3' }: { channel: string; className?: string }) {
    if (channel === 'email') return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>;
    if (channel === 'sms') return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>;
    return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>;
}

function channelColor(channel: string) {
    if (channel === 'email') return '#1693C9';
    if (channel === 'sms') return '#059669';
    return '#D97706';
}

const typeColors: Record<string, { bg: string; text: string }> = {
    buyer: { bg: '#1693C9', text: '#FFFFFF' },
    seller: { bg: '#D97706', text: '#FFFFFF' },
    prospect: { bg: '#4F46E5', text: '#FFFFFF' },
    past_client: { bg: '#5F656D', text: '#FFFFFF' },
    referral: { bg: '#0891B2', text: '#FFFFFF' },
};

function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ContactDetails {
    id: number;
    uuid: string;
    name: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    type: string;
    source: string;
    status: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    lead_score: number | null;
    last_contacted_at: string | null;
    created_at: string;
    sms_consent: boolean;
    sms_opted_out: boolean;
    dnd_mode: 'none' | 'all' | 'sms' | 'calls';
    tags: { id: number; name: string; color: string }[];
    deals: { id: number; title: string; value: number }[];
    assigned_users: { id: number; name: string }[];
    tasks: InboxTask[];
    meetings: InboxMeeting[];
    custom_fields: Record<string, string>;
}

interface InboxOptions {
    lead_types: string[];
    statuses: string[];
    all_tags: { id: number; name: string; color: string }[];
    custom_field_defs: { key: string; label: string; type: string; lead_types?: string[] }[];
}

interface InboxTask {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    due_at: string | null;
    is_completed: boolean;
    completed_at: string | null;
}

interface InboxMeeting {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    meeting_type: string;
    starts_at: string | null;
    ends_at: string | null;
    is_completed: boolean;
}

interface SearchContact {
    id: number;
    uuid: string;
    name: string;
    email: string | null;
    phone: string | null;
    type: string;
}

export default function InboxIndex({ conversations }: Props) {
    const { auth, hasPhoneNumber, hasEmailAccount } = usePage<PageProps>().props;
    const [activeContactId, setActiveContactId] = useState<number | null>(null);
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [contactInfo, setContactInfo] = useState<ContactDetails | null>(null);
    const [options, setOptions] = useState<InboxOptions | null>(null);
    const [loading, setLoading] = useState(false);
    const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms' | 'call'>('all');
    const threadRef = useRef<HTMLDivElement>(null);
    const [composeChannel, setComposeChannel] = useState<'sms' | 'email'>('email');
    const [inboxTab, setInboxTab] = useState<'all' | 'unread' | 'assigned'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewConvo, setShowNewConvo] = useState(false);
    const [contactSearch, setContactSearch] = useState('');
    const [contactResults, setContactResults] = useState<SearchContact[]>([]);
    const [searchingContacts, setSearchingContacts] = useState(false);
    const contactSearchRef = useRef<HTMLInputElement>(null);
    const newConvoRef = useRef<HTMLDivElement>(null);

    // Auto-select first contact
    useEffect(() => {
        if (conversations.length > 0 && !activeContactId) {
            selectContact(conversations[0].contact_id, conversations[0].contact_uuid);
        }
    }, [conversations]);

    // Auto-pick a sensible default channel when the active contact changes
    useEffect(() => {
        if (!contactInfo) return;
        if (composeChannel === 'email' && !contactInfo.email) setComposeChannel('sms');
        else if (composeChannel === 'sms' && !(contactInfo.phone || contactInfo.mobile)) setComposeChannel('email');
    }, [contactInfo?.id]);

    // Real-time updates
    useEffect(() => {
        if (typeof window.Echo === 'undefined' || !auth.user) return;
        const channel = window.Echo.private(`user.${auth.user.id}`);
        const smsHandler = (e: any) => {
            router.reload({ only: ['conversations'] });
            if (e.message?.contact_id === activeContactId) {
                setMessages((prev) => {
                    if (prev.find((m) => m.channel === 'sms' && m.id === e.message.id)) return prev;
                    return [...prev, {
                        id: e.message.id, channel: 'sms', direction: e.message.direction,
                        timestamp: e.message.created_at, body: e.message.body, status: e.message.status,
                    }];
                });
                setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 100);
            }
        };
        channel.listen('.NewSmsMessage', smsHandler);
        return () => { channel.stopListening('.NewSmsMessage', smsHandler); };
    }, [auth.user?.id, activeContactId]);

    // Contact search for new conversation
    useEffect(() => {
        if (!contactSearch.trim()) { setContactResults([]); return; }
        const timeout = setTimeout(() => {
            setSearchingContacts(true);
            fetch(route('crm.inbox.search-contacts') + '?q=' + encodeURIComponent(contactSearch.trim()), { headers: { Accept: 'application/json' } })
                .then((r) => r.json())
                .then((data) => setContactResults(data))
                .catch(() => setContactResults([]))
                .finally(() => setSearchingContacts(false));
        }, 250);
        return () => clearTimeout(timeout);
    }, [contactSearch]);

    // Close new conversation dropdown on outside click
    useEffect(() => {
        if (!showNewConvo) return;
        function handleClick(e: MouseEvent) {
            if (newConvoRef.current && !newConvoRef.current.contains(e.target as Node)) {
                setShowNewConvo(false);
                setContactSearch('');
                setContactResults([]);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [showNewConvo]);

    // Focus search input when new conversation opens
    useEffect(() => {
        if (showNewConvo) setTimeout(() => contactSearchRef.current?.focus(), 50);
    }, [showNewConvo]);

    function startNewConversation(contact: SearchContact) {
        setShowNewConvo(false);
        setContactSearch('');
        setContactResults([]);
        selectContact(contact.id, contact.uuid);
    }

    function selectContact(contactId: number, uuid?: string) {
        setActiveContactId(contactId);
        setLoading(true);
        setMessages([]);
        setChannelFilter('all');

        // Resolve UUID: from argument, from conversation list, or fallback
        const resolvedUuid = uuid || conversations.find((c) => c.contact_id === contactId)?.contact_uuid || String(contactId);

        fetch(route('crm.inbox.thread', resolvedUuid), { headers: { Accept: 'application/json' } })
            .then((r) => r.json())
            .then((data) => {
                setMessages(data.messages || []);
                setContactInfo(data.contact || null);
                if (data.options) setOptions(data.options);
                setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }), 50);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }

    async function handleContactUpdate(patch: Partial<{ type: string; status: string; tag_ids: number[]; custom_fields: Record<string, string> }>) {
        if (!contactInfo) return;
        const optimistic: any = { ...contactInfo };
        if (patch.type !== undefined) optimistic.type = patch.type;
        if (patch.status !== undefined) optimistic.status = patch.status;
        if (patch.tag_ids !== undefined && options) {
            optimistic.tags = options.all_tags.filter((t) => patch.tag_ids!.includes(t.id));
        }
        if (patch.custom_fields !== undefined) optimistic.custom_fields = patch.custom_fields;
        setContactInfo(optimistic);

        try {
            await axios.patch(route('crm.contacts.update', contactInfo.uuid), {
                first_name: contactInfo.first_name,
                last_name: contactInfo.last_name,
                email: contactInfo.email || '',
                phone: contactInfo.phone || '',
                mobile: contactInfo.mobile || '',
                type: optimistic.type,
                source: contactInfo.source || 'manual',
                status: optimistic.status,
                tags: optimistic.tags.map((t: any) => t.id),
                custom_fields: optimistic.custom_fields || {},
            });
        } catch {
            setContactInfo(contactInfo); // revert
            alert('Failed to update contact');
        }
    }

    async function handleDndChange(mode: 'none' | 'all' | 'sms' | 'calls') {
        if (!contactInfo) return;
        const prev = contactInfo.dnd_mode;
        setContactInfo({ ...contactInfo, dnd_mode: mode });
        try {
            await axios.patch(route('crm.contacts.dnd', contactInfo.uuid), { mode });
        } catch {
            setContactInfo({ ...contactInfo, dnd_mode: prev });
            alert('Failed to update DND setting');
        }
    }

    function handleMessageSent() {
        if (!activeContactId) return;
        // Refetch thread so the newly-sent message shows up
        selectContact(activeContactId);
        setTimeout(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' }), 300);
    }

    const filteredMessages = channelFilter === 'all' ? messages : messages.filter((m) => m.channel === channelFilter);
    const activeConvo = conversations.find((c) => c.contact_id === activeContactId);

    // Filter conversations based on tab and search
    const filteredConversations = conversations.filter((c) => {
        if (inboxTab === 'unread' && c.unread_count === 0) return false;
        if (inboxTab === 'assigned' && !c.assigned_user_ids.includes(auth.user.id)) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return c.contact_name.toLowerCase().includes(q) || (c.contact_email?.toLowerCase().includes(q)) || (c.contact_phone?.includes(q));
        }
        return true;
    });

    const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);
    const assignedCount = conversations.filter((c) => c.assigned_user_ids.includes(auth.user.id)).length;

    return (
        <CrmLayout>
            <Head title="Inbox" />
            <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-[#F3F4F6]">
                {/* LEFT — Conversation list */}
                <div className="w-[300px] shrink-0 border-r border-[#E4E7EB] bg-white flex flex-col overflow-hidden">
                    {/* Inbox tabs */}
                    <div className="px-3 pt-3 pb-0 shrink-0">
                        <PillTabs
                            className="flex w-full"
                            fullWidth
                            active={inboxTab}
                            onChange={(key) => setInboxTab(key)}
                            tabs={[
                                { key: 'all', label: 'All', count: conversations.length },
                                { key: 'unread', label: 'Unread', count: unreadTotal },
                                { key: 'assigned', label: 'Assigned', count: assignedCount },
                            ]}
                        />
                    </div>

                    {/* Search + New Conversation */}
                    <div className="px-3 py-2 shrink-0 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search conversations…"
                                    className="block w-full pl-8 pr-2 py-[5px] text-[13px] leading-[1.42857143] border border-[#C8CCD1] rounded text-[#111315] bg-white placeholder-[#C4C9D1] focus:outline-none focus:border-[#1693C9] focus:ring-0"
                                />
                            </div>
                            <button
                                onClick={() => setShowNewConvo(!showNewConvo)}
                                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-[4px] bg-[#1693C9] text-white hover:bg-[#1380AF] transition-colors"
                                title="New conversation"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                            </button>
                        </div>

                        {/* New conversation contact search dropdown */}
                        {showNewConvo && (
                            <div ref={newConvoRef} className="relative">
                                <div className="border border-[#C8CCD1] rounded-[4px] bg-white shadow-lg overflow-hidden">
                                    <div className="px-3 py-2 border-b border-[#E4E7EB]">
                                        <label className="flex items-center gap-1 text-[13px] font-normal text-[#5F656D] leading-[18px] mb-1">New conversation</label>
                                        <div className="relative">
                                            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                            <input
                                                ref={contactSearchRef}
                                                type="text"
                                                value={contactSearch}
                                                onChange={(e) => setContactSearch(e.target.value)}
                                                placeholder="Search contacts by name, email, or phone…"
                                                className="block w-full pl-8 pr-2 py-[5px] text-[13px] leading-[1.42857143] border border-[#C8CCD1] rounded text-[#111315] bg-white placeholder-[#C4C9D1] focus:outline-none focus:border-[#1693C9] focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[240px] overflow-y-auto">
                                        {searchingContacts ? (
                                            <div className="flex items-center justify-center py-6">
                                                <div className="animate-spin h-4 w-4 border-2 border-[#1693C9] border-t-transparent rounded-full" />
                                            </div>
                                        ) : contactSearch.trim() && contactResults.length === 0 ? (
                                            <div className="px-3 py-4 text-center">
                                                <p className="text-xs text-[#5F656D]">No contacts found</p>
                                                <p className="text-[11px] text-[#5F656D] mt-0.5">Try a different search term</p>
                                            </div>
                                        ) : contactResults.length > 0 ? (
                                            contactResults.map((c) => {
                                                const tc = typeColors[c.type] || { bg: '#5F656D', text: '#FFFFFF' };
                                                const existsInList = conversations.some((cv) => cv.contact_id === c.id);
                                                return (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => startNewConversation(c)}
                                                        className="w-full text-left px-3 py-2.5 hover:bg-[#F9FAFB] transition-colors flex items-center gap-2.5 border-b border-[#F3F4F6] last:border-b-0"
                                                    >
                                                        <Avatar id={c.id} name={c.name} size="md" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[13px] font-medium text-[#111315] truncate">{c.name}</span>
                                                                <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 text-[8px] font-semibold rounded-full text-white" style={{ backgroundColor: tc.bg }}>
                                                                    {capitalize(c.type)}
                                                                </span>
                                                                {existsInList && (
                                                                    <span className="shrink-0 text-[9px] text-[#5F656D]">has messages</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-[#5F656D] truncate">{c.email || c.phone || ''}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="px-3 py-4 text-center">
                                                <p className="text-xs text-[#5F656D]">Type to search contacts</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <svg className="h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                                <p className="mt-3 text-sm text-[#5F656D]">
                                    {searchQuery ? 'No results' : inboxTab === 'unread' ? 'All caught up' : inboxTab === 'assigned' ? 'No assigned conversations' : 'No conversations yet'}
                                </p>
                                <p className="text-xs text-[#5F656D] mt-1">
                                    {searchQuery ? 'Try a different search term' : 'Send an email or SMS to a contact to get started'}
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map((convo) => {
                                return (
                                    <button
                                        key={convo.contact_id}
                                        onClick={() => selectContact(convo.contact_id, convo.contact_uuid)}
                                        className={`w-full text-left px-3 py-3 border-b border-[#F3F4F6] transition-colors ${
                                            activeContactId === convo.contact_id ? 'bg-[#E6F0FF] border-l-2 border-l-[#1693C9]' : 'hover:bg-[#F9FAFB]'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className="relative shrink-0">
                                                <Avatar id={convo.contact_id} name={convo.contact_name} size="lg" />
                                                {convo.lead_score !== null && convo.lead_score !== undefined && (
                                                    <span
                                                        title={`Lead score ${convo.lead_score}`}
                                                        className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[14px] px-1 text-[9px] font-bold rounded-full text-white ring-2 ring-white"
                                                        style={{ backgroundColor: convo.lead_score >= 60 ? '#059669' : convo.lead_score >= 30 ? '#D97706' : '#DC2626' }}
                                                    >
                                                        {convo.lead_score}
                                                    </span>
                                                )}
                                                {convo.unread_count > 0 && (
                                                    <span className="absolute -top-0.5 -right-0.5 h-3.5 min-w-[14px] flex items-center justify-center rounded-full bg-[#1693C9] text-[8px] font-bold text-white px-1 ring-2 ring-white">{convo.unread_count}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center min-w-0">
                                                        <span className={`text-[13px] truncate ${convo.unread_count > 0 ? 'font-semibold text-[#111315]' : 'font-medium text-[#111315]'}`}>
                                                            {convo.contact_name}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-[#5F656D] shrink-0">{timeAgo(convo.last_message_at)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span style={{ color: channelColor(convo.last_channel) }}><ChannelIcon channel={convo.last_channel} className="h-3 w-3" /></span>
                                                    <span className={`text-xs truncate ${convo.unread_count > 0 ? 'text-[#111315] font-medium' : 'text-[#5F656D]'}`}>{convo.last_snippet}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* MIDDLE — Thread */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {!activeContactId ? (
                        <div className="flex-1 flex items-center justify-center text-center px-6">
                            <div className="max-w-sm w-full">
                                <svg className="mx-auto h-12 w-12 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>
                                <p className="mt-3 text-sm font-medium text-[#111315]">Select a conversation</p>
                                <p className="text-xs text-[#5F656D] mt-1">Choose a contact from the left to view messages</p>

                                {(!hasEmailAccount || !hasPhoneNumber) && (
                                    <div className="mt-6 space-y-2.5 text-left">
                                        {!hasEmailAccount && (
                                            <div className="bg-[#FAFBFC] border border-[#E4E7EB] rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-9 w-9 rounded-lg bg-[#E6F0FF] flex items-center justify-center shrink-0">
                                                        <svg className="h-4.5 w-4.5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-medium text-[#111315]">Connect Your Email</p>
                                                        <p className="text-[11px] text-[#5F656D] mt-0.5 leading-relaxed">Link your Gmail account to send and receive emails directly from BunnyIDX.</p>
                                                        <div className="mt-2.5 flex items-center gap-2.5">
                                                            <Link href={route('crm.settings') + '?tab=email'} className="h-7 px-3 text-[11px] font-medium rounded-full bg-[#1693C9] text-white hover:bg-[#1380AF] inline-flex items-center transition-colors">Connect Gmail</Link>
                                                        </div>
                                                        <p className="text-[10px] text-[#8B9096] mt-2.5 leading-relaxed">Need a professional email? We offer Google Workspace inboxes for $5/mo (billed yearly) — a fully managed email service at a discount.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {!hasPhoneNumber && (
                                            <div className="bg-[#FAFBFC] border border-[#E4E7EB] rounded-lg p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-9 w-9 rounded-lg bg-[#ECFDF5] flex items-center justify-center shrink-0">
                                                        <svg className="h-4.5 w-4.5 text-[#059669]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-medium text-[#111315]">Get a Phone Number</p>
                                                        <p className="text-[11px] text-[#5F656D] mt-0.5 leading-relaxed">Provision a local number to send SMS messages and make calls to your contacts.</p>
                                                        <div className="mt-2.5">
                                                            <Link href={route('crm.settings') + '?tab=phone'} className="h-7 px-3 text-[11px] font-medium rounded-full bg-[#059669] text-white hover:bg-[#047857] inline-flex items-center transition-colors">Set Up Phone</Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Thread header */}
                            <div className="px-5 py-3 border-b border-[#E4E7EB] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <Avatar id={activeContactId} name={activeConvo?.contact_name || contactInfo?.name || '?'} size="md" />
                                    <div className="leading-tight">
                                        <Link href={route('crm.contacts.show', activeConvo?.contact_uuid || contactInfo?.uuid || '')} className="block text-[13px] font-semibold text-[#111315] hover:text-[#111315] leading-tight">
                                            {activeConvo?.contact_name || contactInfo?.name}
                                        </Link>
                                        {(contactInfo?.type || activeConvo?.contact_type) && (
                                            <p className="text-[11px] font-medium text-[#111315] leading-tight">
                                                {capitalize(contactInfo?.type || activeConvo!.contact_type)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* Channel filter chips */}
                                <div className="flex items-center gap-0.5 bg-[#F3F4F6] rounded-lg p-1">
                                    {(['all', 'email', 'sms', 'call'] as const).map((ch) => (
                                        <button
                                            key={ch}
                                            onClick={() => setChannelFilter(ch)}
                                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                                channelFilter === ch ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'
                                            }`}
                                        >
                                            {ch === 'all' ? 'All' : ch === 'email' ? 'Email' : ch === 'sms' ? 'SMS' : 'Calls'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Messages */}
                            <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin h-6 w-6 border-2 border-[#1693C9] border-t-transparent rounded-full" />
                                    </div>
                                ) : filteredMessages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-center">
                                        <div>
                                            <svg className="mx-auto h-8 w-8 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /></svg>
                                            <p className="mt-2 text-xs text-[#5F656D]">No {channelFilter === 'all' ? '' : channelFilter + ' '}messages</p>
                                        </div>
                                    </div>
                                ) : (
                                    filteredMessages.map((msg) => (
                                        <div key={`${msg.channel}-${msg.id}`}>
                                            {msg.channel === 'sms' && (
                                                <div className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${msg.direction === 'outbound' ? 'bg-[#1693C9] text-white rounded-br-md' : 'bg-[#F3F4F6] text-[#111315] rounded-bl-md'}`}>
                                                        <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                                                        <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-white/75' : 'text-[#5F656D]'}`}>
                                                            {formatTimestamp(msg.timestamp)}
                                                            {msg.direction === 'outbound' && msg.status && (
                                                                <span className="ml-1.5">{msg.status === 'delivered' ? '\u2713\u2713' : msg.status === 'sent' ? '\u2713' : msg.status === 'failed' ? '\u2717' : '\u25CC'}</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {msg.channel === 'email' && (
                                                <div className="border border-[#E4E7EB] rounded-xl overflow-hidden">
                                                    <div className="bg-[#F9FAFB] px-4 py-2.5 border-b border-[#E4E7EB] flex items-center justify-between">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full" style={{ backgroundColor: msg.direction === 'outbound' ? '#EBF5FF' : '#F3F4F6' }}>
                                                                <ChannelIcon channel="email" className="h-3 w-3 text-[#1693C9]" />
                                                            </span>
                                                            <span className="text-[13px] font-medium text-[#111315] truncate">{msg.subject || '(no subject)'}</span>
                                                        </div>
                                                        <span className="text-[10px] text-[#5F656D] shrink-0 ml-2">{formatTimestamp(msg.timestamp)}</span>
                                                    </div>
                                                    <div className="px-4 py-3">
                                                        <p className="text-[11px] text-[#5F656D] mb-1.5">
                                                            {msg.direction === 'outbound' ? 'To' : 'From'}: {msg.from_name || msg.from_address}
                                                        </p>
                                                        {msg.body_text ? (
                                                            <p className="text-[13px] text-[#5F656D] whitespace-pre-wrap leading-relaxed line-clamp-6">{msg.body_text}</p>
                                                        ) : msg.body_html ? (
                                                            <div className="text-[13px] text-[#5F656D] leading-relaxed line-clamp-6 [&_a]:text-[#1693C9] [&_a]:underline" dangerouslySetInnerHTML={{ __html: msg.body_html }} />
                                                        ) : null}
                                                    </div>
                                                </div>
                                            )}

                                            {msg.channel === 'call' && (
                                                <div className="flex items-center gap-3 px-4 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
                                                    <div className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full ${msg.direction === 'outbound' ? 'bg-[#ECFDF5]' : 'bg-[#EBF5FF]'}`}>
                                                        {msg.direction === 'outbound' ? (
                                                            <svg className="h-4 w-4 text-[#059669]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 3.75v4.5m0-4.5h-4.5m4.5 0-6 6m3 12c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z" /></svg>
                                                        ) : (
                                                            <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75v-4.5m0 4.5h4.5m-4.5 0 6-6m-3 18c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z" /></svg>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-medium text-[#111315]">{msg.direction === 'outbound' ? 'Outgoing' : 'Incoming'} call</span>
                                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${msg.call_status === 'completed' ? 'bg-[#ECFDF5] text-[#059669]' : msg.call_status === 'missed' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#F3F4F6] text-[#5F656D]'}`}>{msg.call_status}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[11px] text-[#5F656D] mt-0.5">
                                                            {msg.duration_seconds != null && msg.duration_seconds > 0 && <span>{Math.floor(msg.duration_seconds / 60)}:{(msg.duration_seconds % 60).toString().padStart(2, '0')}</span>}
                                                            <span>{formatTimestamp(msg.timestamp)}</span>
                                                        </div>
                                                        {msg.notes && <p className="text-xs text-[#5F656D] mt-1">{msg.notes}</p>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Composer — compact: channel switcher inline with a "To" recipient hint, then composer body */}
                            {contactInfo && (
                                <div className="border-t border-[#E4E7EB] bg-white shrink-0 px-4 py-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-0.5 bg-[#F3F4F6] rounded-lg p-0.5">
                                            {contactInfo.email && (
                                                <button
                                                    onClick={() => setComposeChannel('email')}
                                                    className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                                                        composeChannel === 'email' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'
                                                    }`}
                                                >
                                                    Email
                                                </button>
                                            )}
                                            {(contactInfo.phone || contactInfo.mobile) && (
                                                <button
                                                    onClick={() => setComposeChannel('sms')}
                                                    className={`px-2.5 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                                                        composeChannel === 'sms' ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'
                                                    }`}
                                                >
                                                    SMS
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-[#8B9096] truncate">
                                            To <span className="font-medium text-[#5F656D]">
                                                {composeChannel === 'email' ? contactInfo.email : (contactInfo.phone || contactInfo.mobile)}
                                            </span>
                                        </p>
                                    </div>

                                    {composeChannel === 'sms' && (contactInfo.phone || contactInfo.mobile) && (
                                        <MessageComposer
                                            channel="sms"
                                            contactId={contactInfo.id}
                                            contactUuid={contactInfo.uuid}
                                            contactEmail={contactInfo.email}
                                            contactPhone={contactInfo.phone || contactInfo.mobile}
                                            onSent={handleMessageSent}
                                            compact
                                        />
                                    )}

                                    {composeChannel === 'email' && contactInfo.email && (
                                        <MessageComposer
                                            channel="email"
                                            contactId={contactInfo.id}
                                            contactUuid={contactInfo.uuid}
                                            contactEmail={contactInfo.email}
                                            contactPhone={contactInfo.phone || contactInfo.mobile}
                                            onSent={handleMessageSent}
                                            compact
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RIGHT — Lead Details (LeftCard-style single card with sectioned body) */}
                {contactInfo && activeContactId && (
                    <div className="w-[320px] shrink-0 border-l border-[#E4E7EB] bg-[#F2F3F7] overflow-y-auto">
                        <div className="p-3">
                            <div className="min-w-0 border border-[#E4E7EB] bg-white rounded-xl flex flex-col">

                                {/* Teal Header */}
                                <div className="bg-[#0B577A] rounded-t-xl px-5 py-4 space-y-3">
                                    <div className="flex items-center gap-1.5">
                                        <BadgeSelect
                                            value={contactInfo.type}
                                            options={(options?.lead_types || []).map((t) => ({ value: t, label: capitalize(t) }))}
                                            onChange={(v) => handleContactUpdate({ type: v })}
                                            style={{ backgroundColor: (typeColors[contactInfo.type] || { bg: '#5F656D' }).bg, color: 'white' }}
                                        />
                                        <BadgeSelect
                                            value={contactInfo.status}
                                            options={(options?.statuses || []).map((s) => ({ value: s, label: capitalize(s) }))}
                                            onChange={(v) => handleContactUpdate({ status: v })}
                                            className="bg-white/15 text-white"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <Avatar id={contactInfo.id} name={contactInfo.name} size="xl" />
                                            {contactInfo.lead_score !== null && contactInfo.lead_score !== undefined && (
                                                <span
                                                    className="absolute -bottom-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-[10px] font-bold rounded-full text-white ring-2 ring-white"
                                                    style={{ backgroundColor: contactInfo.lead_score >= 60 ? '#059669' : contactInfo.lead_score >= 30 ? '#D97706' : '#DC2626' }}
                                                >
                                                    {contactInfo.lead_score}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h1 className="text-base font-semibold text-white leading-tight truncate">{contactInfo.name}</h1>
                                            <p className="text-xs text-white/80 mt-0.5">
                                                {contactInfo.last_contacted_at
                                                    ? `Active ${new Date(contactInfo.last_contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                    : `Added ${new Date(contactInfo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Body — sections divided by border-t */}
                                <div>
                                    {/* Contact Info */}
                                    <div className="px-5 py-4 space-y-3 border-t border-[#E4E7EB]">
                                        <p className="text-[13px] font-semibold text-[#111315]">Contact Info</p>
                                        {contactInfo.email && (
                                            <div className="flex items-center gap-2.5">
                                                <span className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-[#1693C9]">
                                                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
                                                </span>
                                                <a href={`mailto:${contactInfo.email}`} className="text-[13px] text-[#1693C9] hover:underline break-all min-w-0">{contactInfo.email}</a>
                                            </div>
                                        )}
                                        {contactInfo.phone && (
                                            <div className="flex items-center gap-2.5">
                                                <span className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-[#059669]">
                                                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                                                </span>
                                                <a href={`tel:${contactInfo.phone}`} className="text-[13px] text-[#111315]">{contactInfo.phone}</a>
                                            </div>
                                        )}
                                        {contactInfo.mobile && contactInfo.mobile !== contactInfo.phone && (
                                            <div className="flex items-center gap-2.5">
                                                <span className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-[#0891B2]">
                                                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                                                </span>
                                                <a href={`tel:${contactInfo.mobile}`} className="text-[13px] text-[#111315]">{contactInfo.mobile}</a>
                                            </div>
                                        )}
                                        {(contactInfo.address || contactInfo.city || contactInfo.state_province) && (
                                            <div className="flex items-center gap-2.5">
                                                <span className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-[#D97706]">
                                                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                                                </span>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([contactInfo.address, contactInfo.city, contactInfo.state_province].filter(Boolean).join(', '))}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[13px] text-[#5F656D] hover:text-[#111315] transition-colors min-w-0 truncate"
                                                >
                                                    {[contactInfo.address, contactInfo.city, contactInfo.state_province].filter(Boolean).join(', ')}
                                                </a>
                                            </div>
                                        )}

                                        {/* Quick actions: Call + Open Profile */}
                                        <div className="flex items-center gap-2 pt-1">
                                            {hasPhoneNumber && (contactInfo.phone || contactInfo.mobile) && (
                                                <button
                                                    type="button"
                                                    onClick={() => window.__openDialer?.(contactInfo.phone || contactInfo.mobile || undefined, contactInfo.id, contactInfo.name)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                                    </svg>
                                                    Call
                                                </button>
                                            )}
                                            <Link
                                                href={route('crm.contacts.show', contactInfo.uuid)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] bg-white border border-[#E4E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                                            >
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                                Profile
                                            </Link>
                                        </div>
                                    </div>

                                    {/* SMS Consent — only surface confirmed states (opted in/out); skip the noisy "not confirmed" default */}
                                    {(contactInfo.phone || contactInfo.mobile) && (contactInfo.sms_opted_out || contactInfo.sms_consent) && (
                                        <div className="px-5 py-4 border-t border-[#E4E7EB]">
                                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                                contactInfo.sms_opted_out ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#ECFDF5] border-[#A7F3D0]'
                                            }`}>
                                                <svg className={`h-3.5 w-3.5 shrink-0 ${contactInfo.sms_opted_out ? 'text-[#DC2626]' : 'text-[#059669]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                    {contactInfo.sms_opted_out ? (
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                                                    ) : (
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                    )}
                                                </svg>
                                                <span className={`text-[11px] font-medium ${contactInfo.sms_opted_out ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                                                    SMS {contactInfo.sms_opted_out ? 'opted out' : 'opted in'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tags */}
                                    {options && options.all_tags.length > 0 && (
                                        <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                            <p className="text-[13px] font-semibold text-[#111315]">Tags</p>
                                            <TagPicker
                                                tags={contactInfo.tags}
                                                allTags={options.all_tags}
                                                onChange={(ids) => handleContactUpdate({ tag_ids: ids })}
                                            />
                                        </div>
                                    )}

                                    {/* Custom Fields */}
                                    {options && options.custom_field_defs.filter((f) => !f.lead_types || f.lead_types.length === 0 || f.lead_types.includes(contactInfo.type)).length > 0 && (
                                        <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2.5">
                                            <p className="text-[13px] font-semibold text-[#111315]">Custom Fields</p>
                                            <div className="space-y-2">
                                                {options.custom_field_defs
                                                    .filter((f) => !f.lead_types || f.lead_types.length === 0 || f.lead_types.includes(contactInfo.type))
                                                    .map((field) => (
                                                        <CustomFieldInput
                                                            key={field.key}
                                                            field={field}
                                                            value={contactInfo.custom_fields?.[field.key] || ''}
                                                            onSave={(v) => handleContactUpdate({ custom_fields: { ...contactInfo.custom_fields, [field.key]: v } })}
                                                        />
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Deals */}
                                    {contactInfo.deals.length > 0 && (
                                        <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                            <p className="text-[13px] font-semibold text-[#111315]">Deals</p>
                                            <div className="space-y-0.5 -mx-2">
                                                {contactInfo.deals.map((deal) => (
                                                    <Link key={deal.id} href={route('crm.deals.show', deal.id)} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-[#F9FAFB] transition-colors group">
                                                        <span className="text-[13px] text-[#111315] group-hover:text-[#1693C9] truncate">{deal.title}</span>
                                                        {deal.value > 0 && <span className="text-[11px] font-medium text-[#059669] shrink-0">${deal.value.toLocaleString()}</span>}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Assigned */}
                                    {contactInfo.assigned_users.length > 0 && (
                                        <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                            <p className="text-[13px] font-semibold text-[#111315]">Assigned To</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {contactInfo.assigned_users.map((u) => (
                                                    <div key={u.id} className="flex items-center gap-1.5 bg-[#F3F4F6] rounded-full px-2 py-1">
                                                        <span className="shrink-0 h-4 w-4 flex items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: getAvatarColor(u.id) }}>
                                                            {u.name.charAt(0).toUpperCase()}
                                                        </span>
                                                        <span className="text-[11px] text-[#5F656D]">{u.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tasks — open only; completed tasks live on the contact show page */}
                                    {(() => {
                                        const open = (contactInfo.tasks || []).filter((t) => !t.is_completed);
                                        return (
                                            <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[13px] font-semibold text-[#111315]">Tasks{open.length > 0 ? ` (${open.length})` : ''}</p>
                                                    <Link href={route('crm.contacts.show', contactInfo.uuid)} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors">+ Add</Link>
                                                </div>
                                                {open.length === 0 ? (
                                                    <p className="text-[11px] text-[#C4C9D1]">No open tasks</p>
                                                ) : (
                                                    <ul className="space-y-1 -mx-2">{open.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Appointments — upcoming only; past meetings live on the contact show page */}
                                    {(() => {
                                        const upcoming = (contactInfo.meetings || []).filter(
                                            (m) => !m.is_completed && m.starts_at && new Date(m.starts_at) >= new Date()
                                        );
                                        return (
                                            <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[13px] font-semibold text-[#111315]">Appointments{upcoming.length > 0 ? ` (${upcoming.length})` : ''}</p>
                                                    <Link href={route('crm.contacts.show', contactInfo.uuid)} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors">+ Add</Link>
                                                </div>
                                                {upcoming.length === 0 ? (
                                                    <p className="text-[11px] text-[#C4C9D1]">No upcoming appointments</p>
                                                ) : (
                                                    <ul className="space-y-1.5 -mx-2">{upcoming.map((m) => <MeetingRow key={m.id} meeting={m} />)}</ul>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Do Not Disturb */}
                                    <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                        <p className="text-[13px] font-semibold text-[#111315]">Do Not Disturb</p>
                                        {([
                                            { value: 'none' as const, label: 'All channels active', desc: 'No DND restrictions' },
                                            { value: 'sms' as const, label: 'Pause SMS only', desc: "Don't text — calls/email OK" },
                                            { value: 'calls' as const, label: 'Pause calls only', desc: "Don't call — texts/email OK" },
                                            { value: 'all' as const, label: 'Pause everything', desc: 'No calls, texts, or emails' },
                                        ]).map((opt) => {
                                            const active = contactInfo.dnd_mode === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => handleDndChange(opt.value)}
                                                    className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                                                        active ? 'border-[#1693C9] bg-[#EBF5FF]' : 'border-[#E4E7EB] bg-white hover:bg-[#F9FAFB]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                                            active ? 'border-[#1693C9]' : 'border-[#D1D5DB]'
                                                        }`}>
                                                            {active && <span className="h-1.5 w-1.5 rounded-full bg-[#1693C9]" />}
                                                        </span>
                                                        <span className={`text-xs font-medium ${active ? 'text-[#1693C9]' : 'text-[#111315]'}`}>{opt.label}</span>
                                                    </div>
                                                    <p className="text-[10px] text-[#5F656D] mt-1 ml-5">{opt.desc}</p>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Activity */}
                                    <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                                        <p className="text-[13px] font-semibold text-[#111315]">Activity</p>
                                        {contactInfo.last_contacted_at && (
                                            <div className="flex justify-between">
                                                <span className="text-xs text-[#5F656D]">Last Contact</span>
                                                <span className="text-[13px] text-[#111315]">{new Date(contactInfo.last_contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-xs text-[#5F656D]">Added</span>
                                            <span className="text-[13px] text-[#111315]">{new Date(contactInfo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-[#5F656D]">Messages</span>
                                            <span className="text-[13px] text-[#111315]">{messages.length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CrmLayout>
    );
}

/* ---------- Right-pane editors ---------- */

function BadgeSelect({ value, options, onChange, style, className }: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    style?: React.CSSProperties;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const currentLabel = options.find((o) => o.value === value)?.label || capitalize(value);

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-semibold rounded-full hover:opacity-90 transition-opacity ${className || ''}`}
                style={style}
            >
                {currentLabel}
                <svg className="h-2.5 w-2.5 opacity-70" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            {open && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-30 min-w-[140px] bg-white border border-[#E4E7EB] rounded-lg shadow-lg overflow-hidden">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#F3F4F6] transition-colors ${
                                opt.value === value ? 'font-semibold text-[#1693C9] bg-[#EBF5FF]' : 'text-[#5F656D]'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function CustomFieldInput({ field, value, onSave }: {
    field: { key: string; label: string; type: string };
    value: string;
    onSave: (v: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    useEffect(() => { setDraft(value); }, [value]);

    function save() {
        setEditing(false);
        if (draft !== value) onSave(draft);
    }

    if (editing) {
        return (
            <div>
                <label className="block text-[10px] text-[#5F656D] mb-1">{field.label}</label>
                <input
                    autoFocus
                    type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={save}
                    onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
                    className="w-full h-7 px-2 text-xs border border-[#1693C9] bg-white text-[#111315] rounded-md focus:outline-none"
                />
            </div>
        );
    }

    return (
        <div className="flex justify-between items-center group cursor-pointer" onClick={() => setEditing(true)}>
            <span className="text-xs text-[#5F656D]">{field.label}</span>
            <span className="text-[11px] text-[#111315] text-right truncate max-w-[60%] group-hover:text-[#1693C9] transition-colors">
                {value || '—'}
            </span>
        </div>
    );
}

/* ---------- Right-pane row renderers ---------- */

function TaskRow({ task }: { task: InboxTask }) {
    const priorityColor = task.priority === 'urgent' ? '#DC2626' : task.priority === 'high' ? '#D97706' : task.priority === 'low' ? '#8B9096' : '#5F656D';
    return (
        <li className="flex items-start gap-2 p-2 rounded-md hover:bg-[#F9FAFB] transition-colors">
            <span className="mt-1 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor }} />
            <div className="flex-1 min-w-0">
                <p className={`text-xs leading-snug ${task.is_completed ? 'line-through text-[#8B9096]' : 'text-[#111315]'}`}>{task.title}</p>
                {task.due_date && (
                    <p className="text-[10px] text-[#8B9096] mt-0.5">
                        Due {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                )}
            </div>
        </li>
    );
}

function MeetingRow({ meeting }: { meeting: InboxMeeting }) {
    const when = meeting.starts_at
        ? new Date(meeting.starts_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : null;
    return (
        <li className="p-2 rounded-md hover:bg-[#F9FAFB] transition-colors">
            <p className="text-xs font-medium text-[#111315] truncate">{meeting.title}</p>
            {when && <p className="text-[10px] text-[#8B9096] mt-0.5">{when}</p>}
            {meeting.location && <p className="text-[10px] text-[#5F656D] mt-0.5 truncate">{meeting.location}</p>}
        </li>
    );
}

