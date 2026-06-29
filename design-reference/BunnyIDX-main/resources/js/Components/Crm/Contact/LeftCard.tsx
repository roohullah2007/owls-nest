import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import Avatar from '@/Components/Crm/Avatar';
import ClickToCall from '@/Components/Crm/ClickToCall';
import { ContactRow, InlineEdit, SectionLabel } from './InlineEdit';
import TagPicker from './TagPicker';
import { Contact, CustomField, FollowUpSuggestion, Tag, sourceLabels } from './types';

function humanize(s: string) {
    if (!s) return s;
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(d: string | null) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
    contact: Contact;
    hasPhoneNumber: boolean;
    customFields: CustomField[];
    allTags: Tag[];
    relationshipTypes: Record<string, string>;
    lastActivity: string | null;
    suggestions: FollowUpSuggestion[];
    mobileSection: 'info' | 'timeline' | 'sidebar';
    patchContact: (partial: Record<string, unknown>) => void;
    onAddFamilyMember: () => void;
    onOpenAiSummary: () => void;
    onCreateCma: () => void;
    onCreateDeal: () => void;
    onCreateListingPresentation: () => void;
}

export default function LeftCard({
    contact,
    hasPhoneNumber,
    customFields,
    allTags,
    relationshipTypes,
    lastActivity,
    suggestions,
    mobileSection,
    patchContact,
    onAddFamilyMember,
    onOpenAiSummary,
    onCreateCma,
    onCreateDeal,
    onCreateListingPresentation,
}: Props) {
    const [quickActionsOpen, setQuickActionsOpen] = useState(false);
    const quickActionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
                setQuickActionsOpen(false);
            }
        }
        if (quickActionsOpen) {
            document.addEventListener('mousedown', onDoc);
            return () => document.removeEventListener('mousedown', onDoc);
        }
    }, [quickActionsOpen]);

    function runQuickAction(fn: () => void) {
        setQuickActionsOpen(false);
        fn();
    }

    return (
        <div className={`min-w-0 border border-[#E4E7EB] bg-white rounded-[4px] flex flex-col ${mobileSection !== 'info' ? 'hidden lg:flex' : ''}`}>
            {/* Teal Header */}
            <div className="bg-[#0B577A] rounded-t-[3px] px-5 py-4 space-y-3">
                <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-white/15 text-white">{sourceLabels[contact.source] || humanize(contact.source)}</span>

                    <div className="ml-auto relative" ref={quickActionsRef}>
                        <button
                            type="button"
                            onClick={() => setQuickActionsOpen((o) => !o)}
                            aria-label="Quick actions"
                            aria-haspopup="menu"
                            aria-expanded={quickActionsOpen}
                            className={`h-7 w-7 inline-flex items-center justify-center rounded-full transition-colors ${
                                quickActionsOpen
                                    ? 'bg-white/30 text-white'
                                    : 'text-white/80 hover:text-white hover:bg-white/20'
                            }`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                            </svg>
                        </button>
                        {quickActionsOpen && (
                            <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-52 bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden">
                                <button type="button" onClick={() => runQuickAction(onCreateCma)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#111315] hover:bg-[#F9FAFB] transition-colors text-left">
                                    <span className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] bg-[#EFF6FF] text-[#1693C9]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
                                    </span>
                                    <span className="flex-1">Create CMA</span>
                                </button>
                                <button type="button" onClick={() => runQuickAction(onCreateDeal)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#111315] hover:bg-[#F9FAFB] transition-colors text-left border-t border-[#F3F4F6]">
                                    <span className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] bg-[#ECFDF5] text-[#059669]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V12Zm-12 0h.008v.008H6V12Z" /></svg>
                                    </span>
                                    <span className="flex-1">Create Deal</span>
                                </button>
                                <button type="button" onClick={() => runQuickAction(onCreateListingPresentation)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#111315] hover:bg-[#F9FAFB] transition-colors text-left border-t border-[#F3F4F6]">
                                    <span className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] bg-[#FEF3C7] text-[#D97706]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" /></svg>
                                    </span>
                                    <span className="flex-1">Create Listing Presentation</span>
                                </button>
                                <button type="button" onClick={() => runQuickAction(onAddFamilyMember)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#111315] hover:bg-[#F9FAFB] transition-colors text-left border-t border-[#F3F4F6]">
                                    <span className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] bg-[#FCE8F3] text-[#DE3884]">
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" /></svg>
                                    </span>
                                    <span className="flex-1">Add family member</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                        <Avatar id={contact.id} name={`${contact.first_name} ${contact.last_name}`} size="xl" />
                        {contact.lead_score !== null && contact.lead_score !== undefined && (
                            <span
                                className="absolute -bottom-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 text-[10px] font-bold rounded-full text-white ring-2 ring-white"
                                style={{ backgroundColor: contact.lead_score >= 60 ? '#059669' : contact.lead_score >= 30 ? '#D97706' : '#DC2626' }}
                            >
                                {contact.lead_score}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <InlineEdit
                            value={`${contact.first_name} ${contact.last_name}`}
                            onSave={(next) => {
                                const parts = next.trim().split(/\s+/);
                                patchContact({ first_name: parts[0] || contact.first_name, last_name: parts.slice(1).join(' ') || '' });
                            }}
                            pencilTone="light"
                        >
                            <h1 className="text-base font-semibold text-white leading-tight">{contact.first_name} {contact.last_name}</h1>
                        </InlineEdit>
                        <p className="text-xs text-white/80 mt-0.5">
                            {lastActivity ? `Active ${lastActivity}` : `Added ${formatDate(contact.created_at)}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div>
                {/* Contact info */}
                <div className="px-5 py-4 space-y-3 border-t border-[#E4E7EB]">
                    <SectionLabel>Contact Info</SectionLabel>
                    <ContactRow
                        icon={<svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>}
                        iconBg="#1693C9"
                        value={contact.email || ''}
                        placeholder="Add email"
                        type="email"
                        onSave={(v) => patchContact({ email: v })}
                        renderDisplay={(v) => v ? <a href={`mailto:${v}`} className="text-[13px] text-[#1693C9] hover:underline break-all">{v}</a> : <span className="text-[13px] text-[#C4C9D1]">Add email</span>}
                    />
                    <ContactRow
                        icon={<svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>}
                        iconBg="#059669"
                        value={contact.phone || ''}
                        placeholder="Add phone"
                        type="tel"
                        onSave={(v) => patchContact({ phone: v })}
                        renderDisplay={(v) => v ? (
                            <div className="flex items-center gap-1">
                                <a href={`tel:${v}`} className="text-[13px] text-[#111315]">{v}</a>
                                {hasPhoneNumber && <ClickToCall phoneNumber={v} onCall={(num) => window.__openDialer?.(num, contact.id, `${contact.first_name} ${contact.last_name}`)} />}
                            </div>
                        ) : <span className="text-[13px] text-[#C4C9D1]">Add phone</span>}
                    />
                    <ContactRow
                        icon={<svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>}
                        iconBg="#0891B2"
                        value={contact.mobile || ''}
                        placeholder="Add mobile"
                        type="tel"
                        onSave={(v) => patchContact({ mobile: v })}
                        renderDisplay={(v) => v ? (
                            <div className="flex items-center gap-1">
                                <a href={`tel:${v}`} className="text-[13px] text-[#111315]">{v}</a>
                                {hasPhoneNumber && <ClickToCall phoneNumber={v} onCall={(num) => window.__openDialer?.(num, contact.id, `${contact.first_name} ${contact.last_name}`)} />}
                            </div>
                        ) : <span className="text-[13px] text-[#C4C9D1]">Add mobile</span>}
                    />
                    {contact.company && (
                        <div className="flex items-center gap-2.5">
                            <span className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-[#4F46E5]">
                                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                            </span>
                            <Link href={route('crm.companies.show', contact.company.id)} className="text-[13px] text-[#1693C9] hover:underline">{contact.company.name}</Link>
                        </div>
                    )}
                    <ContactRow
                        icon={<svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>}
                        iconBg="#D97706"
                        value={[contact.address, contact.city, contact.state_province, contact.postal_code].filter(Boolean).join(', ')}
                        placeholder="Add address"
                        onSave={(v) => patchContact({ address: v })}
                        renderDisplay={(v) => v ? (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v)}`} target="_blank" rel="noopener noreferrer" className="text-[13px] text-[#5F656D] hover:text-[#111315] transition-colors">{v}</a>
                        ) : <span className="text-[13px] text-[#C4C9D1]">Add address</span>}
                    />
                </div>

                {/* Family */}
                <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                    <div className="flex items-center justify-between">
                        <SectionLabel>Family</SectionLabel>
                        <button type="button" onClick={onAddFamilyMember} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors">+ Add</button>
                    </div>
                    {(contact.relatives || []).length > 0 ? (
                        <ul className="space-y-1">
                            {(contact.relatives || []).map((r) => {
                                const label = r.pivot.custom_label || relationshipTypes[r.pivot.type] || r.pivot.type;
                                return (
                                    <li key={r.id} className="group flex items-center gap-2.5 py-1.5">
                                        <Avatar id={r.id} name={`${r.first_name} ${r.last_name}`} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <Link href={route('crm.contacts.show', r.uuid)} className="block text-[13px] font-medium text-[#111315] hover:text-[#1693C9] truncate leading-tight">
                                                {r.first_name} {r.last_name}
                                            </Link>
                                            <p className="text-[11px] text-[#8B9096] truncate leading-tight">{label}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!confirm(`Unlink ${r.first_name} from this contact?`)) return;
                                                router.delete(route('crm.contacts.relationships.destroy', [contact.uuid, r.pivot.id]), { preserveScroll: true });
                                            }}
                                            className="shrink-0 opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-full text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all"
                                            title="Unlink"
                                        >
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-[11px] text-[#C4C9D1]">No family members linked</p>
                    )}
                </div>

                {/* Description */}
                <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                    <SectionLabel>Description</SectionLabel>
                    <InlineEdit
                        value={contact.description || ''}
                        onSave={(v) => patchContact({ description: v })}
                        multiline
                        placeholder="Add a description..."
                    >
                        {contact.description
                            ? <p className="text-sm text-[#5F656D] whitespace-pre-wrap leading-relaxed">{contact.description}</p>
                            : <p className="text-[13px] text-[#C4C9D1]">Add a description...</p>}
                    </InlineEdit>
                </div>

                {/* AI Insights */}
                <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-3">
                    <SectionLabel>AI Insights</SectionLabel>
                    {contact.ai_summary ? (
                        <div className="bg-[#EBF5FF] border border-[#BFDBFE] rounded-[4px] p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <svg className="h-3.5 w-3.5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                                <span className="text-xs font-medium text-[#1693C9]">AI Summary</span>
                            </div>
                            <p className="text-xs text-[#5F656D] leading-relaxed whitespace-pre-line">{contact.ai_summary}</p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#BFDBFE]">
                                {contact.ai_summary_at && (
                                    <span className="text-[11px] text-[#8B9096]">
                                        {new Date(contact.ai_summary_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                                <button onClick={onOpenAiSummary} className="text-[11px] font-medium text-[#1693C9] hover:text-[#1380AF] transition-colors">Regenerate</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={onOpenAiSummary} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[#1693C9] bg-[#EBF5FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-colors rounded-[4px]">
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                            Generate AI Summary
                        </button>
                    )}
                    {suggestions.length > 0 && (
                        <div className="space-y-1.5">
                            {suggestions.map((s, i) => {
                                const priorityColor = { urgent: '#DC2626', high: '#D97706', medium: '#1693C9', low: '#8B9096' }[s.priority] || '#8B9096';
                                return (
                                    <div key={i} className="flex items-start gap-2 py-1.5">
                                        <svg className="h-3.5 w-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={priorityColor}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                                        </svg>
                                        <span className="text-xs text-[#5F656D] leading-snug">{s.message}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Details */}
                <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2.5">
                    <SectionLabel>Details</SectionLabel>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-[#5F656D]">Birthday</span>
                        <div className="flex-1 max-w-[60%]">
                            <InlineEdit value={contact.date_of_birth || ''} onSave={(v) => patchContact({ date_of_birth: v })} type="date">
                                {contact.date_of_birth
                                    ? <span className="text-[13px] text-[#111315] text-right block">{formatDate(contact.date_of_birth)}</span>
                                    : <span className="text-[13px] text-[#C4C9D1] text-right block">Add birthday</span>}
                            </InlineEdit>
                        </div>
                    </div>
                    {contact.last_contacted_at && (
                        <div className="flex justify-between"><span className="text-xs text-[#5F656D]">Last Contact</span><span className="text-[13px] text-[#111315]">{formatDate(contact.last_contacted_at)}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-xs text-[#5F656D]">Added</span><span className="text-[13px] text-[#111315]">{formatDate(contact.created_at)}</span></div>
                </div>

                {/* Tags */}
                <div className="px-5 py-4 border-t border-[#E4E7EB] space-y-2">
                    <SectionLabel>Tags</SectionLabel>
                    <TagPicker
                        tags={contact.tags || []}
                        allTags={allTags}
                        onChange={(ids) => patchContact({ tags: ids })}
                        allowCreate
                    />
                </div>

                {/* Custom Fields — grouped by section */}
                {customFields.length > 0 && (() => {
                    const grouped: Record<string, CustomField[]> = {};
                    customFields.forEach((f) => {
                        const s = f.section || 'Custom Fields';
                        (grouped[s] ??= []).push(f);
                    });
                    const cf = contact.custom_fields || {};
                    const setVal = (key: string, v: unknown) =>
                        patchContact({ custom_fields: { ...cf, [key]: v } });

                    const inlineType = (t: string): 'text' | 'email' | 'date' | 'number' =>
                        t === 'date' ? 'date'
                        : t === 'number' ? 'number'
                        : t === 'email' ? 'email'
                        : 'text';

                    return Object.entries(grouped).map(([sectionName, fields]) => (
                        <div key={sectionName} className="px-5 py-4 border-t border-[#E4E7EB] space-y-2.5">
                            <SectionLabel>{sectionName}</SectionLabel>
                            {fields.map((field) => {
                                const val = (cf as Record<string, unknown>)[field.key];

                                // Checkbox: render a toggle, not InlineEdit
                                if (field.type === 'checkbox') {
                                    const checked = val === true || val === 1 || val === '1';
                                    return (
                                        <label key={field.key} className="flex justify-between items-center gap-2 cursor-pointer">
                                            <span className="text-xs text-[#5F656D] shrink-0">
                                                {field.label}
                                                {field.required && <span className="text-[#DC2626] ml-0.5">*</span>}
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => setVal(field.key, e.target.checked)}
                                                className="h-4 w-4 rounded border-[#E4E7EB] text-[#1693C9] focus:ring-[#1693C9]"
                                            />
                                        </label>
                                    );
                                }

                                const displayVal = val == null ? '' : String(val);
                                const isUrl = field.type === 'url' && displayVal;
                                return (
                                    <div key={field.key} className="flex justify-between items-center gap-2">
                                        <span className="text-xs text-[#5F656D] shrink-0">
                                            {field.label}
                                            {field.required && <span className="text-[#DC2626] ml-0.5">*</span>}
                                        </span>
                                        <div className="flex-1 min-w-0 max-w-[60%]">
                                            <InlineEdit
                                                value={displayVal}
                                                onSave={(v) => setVal(field.key, v)}
                                                type={inlineType(field.type)}
                                                placeholder={field.label}
                                                multiline={field.type === 'textarea'}
                                            >
                                                {displayVal
                                                    ? (isUrl
                                                        ? <a href={displayVal} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[13px] text-[#1693C9] hover:underline text-right block truncate">{displayVal}</a>
                                                        : <span className="text-[13px] text-[#111315] text-right block truncate">{displayVal}</span>)
                                                    : <span className="text-[13px] text-[#C4C9D1] text-right block">Add {field.label.toLowerCase()}</span>}
                                            </InlineEdit>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ));
                })()}
            </div>

        </div>
    );
}
