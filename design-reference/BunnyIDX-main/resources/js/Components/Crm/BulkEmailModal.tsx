import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { EmailAccount } from '@/types';

interface Contact {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
}

interface Props {
    contactIds: number[];
    contacts: Contact[];
    onClose: () => void;
    onSent: (campaignId: number) => void;
    /** Optional contact UUID used for AI drafting on single-contact composes. */
    contactUuid?: string;
}

const mergeFields = [
    { key: '{{first_name}}', label: 'First Name' },
    { key: '{{last_name}}', label: 'Last Name' },
    { key: '{{full_name}}', label: 'Full Name' },
    { key: '{{email}}', label: 'Email' },
];

function replaceFields(text: string, contact: Contact): string {
    return text
        .replace(/\{\{first_name\}\}/g, contact.first_name || '')
        .replace(/\{\{last_name\}\}/g, contact.last_name || '')
        .replace(/\{\{full_name\}\}/g, `${contact.first_name || ''} ${contact.last_name || ''}`.trim())
        .replace(/\{\{email\}\}/g, contact.email || '');
}

export default function BulkEmailModal({ contactIds, contacts, onClose, onSent, contactUuid }: Props) {
    const isSingle = contacts.length === 1;
    const recipient = contacts[0];

    // Prefill defaults — single uses literal name, bulk uses merge field.
    const initialSubject = isSingle
        ? `Hi ${recipient?.first_name ?? ''}`.trim()
        : 'Hi {{first_name}}';
    const initialBody = isSingle
        ? `Hi ${recipient?.first_name ?? ''},\n\n\n\nThanks,`
        : `Hi {{first_name}},\n\n\n\nThanks,`;

    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [accountId, setAccountId] = useState<number | null>(null);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'compose' | 'preview'>('compose');
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const subjectRef = useRef<HTMLInputElement>(null);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const [lastFocused, setLastFocused] = useState<'subject' | 'body'>('body');

    // AI drafting
    const [showAiPurpose, setShowAiPurpose] = useState(false);
    const [aiPurpose, setAiPurpose] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const aiInputRef = useRef<HTMLInputElement>(null);

    const withEmail = contacts.filter((c) => c.email);
    const withoutEmail = contacts.filter((c) => !c.email);
    const previewContact = withEmail[0];

    useEffect(() => {
        axios
            .get(route('crm.email.accounts'))
            .then((res) => {
                const accs = res.data.accounts || res.data || [];
                setAccounts(accs);
                if (accs.length > 0) {
                    const defaultAcc = accs.find((a: EmailAccount) => a.is_default) || accs[0];
                    setAccountId(defaultAcc.id);
                }
            })
            .catch(() => {})
            .finally(() => setLoadingAccounts(false));
    }, []);

    useEffect(() => {
        if (showAiPurpose) setTimeout(() => aiInputRef.current?.focus(), 0);
    }, [showAiPurpose]);

    const insertMergeField = (field: string) => {
        if (lastFocused === 'subject' && subjectRef.current) {
            const el = subjectRef.current;
            const start = el.selectionStart ?? subject.length;
            const end = el.selectionEnd ?? subject.length;
            const newVal = subject.slice(0, start) + field + subject.slice(end);
            setSubject(newVal);
            setTimeout(() => {
                el.focus();
                el.setSelectionRange(start + field.length, start + field.length);
            }, 0);
        } else if (bodyRef.current) {
            const el = bodyRef.current;
            const start = el.selectionStart ?? body.length;
            const end = el.selectionEnd ?? body.length;
            const newVal = body.slice(0, start) + field + body.slice(end);
            setBody(newVal);
            setTimeout(() => {
                el.focus();
                el.setSelectionRange(start + field.length, start + field.length);
            }, 0);
        }
    };

    const generateDraft = async () => {
        // We always need a contact UUID — use the prop, or fall back to first contact in bulk mode.
        const targetContactId = contactUuid || (recipient && (recipient as any).uuid);
        if (!targetContactId) {
            // For bulk without uuid, use a generic prompt with placeholder data via the first contact's id.
            // The single-contact route requires a UUID, so without one we can't draft.
            setAiError('AI drafting requires opening the modal from a contact row.');
            return;
        }
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await axios.post(
                route('crm.contacts.ai.draft-email', targetContactId),
                { purpose: aiPurpose }
            );
            const { subject: aiSubject, body: aiBody } = res.data || {};
            if (aiSubject) setSubject(aiSubject);
            if (aiBody) setBody(aiBody);
            setShowAiPurpose(false);
            setAiPurpose('');
        } catch (e: any) {
            setAiError(e.response?.data?.error || e.response?.data?.message || 'Failed to draft email.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSend = async () => {
        if (!accountId || !subject.trim() || !body.trim() || sending) return;

        setSending(true);
        setError(null);

        try {
            const res = await axios.post(route('crm.contacts.bulk-email'), {
                email_account_id: accountId,
                contact_ids: contactIds,
                subject: subject.trim(),
                body_html: body.replace(/\n/g, '<br>'),
            });

            onSent(res.data.campaign.id);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send.');
        } finally {
            setSending(false);
        }
    };

    if (loadingAccounts) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-8 text-center">
                    <div className="animate-spin h-6 w-6 border-2 border-[#1693C9] border-t-transparent rounded-full mx-auto" />
                    <p className="text-xs text-[#8B9096] mt-3">Loading email accounts…</p>
                </div>
            </div>
        );
    }

    if (accounts.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-8 text-center">
                    <svg className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <h3 className="text-sm font-semibold text-[#111315] mb-1">Connect your email first</h3>
                    <p className="text-xs text-[#5F656D] mb-4">Connect a Gmail account to send emails.</p>
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315]">Cancel</button>
                        <a
                            href={route('crm.email.oauth.google.redirect')}
                            className="inline-flex items-center h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors"
                        >
                            Connect Gmail
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E7EB]">
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-[#111315]">
                            {isSingle ? `Email ${recipient.first_name} ${recipient.last_name}`.trim() : 'Send Bulk Email'}
                        </h3>
                        <p className="text-[11px] text-[#8B9096] mt-0.5 truncate">
                            {isSingle ? (
                                <>to <span className="text-[#5F656D]">{recipient.email || 'no email on file'}</span></>
                            ) : (
                                <>
                                    to {withEmail.length} contact{withEmail.length !== 1 ? 's' : ''}
                                    {withoutEmail.length > 0 && (
                                        <span className="text-[#A16207]"> · {withoutEmail.length} without email skipped</span>
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                    <button onClick={onClose} className="shrink-0 h-7 w-7 inline-flex items-center justify-center text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6] rounded-md transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#E4E7EB] px-5">
                    <button
                        onClick={() => setTab('compose')}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                            tab === 'compose'
                                ? 'border-[#1693C9] text-[#111315]'
                                : 'border-transparent text-[#8B9096] hover:text-[#5F656D]'
                        }`}
                    >
                        Compose
                    </button>
                    <button
                        onClick={() => setTab('preview')}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                            tab === 'preview'
                                ? 'border-[#1693C9] text-[#111315]'
                                : 'border-transparent text-[#8B9096] hover:text-[#5F656D]'
                        }`}
                    >
                        Preview
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {error && (
                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
                    )}

                    {tab === 'compose' ? (
                        <>
                            {/* From */}
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-semibold text-[#8B9096] tracking-wider w-14 shrink-0">From</span>
                                {accounts.length > 1 ? (
                                    <select
                                        value={accountId ?? ''}
                                        onChange={(e) => setAccountId(Number(e.target.value))}
                                        className="flex-1 h-9 text-sm border border-[#C8CCD1] rounded-lg px-3 text-[#111315] bg-white focus:outline-none focus:ring-2 focus:ring-[#1693C9]/20 focus:border-[#1693C9]"
                                    >
                                        {accounts.map((a) => (
                                            <option key={a.id} value={a.id}>{a.email_address}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-[13px] text-[#111315]">{accounts[0]?.email_address}</span>
                                )}
                            </div>

                            {/* To (single contact only — easier visual confirmation) */}
                            {isSingle && recipient.email && (
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-semibold text-[#8B9096] tracking-wider w-14 shrink-0">To</span>
                                    <span className="text-[13px] text-[#111315]">
                                        {recipient.first_name} {recipient.last_name}{' '}
                                        <span className="text-[#5F656D]">&lt;{recipient.email}&gt;</span>
                                    </span>
                                </div>
                            )}

                            {/* Subject */}
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-semibold text-[#8B9096] tracking-wider w-14 shrink-0">Subject</span>
                                <input
                                    ref={subjectRef}
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    onFocus={() => setLastFocused('subject')}
                                    placeholder="Subject"
                                    className="flex-1 h-9 text-sm border border-[#C8CCD1] rounded-lg px-3 text-[#111315] bg-white focus:outline-none focus:ring-2 focus:ring-[#1693C9]/20 focus:border-[#1693C9] placeholder:text-[#8B9096]"
                                />
                            </div>

                            {/* Body */}
                            <textarea
                                ref={bodyRef}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                onFocus={() => setLastFocused('body')}
                                placeholder="Compose your email…"
                                rows={11}
                                className="w-full text-sm border border-[#C8CCD1] rounded-lg px-3.5 py-3 text-[#111315] bg-white placeholder:text-[#8B9096] resize-none focus:outline-none focus:ring-2 focus:ring-[#1693C9]/20 focus:border-[#1693C9]"
                            />

                            {/* Action toolbar — AI + merge fields */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setShowAiPurpose((s) => !s)}
                                    disabled={aiLoading}
                                    className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg transition-colors ${
                                        showAiPurpose
                                            ? 'bg-[#1693C9] text-white'
                                            : 'bg-[#F3F4F6] text-[#111315] hover:bg-[#E4E7EB]'
                                    }`}
                                >
                                    {aiLoading ? (
                                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    ) : (
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                        </svg>
                                    )}
                                    {aiLoading ? 'Drafting…' : 'AI draft'}
                                </button>

                                <div className="flex items-center gap-1 flex-wrap">
                                    {mergeFields.map((f) => (
                                        <button
                                            key={f.key}
                                            type="button"
                                            onClick={() => insertMergeField(f.key)}
                                            className="px-2 h-7 text-[11px] font-medium text-[#5F656D] bg-white border border-[#E4E7EB] rounded-md hover:border-[#1693C9] hover:text-[#1693C9] transition-colors"
                                            title={`Insert ${f.label} merge tag`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {showAiPurpose && (
                                <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#C8CCD1] rounded-lg px-3 py-2">
                                    <svg className="h-4 w-4 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                    </svg>
                                    <input
                                        ref={aiInputRef}
                                        type="text"
                                        value={aiPurpose}
                                        onChange={(e) => setAiPurpose(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); generateDraft(); }
                                            if (e.key === 'Escape') { setShowAiPurpose(false); setAiPurpose(''); }
                                        }}
                                        placeholder="What's this email about? (e.g. follow up on yesterday's showing)"
                                        className="flex-1 h-7 text-xs bg-transparent text-[#111315] placeholder:text-[#8B9096] focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={generateDraft}
                                        disabled={aiLoading}
                                        className="h-7 px-3 text-[11px] font-semibold text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50"
                                    >
                                        {aiLoading ? '…' : 'Draft'}
                                    </button>
                                </div>
                            )}

                            {aiError && (
                                <p className="text-[11px] text-red-600">{aiError}</p>
                            )}
                        </>
                    ) : (
                        /* Preview tab */
                        <div className="space-y-3">
                            {previewContact ? (
                                <>
                                    <div className="px-3 py-2 bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg">
                                        <p className="text-[10px] font-semibold text-[#0369A1] tracking-wider mb-0.5">Preview for</p>
                                        <p className="text-xs text-[#111315] font-medium">{previewContact.first_name} {previewContact.last_name} ({previewContact.email})</p>
                                    </div>
                                    <div className="border border-[#E4E7EB] rounded-lg overflow-hidden">
                                        <div className="px-3 py-2 bg-[#F9FAFB] border-b border-[#E4E7EB]">
                                            <p className="text-xs text-[#5F656D]">
                                                <span className="font-medium text-[#111315]">Subject:</span>{' '}
                                                {replaceFields(subject, previewContact) || '(no subject)'}
                                            </p>
                                        </div>
                                        <div className="px-3 py-3 text-sm text-[#111315] leading-relaxed whitespace-pre-line min-h-[160px]">
                                            {replaceFields(body, previewContact) || '(no content)'}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-[#8B9096] text-center py-8">No contacts with email to preview.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#E4E7EB] bg-[#F9FAFB]">
                    <span className="text-[11px] text-[#8B9096]">
                        {withEmail.length} recipient{withEmail.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!accountId || !subject.trim() || !body.trim() || sending || withEmail.length === 0}
                            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {sending ? (
                                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            )}
                            Send {isSingle ? '' : `to ${withEmail.length}`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
