import CrmLayout from '@/Layouts/CrmLayout';
import TimelineFeed from '@/Components/Crm/TimelineFeed';
import NotesList from '@/Components/Crm/NotesList';
import CallLogForm from '@/Components/Crm/CallLogForm';
import EmailLogForm from '@/Components/Crm/EmailLogForm';
import MessageComposer from '@/Components/Crm/MessageComposer';
import SmsLogForm from '@/Components/Crm/SmsLogForm';
import AddFamilyMemberModal from '@/Components/Crm/AddFamilyMemberModal';
import AiSummaryModal from '@/Components/Crm/AiSummaryModal';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import Avatar from '@/Components/Crm/Avatar';
import LeftCard from '@/Components/Crm/Contact/LeftCard';
import LazyEmailCompose from '@/Components/Crm/Contact/LazyEmailCompose';
import RightSidebar from '@/Components/Crm/Contact/RightSidebar';
import AiAssistant, { Draft } from '@/Components/Crm/Contact/AiAssistant';
import PropertiesTab from '@/Components/Crm/Contact/PropertiesTab';
import TasksApptsTab from '@/Components/Crm/Contact/TasksApptsTab';
import FilesTab from '@/Components/Crm/Contact/FilesTab';
import DealsTab from '@/Components/Crm/Contact/DealsTab';
import SearchesTab from '@/Components/Crm/Contact/SearchesTab';
import OffersTab from '@/Components/Crm/Contact/OffersTab';
import InquiriesTab from '@/Components/Crm/Contact/InquiriesTab';
import ActionPlansTab from '@/Components/Crm/Contact/ActionPlansTab';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { PageProps } from '@/types';

interface Contact {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    type: string;
    source: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    postal_code: string | null;
    country: string;
    description: string | null;
    lead_score: number | null;
    ai_summary: string | null;
    ai_summary_at: string | null;
    ai_next_action: string | null;
    ai_next_action_at: string | null;
    date_of_birth: string | null;
    last_contacted_at: string | null;
    created_at: string;
    company?: { id: number; name: string } | null;
    tags: { id: number; name: string; color: string }[];
    deals: any[];
    notes: any[];
    tasks: any[];
    call_logs: any[];
    email_logs: any[];
    sms_logs: any[];
    meetings: any[];
    timeline_events: any[];
    status: string;
    custom_fields: Record<string, string> | null;
    assigned_users?: { id: number; name: string; email: string }[];
    relatives?: {
        id: number;
        uuid: string;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        pivot: { id: number; type: string; custom_label: string | null };
    }[];
    sms_consent: boolean;
    sms_opted_out: boolean;
}

interface Pager {
    position: number;
    total: number;
    prev: { uuid: string; first_name: string; last_name: string } | null;
    next: { uuid: string; first_name: string; last_name: string } | null;
}

type TabKey = 'summary' | 'properties' | 'deals' | 'searches' | 'offers' | 'inquiries' | 'action-plans' | 'files' | 'tasks-appts';

interface Props {
    contact: Contact;
    contactStatuses?: string[];
    leadTypes?: string[];
    customFields?: { key: string; label: string; type: string }[];
    allContacts?: { id: number; first_name: string; last_name: string }[];
    allDeals?: { id: number; title: string }[];
    aiEnabled?: boolean;
    teamMembers?: { id: number; name: string; email: string }[];
    allTags?: { id: number; name: string; color: string }[];
    relationshipTypes?: Record<string, string>;
    pager?: Pager;
    initialTab?: TabKey;
    actionPlans?: { id: number; name: string }[];
    idxConnections?: { id: number; provider: string; mls_slug: string; display_name: string; agent_id: string | null; office_id: string | null }[];
    userListings?: any[];
    pipelines?: any[];
    dealTypes?: string[];
}

const sourceLabels: Record<string, string> = {
    manual: 'Manual', website: 'Website', referral: 'Referral', open_house: 'Open House',
    social_media: 'Social Media', cold_call: 'Cold Call', idx: 'IDX', other: 'Other',
};

const typeColors: Record<string, { bg: string; text: string }> = {
    buyer: { bg: '#1693C9', text: '#FFFFFF' },
    seller: { bg: '#D97706', text: '#FFFFFF' },
    prospect: { bg: '#4F46E5', text: '#FFFFFF' },
    past_client: { bg: '#5F656D', text: '#FFFFFF' },
    referral: { bg: '#0891B2', text: '#FFFFFF' },
};
const defaultTypeColor = { bg: '#5F656D', text: '#FFFFFF' };


function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(d: string | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const statusColors: Record<string, { bg: string; text: string }> = {
    new_lead: { bg: '#1693C9', text: '#FFFFFF' },
    active: { bg: '#059669', text: '#FFFFFF' },
    client: { bg: '#4F46E5', text: '#FFFFFF' },
    past_client: { bg: '#5F656D', text: '#FFFFFF' },
    inactive: { bg: '#8B9096', text: '#FFFFFF' },
};
const defaultStatusColor = { bg: '#5F656D', text: '#FFFFFF' };

function AddStatusInline({ existing, onAdded }: { existing: string[]; onAdded: (slug: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) setTimeout(() => inputRef.current?.focus(), 0);
    }, [editing]);

    function submit() {
        const slug = value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!slug) { setError('Please enter a name.'); return; }
        if (existing.includes(slug)) { setError('Status already exists.'); return; }
        setSaving(true);
        setError(null);
        router.post(route('crm.contacts.statuses.store'), { status: slug }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => { setValue(''); setEditing(false); onAdded(slug); },
            onError: (errs) => setError(errs.status || 'Could not add status.'),
            onFinish: () => setSaving(false),
        });
    }

    if (!editing) {
        return (
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#1693C9] hover:bg-[#F9FAFB] border-t border-[#F3F4F6] transition-colors"
            >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add status
            </button>
        );
    }

    return (
        <div className="px-3 py-2.5 border-t border-[#F3F4F6] bg-[#F9FAFB]">
            <label className="flex items-center gap-1 text-[13px] font-normal text-[#5F656D] leading-[18px] mb-1">
                <span>New status</span>
            </label>
            <div className="flex items-center gap-1.5">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submit(); }
                        if (e.key === 'Escape') { setEditing(false); setValue(''); setError(null); }
                    }}
                    placeholder="e.g. nurturing"
                    className="block flex-1 px-2 py-[5px] text-[13px] leading-[1.42857143] border border-[#C8CCD1] rounded text-[#111315] bg-white placeholder-[#C4C9D1] focus:outline-none focus:border-[#1693C9] focus:ring-0"
                />
                <button
                    type="button"
                    onClick={submit}
                    disabled={!value.trim() || saving}
                    className="h-7 px-2.5 text-[11px] font-semibold text-white bg-[#1693C9] rounded hover:bg-[#1380AF] disabled:opacity-40 transition-colors"
                >
                    {saving ? '…' : 'Add'}
                </button>
                <button
                    type="button"
                    onClick={() => { setEditing(false); setValue(''); setError(null); }}
                    className="h-7 px-2 text-[11px] font-medium text-[#5F656D] hover:text-[#111315] transition-colors"
                >
                    Cancel
                </button>
            </div>
            {error && <p className="mt-1 text-[11px] text-[#DC2626]">{error}</p>}
        </div>
    );
}


export default function ContactShow({ contact, contactStatuses = [], leadTypes = [], aiEnabled = false, teamMembers = [], allTags = [], customFields = [], relationshipTypes = {}, pager, initialTab = 'summary', actionPlans = [], idxConnections = [], userListings = [], pipelines = [], dealTypes = [] }: Props) {
    const { auth, hasPhoneNumber, hasEmailAccount } = usePage<PageProps>().props;
    const [actionTab, setActionTab] = useState<'note' | 'email' | 'text' | 'call'>('note');
    const [emailComposeOpen, setEmailComposeOpen] = useState(false);
    const [mobileSection, setMobileSection] = useState<'info' | 'timeline' | 'sidebar'>('timeline');
    const [showAiSummary, setShowAiSummary] = useState(false);
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [showPhoneSetup, setShowPhoneSetup] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

    function switchTab(next: TabKey) {
        setActiveTab(next);
        const url = next === 'summary'
            ? route('crm.contacts.show', contact.uuid)
            : route('crm.contacts.tab', [contact.uuid, next]);
        if (typeof window !== 'undefined' && window.location.pathname !== new URL(url).pathname) {
            window.history.replaceState({}, '', url);
        }
    }
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!statusDropdownOpen) return;
        function onDoc(e: MouseEvent) {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
                setStatusDropdownOpen(false);
            }
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setStatusDropdownOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [statusDropdownOpen]);

    function createDealForContact() {
        router.get(route('crm.deals.index'), {
            create_deal: 1,
            contact_id: contact.id,
            contact_name: `${contact.first_name} ${contact.last_name}`.trim(),
        });
    }

    function comingSoon(feature: string) {
        alert(`${feature} is coming soon.`);
    }

    const [suggestions, setSuggestions] = useState<Array<{ type: string; priority: string; message: string; icon: string }>>([]);
    const [draftData, setDraftData] = useState<Record<string, any> | null>(null);
    const tc = typeColors[contact.type] || defaultTypeColor;

    useEffect(() => {
        if (!aiEnabled) return;
        fetch(`/crm/contacts/${contact.uuid}/ai/suggestions`, {
            headers: { 'Accept': 'application/json' },
        })
            .then(r => r.json())
            .then(data => { if (data.suggestions) setSuggestions(data.suggestions); })
            .catch(() => {});
    }, [contact.uuid, aiEnabled]);

    function handleStatusChange(newStatus: string) {
        router.patch(route('crm.contacts.update', contact.uuid), {
            first_name: contact.first_name,
            last_name: contact.last_name,
            type: contact.type,
            source: contact.source,
            status: newStatus,
        }, { preserveScroll: true });
    }

    const daysAgo = (dateStr: string | null) => {
        if (!dateStr) return null;
        const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
        if (diff === 0) return 'Today';
        if (diff === 1) return '1 day ago';
        return `${diff} days ago`;
    };
    const lastActivity = daysAgo(contact.last_contacted_at);

    // Per-field inline save — sends a partial PATCH, server merges with existing values.
    function patchContact(partial: Record<string, unknown>) {
        router.patch(route('crm.contacts.update', contact.uuid), {
            first_name: contact.first_name,
            last_name: contact.last_name,
            type: contact.type,
            source: contact.source,
            status: contact.status || '',
            ...partial,
        } as any, { preserveScroll: true });
    }


    return (
        <CrmLayout>
            <Head title={`${contact.first_name} ${contact.last_name}`} />

            <div className="flex flex-col min-h-[calc(100vh-56px)] bg-[#F2F3F7]">

            {/* Top Header Bar: Status dropdown + Quick actions */}
            <div className="shrink-0 bg-white border-b border-[#E4E7EB] px-3 sm:px-6 py-2.5 flex items-center gap-3">
                {/* Status Dropdown */}
                {contactStatuses.length > 0 && (() => {
                    const currentSc = statusColors[contact.status] || defaultStatusColor;
                    return (
                        <div className="relative" ref={statusDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setStatusDropdownOpen((o) => !o)}
                                aria-haspopup="menu"
                                aria-expanded={statusDropdownOpen}
                                className="inline-flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-[4px] border border-[#E4E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
                            >
                                <span
                                    className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-[4px] text-white"
                                    style={{ backgroundColor: currentSc.bg, color: currentSc.text }}
                                >
                                    {capitalize(contact.status || 'No Status')}
                                </span>
                                <svg className={`h-3.5 w-3.5 text-[#8B9096] transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                            {statusDropdownOpen && (
                                <div role="menu" className="absolute left-0 top-full mt-1.5 z-30 w-64 bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden">
                                    <div className="px-3 pt-3 pb-1.5">
                                        <label className="flex items-center gap-1 text-[13px] font-normal text-[#5F656D] leading-[18px]">
                                            <span>Change status</span>
                                        </label>
                                    </div>
                                    <ul className="px-1 pb-1">
                                        {contactStatuses.map((status) => {
                                            const isCurrent = contact.status === status;
                                            const sc = statusColors[status] || defaultStatusColor;
                                            return (
                                                <li key={status}>
                                                    <button
                                                        type="button"
                                                        onClick={() => { if (!isCurrent) handleStatusChange(status); setStatusDropdownOpen(false); }}
                                                        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-[13px] text-left transition-colors ${
                                                            isCurrent ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-2 min-w-0">
                                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sc.bg }} />
                                                            <span className="text-[#111315] truncate">{capitalize(status)}</span>
                                                        </span>
                                                        {isCurrent && (
                                                            <svg className="h-3.5 w-3.5 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <AddStatusInline existing={contactStatuses} onAdded={(slug) => { handleStatusChange(slug); setStatusDropdownOpen(false); }} />
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* Quick actions + contact navigator — right side */}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                    {pager && pager.total > 1 && (
                        <div className="flex items-center gap-1 h-8 px-1 rounded-[4px] border border-[#E4E7EB] bg-white">
                            {pager.prev ? (
                                <Link
                                    href={route('crm.contacts.show', pager.prev.uuid)}
                                    title={`${pager.prev.first_name} ${pager.prev.last_name}`}
                                    preserveScroll={false}
                                    className="h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                                </Link>
                            ) : (
                                <span className="h-6 w-6 inline-flex items-center justify-center text-[#D1D5DB]">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                                </span>
                            )}
                            <span className="text-[11px] text-[#5F656D] tabular-nums px-1 whitespace-nowrap">
                                <span className="font-semibold text-[#111315]">{pager.position}</span>
                                <span className="mx-1 text-[#8B9096]">of</span>
                                <span className="text-[#111315]">{pager.total}</span>
                            </span>
                            {pager.next ? (
                                <Link
                                    href={route('crm.contacts.show', pager.next.uuid)}
                                    title={`${pager.next.first_name} ${pager.next.last_name}`}
                                    preserveScroll={false}
                                    className="h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                                </Link>
                            ) : (
                                <span className="h-6 w-6 inline-flex items-center justify-center text-[#D1D5DB]">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                                </span>
                            )}
                        </div>
                    )}
                    <button
                        onClick={() => {
                            const target = contact.phone || contact.mobile;
                            if (!hasPhoneNumber) {
                                setShowPhoneSetup(true);
                                return;
                            }
                            if (!target) {
                                alert('No phone number on file for this contact.');
                                return;
                            }
                            window.__openDialer?.(target, contact.id, `${contact.first_name} ${contact.last_name}`);
                        }}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                        title={hasPhoneNumber ? (contact.phone || contact.mobile || 'No phone number on file') : 'Set up a phone number first'}
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                        <span className="hidden sm:inline">Call</span>
                    </button>
                </div>
            </div>

            {/* Main Tab Navigation */}
            <div className="shrink-0 px-3 sm:px-6 pt-3 lg:pt-4 overflow-x-auto">
                <div className="flex items-end gap-1 min-w-max">
                    {(() => {
                        const propertiesCount = (contact as any).listings?.length ?? 0;
                        const dealsCount = contact.deals?.length ?? 0;
                        const filesCount = (contact as any).files?.length ?? 0;
                        const tasksAndApptsCount = (contact.tasks?.filter((t: any) => !t.is_completed).length ?? 0)
                            + (contact.meetings?.filter((m: any) => !m.is_completed && new Date(m.starts_at) >= new Date()).length ?? 0);
                        const searchesCount = (contact as any).searches?.length ?? 0;
                        const offersCount = (contact as any).offers?.length ?? 0;
                        const inquiriesCount = (contact as any).inquiries?.length ?? 0;
                        const tabs: { key: TabKey; label: string; count?: number }[] = [
                            { key: 'summary', label: 'Summary' },
                            { key: 'properties', label: 'Properties', count: propertiesCount },
                            { key: 'deals', label: 'Deals', count: dealsCount },
                            { key: 'searches', label: 'Searches', count: searchesCount },
                            { key: 'offers', label: 'Offers', count: offersCount },
                            { key: 'inquiries', label: 'Inquiries', count: inquiriesCount },
                            { key: 'action-plans', label: 'Action Plans' },
                            { key: 'tasks-appts', label: 'Tasks & Appts', count: tasksAndApptsCount },
                            { key: 'files', label: 'Files', count: filesCount },
                        ];
                        return tabs.map((tab) => {
                            const isActive = activeTab === tab.key;
                            const showCount = typeof tab.count === 'number' && tab.count > 0;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => switchTab(tab.key)}
                                    className={`inline-flex items-center gap-1.5 text-[15px] font-medium transition-colors whitespace-nowrap rounded-t-[4px] ${
                                        isActive
                                            ? 'bg-white text-[#111315] border-t border-l border-r border-[#E4E7EB] relative z-10 translate-y-px'
                                            : 'bg-[#F2F3F7] text-[#5F656D] hover:bg-[#FAFBFC] hover:text-[#111315] border-t border-l border-r border-[#E4E7EB]'
                                    }`}
                                    style={{ padding: '12px 18px' }}
                                >
                                    {tab.label}
                                    {showCount && (
                                        <span
                                            className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-semibold rounded-full ${
                                                isActive ? 'bg-[#1693C9] text-white' : 'bg-[#E4E7EB] text-[#5F656D]'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Mobile section tabs */}
            <div className="flex border-b border-[#E4E7EB] bg-white lg:hidden shrink-0">
                {([
                    { key: 'info' as const, label: 'Contact' },
                    { key: 'timeline' as const, label: 'Timeline' },
                    { key: 'sidebar' as const, label: 'More' },
                ]).map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setMobileSection(tab.key)}
                        className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${
                            mobileSection === tab.key
                                ? 'text-[#111315] border-b-2 border-[#111315] -mb-px'
                                : 'text-[#8B9096] hover:text-[#5F656D]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content Container — full-width white surface matching the active tab */}
            <div className="flex-1">
                <div className="rounded-t-[4px] bg-white border-t border-[#E4E7EB]">
                {activeTab === 'properties' ? (
                    <PropertiesTab contact={contact as any} idxConnections={idxConnections} userListings={userListings} />
                ) : activeTab === 'deals' ? (
                    <DealsTab contact={contact} pipelines={pipelines} dealTypes={dealTypes} userListings={userListings} idxConnections={idxConnections} />
                ) : activeTab === 'searches' ? (
                    <SearchesTab contact={contact as any} />
                ) : activeTab === 'offers' ? (
                    <OffersTab contact={contact as any} idxConnections={idxConnections} />
                ) : activeTab === 'inquiries' ? (
                    <InquiriesTab contact={contact as any} idxConnections={idxConnections} />
                ) : activeTab === 'action-plans' ? (
                    <ActionPlansTab contact={contact as any} actionPlans={actionPlans ?? []} />
                ) : activeTab === 'tasks-appts' ? (
                    <TasksApptsTab contact={contact} />
                ) : activeTab === 'files' ? (
                    <FilesTab contact={contact as any} />
                ) : activeTab === 'summary' ? (
                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-3 lg:gap-4 p-3 sm:p-4 lg:p-6 pb-20">

                <LeftCard
                    contact={contact}
                    hasPhoneNumber={hasPhoneNumber}
                    customFields={customFields}
                    allTags={allTags}
                    relationshipTypes={relationshipTypes}
                    lastActivity={lastActivity}
                    suggestions={suggestions as any}
                    mobileSection={mobileSection}
                    patchContact={patchContact}
                    onAddFamilyMember={() => setShowFamilyModal(true)}
                    onOpenAiSummary={() => setShowAiSummary(true)}
                    onCreateCma={() => comingSoon('CMA')}
                    onCreateDeal={createDealForContact}
                    onCreateListingPresentation={() => comingSoon('Listing Presentation')}
                />

                {/* MIDDLE 50% — Action Box + Timeline */}
                <div className={`min-w-0 flex flex-col gap-4 lg:gap-5 ${mobileSection !== 'timeline' ? 'hidden lg:flex' : ''}`}>
                    {/* Action Box */}
                    <div className="bg-[#F3F4F6] border border-[#E4E7EB] rounded-[4px] shrink-0">
                        {/* Tabs */}
                        <div className="p-2 pb-0">
                            <div className="flex items-center gap-0.5 bg-white rounded-[4px] p-1 border border-[#E4E7EB]">
                                {([
                                    { key: 'note' as const, label: 'Note', labelLg: 'Note', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z' },
                                    { key: 'email' as const, label: 'Email', labelLg: 'Email', icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75' },
                                    { key: 'text' as const, label: 'Text', labelLg: 'Text', icon: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z' },
                                    { key: 'call' as const, label: 'Call', labelLg: 'Call', icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z' },
                                ]).map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActionTab(tab.key)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-[4px] transition-all ${
                                            actionTab === tab.key
                                                ? 'bg-[#1693C9] text-white shadow-sm'
                                                : 'text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6]'
                                        }`}
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} /></svg>
                                        <span>{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab content */}
                        <div className="py-3 px-2">
                            {actionTab === 'note' && (
                                <NotesList notes={[]} notableType="contact" notableId={contact.id} inputOnly initialData={draftData && draftData.body !== undefined ? draftData as { body?: string } : undefined} />
                            )}
                            {actionTab === 'email' && (
                                <MessageComposer
                                    channel="email"
                                    contactId={contact.id}
                                    contactUuid={contact.uuid}
                                    contactEmail={contact.email}
                                    contactPhone={contact.phone || contact.mobile}
                                    onSent={() => { setActionTab('note'); setDraftData(null); router.reload({ only: ['contact'] }); }}
                                />
                            )}
                            {actionTab === 'text' && (
                                <MessageComposer
                                    channel="sms"
                                    contactId={contact.id}
                                    contactUuid={contact.uuid}
                                    contactEmail={contact.email}
                                    contactPhone={contact.phone || contact.mobile}
                                    onSent={() => { setActionTab('note'); setDraftData(null); router.reload({ only: ['contact'] }); }}
                                />
                            )}
                            {actionTab === 'call' && (
                                <CallLogForm contactId={contact.id} contactPhone={contact.phone || contact.mobile || undefined} onClose={() => { setActionTab('note'); setDraftData(null); }} inline initialData={draftData && draftData.notes !== undefined ? draftData as { notes?: string } : undefined} />
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1">
                        <div>
                            <TimelineFeed events={contact.timeline_events || []} />
                            {(contact.timeline_events || []).length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <svg className="h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                    <p className="mt-3 text-sm text-[#8B9096]">No activity yet</p>
                                    <p className="text-xs text-[#C4C9D1]">Log a call, email, or note to get started</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <RightSidebar contact={contact} teamMembers={teamMembers} patchContact={patchContact} mobileSection={mobileSection} />
            </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="h-12 w-12 flex items-center justify-center rounded-full bg-[#F3F4F6] mb-3">
                            <svg className="h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <p className="text-[17px] font-semibold text-[#111315] mb-1">{(activeTab as string).charAt(0).toUpperCase() + (activeTab as string).slice(1)}</p>
                        <p className="text-[13px] text-[#5F656D]">Coming soon</p>
                    </div>
                )}
                </div>
            </div>
            </div>

            <AiAssistant
                contact={contact}
                userEmail={auth.user.email}
                onApplyDraft={(draft: Draft) => {
                    if (draft.type === 'email') {
                        setDraftData({ subject: draft.subject || '', body_preview: draft.body, cc: draft.cc || '', bcc: draft.bcc || '' });
                        setActionTab('email');
                    } else if (draft.type === 'sms') {
                        setDraftData({ body: draft.body });
                        setActionTab('text');
                    } else if (draft.type === 'note') {
                        setDraftData({ body: draft.body });
                        setActionTab('note');
                    } else if (draft.type === 'call_notes') {
                        setDraftData({ notes: draft.body });
                        setActionTab('call');
                    }
                }}
                onStatusChange={handleStatusChange}
            />

            {emailComposeOpen && hasEmailAccount && (
                <LazyEmailCompose
                    contactId={contact.id}
                    prefillTo={contact.email || undefined}
                    onClose={() => setEmailComposeOpen(false)}
                />
            )}

            {showAiSummary && (
                <AiSummaryModal
                    contactUuid={contact.uuid}
                    existingSummary={contact.ai_summary}
                    existingSummaryAt={contact.ai_summary_at}
                    onClose={() => setShowAiSummary(false)}
                />
            )}

            <AddFamilyMemberModal
                isOpen={showFamilyModal}
                onClose={() => setShowFamilyModal(false)}
                contactUuid={contact.uuid}
                relationshipTypes={relationshipTypes}
            />

            {showPhoneSetup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowPhoneSetup(false)} />
                    <div className="relative bg-white border border-[#E4E7EB] shadow-xl w-full max-w-md rounded-[4px] overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EB]">
                            <h2 className="text-sm font-semibold text-[#111315]">Set up calling</h2>
                            <button onClick={() => setShowPhoneSetup(false)} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="px-5 py-5 space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-full bg-[#EBF5FF] text-[#1693C9]">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] text-[#111315] font-medium">You don't have a phone number yet</p>
                                    <p className="text-xs text-[#5F656D] mt-1 leading-relaxed">
                                        Calls go out through our Telnyx integration. Pick a local number so contacts see a real caller ID, then call straight from this page.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E4E7EB] bg-[#F9FAFB]">
                            <button
                                onClick={() => setShowPhoneSetup(false)}
                                className="h-9 px-4 text-xs font-medium text-[#5F656D] border border-[#C8CCD1] bg-white hover:bg-[#F3F4F6] rounded-[4px] transition-colors"
                            >
                                Not now
                            </button>
                            <PrimaryButton
                                href={route('crm.settings.tab', 'phone')}
                                icon={null}
                                labelClassName=""
                                label={
                                    <>
                                        Buy a number
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                                    </>
                                }
                            />
                        </div>
                    </div>
                </div>
            )}
        </CrmLayout>
    );
}

