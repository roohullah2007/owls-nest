import axios from 'axios';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { PageProps } from '@/types';
import RichTextEditor, { FormatButton, RichTextEditorHandle } from './RichTextEditor';
import TenDlcPrompt from './TenDlcPrompt';
import { requires10Dlc } from '@/utils/smsGate';

interface Listing {
    id: number;
    title: string | null;
    address: string | null;
    city: string | null;
    state_province: string | null;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    sqft: number | null;
    mls_number: string | null;
    photo: string | null;
}

interface Deal {
    id: number;
    title: string;
    value: number | null;
    property_address: string | null;
    type: string;
    stage: string | null;
    mls_number: string | null;
}

interface VoicedropTemplate {
    id: number;
    name: string;
    description: string | null;
    duration_seconds: number | null;
    audio_url: string;
}

interface BaseProps {
    contactId: number;
    contactUuid: string;
    contactEmail: string | null;
    contactPhone: string | null;
    onSent: () => void;
    /** Compact layout — shorter editor, format toolbar merged inline. Used in the inbox where vertical space is tight. */
    compact?: boolean;
}

interface SmsProps extends BaseProps {
    channel: 'sms';
}

interface EmailProps extends BaseProps {
    channel: 'email';
}

type Props = SmsProps | EmailProps;

function formatListingForSms(l: Listing): string {
    const parts: string[] = [];
    if (l.address) parts.push(l.address);
    const beds = l.bedrooms ? `${l.bedrooms}bd` : '';
    const baths = l.bathrooms ? `${l.bathrooms}ba` : '';
    const sqft = l.sqft ? `${l.sqft.toLocaleString()}sf` : '';
    const stats = [beds, baths, sqft].filter(Boolean).join(' / ');
    if (stats) parts.push(stats);
    if (l.price) parts.push(`$${Number(l.price).toLocaleString()}`);
    return parts.join(' — ');
}

function formatListingForEmailHtml(l: Listing): string {
    const addr = [l.address, l.city, l.state_province].filter(Boolean).join(', ');
    const stats = [
        l.bedrooms ? `${l.bedrooms} bed` : null,
        l.bathrooms ? `${l.bathrooms} bath` : null,
        l.sqft ? `${l.sqft.toLocaleString()} sqft` : null,
    ].filter(Boolean).join(' • ');
    const price = l.price ? `$${Number(l.price).toLocaleString()}` : '';

    return `<div style="margin:12px 0;padding:12px;border:1px solid #E4E7EB;border-radius:8px;background:#F9FAFB;">
        ${l.title ? `<div style="font-weight:600;color:#111315;">${escapeHtml(l.title)}</div>` : ''}
        ${addr ? `<div style="color:#5F656D;font-size:13px;">${escapeHtml(addr)}</div>` : ''}
        ${stats ? `<div style="color:#5F656D;font-size:13px;margin-top:4px;">${escapeHtml(stats)}</div>` : ''}
        ${price ? `<div style="color:#059669;font-weight:600;margin-top:4px;">${escapeHtml(price)}</div>` : ''}
        ${l.mls_number ? `<div style="color:#8B9096;font-size:11px;margin-top:4px;">MLS #${escapeHtml(l.mls_number)}</div>` : ''}
    </div><p></p>`;
}

function formatDealForSms(d: Deal): string {
    const parts: string[] = [d.title];
    if (d.value) parts.push(`$${Number(d.value).toLocaleString()}`);
    if (d.stage) parts.push(d.stage);
    return parts.join(' — ');
}

function formatDealForEmailHtml(d: Deal): string {
    const value = d.value ? `$${Number(d.value).toLocaleString()}` : '';
    return `<div style="margin:12px 0;padding:12px;border:1px solid #E4E7EB;border-radius:8px;background:#F9FAFB;">
        <div style="font-weight:600;color:#111315;">${escapeHtml(d.title)}</div>
        ${d.property_address ? `<div style="color:#5F656D;font-size:13px;">${escapeHtml(d.property_address)}</div>` : ''}
        ${value ? `<div style="color:#059669;font-weight:600;margin-top:4px;">${escapeHtml(value)}</div>` : ''}
        ${d.stage ? `<div style="color:#8B9096;font-size:11px;margin-top:4px;">${escapeHtml(d.stage)}</div>` : ''}
    </div><p></p>`;
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function MessageComposer(props: Props) {
    const { contactId, contactUuid, contactEmail, contactPhone, channel, onSent, compact = false } = props;
    const { phoneNumber, tenDlcStatus, hasEmailAccount } = usePage<PageProps>().props;
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiPurpose, setAiPurpose] = useState('');
    const [showAiPurpose, setShowAiPurpose] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const aiPurposeRef = useRef<HTMLInputElement>(null);
    const richEditorRef = useRef<RichTextEditorHandle>(null);
    const smsTextareaRef = useRef<HTMLTextAreaElement>(null);

    // SMS-specific gating
    if (channel === 'sms' && !phoneNumber) {
        return <ConfigurePhonePrompt />;
    }
    // 10DLC is only required for US/Canadian (NANP) destinations.
    // International numbers can send without 10DLC registration.
    if (channel === 'sms' && requires10Dlc(contactPhone) && tenDlcStatus !== 'approved') {
        return <TenDlcPrompt status={tenDlcStatus} />;
    }
    if (channel === 'email' && !hasEmailAccount) {
        return <ConnectEmailPrompt />;
    }

    // Reset state when contact or channel changes
    useEffect(() => {
        setSubject('');
        setBody('');
        setAiPurpose('');
        setShowAiPurpose(false);
        setShowEmojiPicker(false);
    }, [contactId, channel]);

    useEffect(() => {
        if (showAiPurpose) aiPurposeRef.current?.focus();
    }, [showAiPurpose]);

    async function generateDraft() {
        setAiLoading(true);
        try {
            const endpoint = channel === 'sms'
                ? route('crm.contacts.ai.draft-sms', contactUuid)
                : route('crm.contacts.ai.draft-email', contactUuid);
            const res = await axios.post(endpoint, { purpose: aiPurpose });
            if (res.data.error) {
                alert(res.data.error);
            } else {
                if (channel === 'email' && res.data.subject) setSubject(res.data.subject);
                if (res.data.body) {
                    if (channel === 'email') {
                        const html = '<p>' + res.data.body.replace(/\n/g, '</p><p>') + '</p>';
                        setBody((prev) => prev ? prev + html : html);
                    } else {
                        setBody((prev) => prev ? prev + '\n\n' + res.data.body : res.data.body);
                    }
                }
            }
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to generate draft');
        } finally {
            setAiLoading(false);
            setShowAiPurpose(false);
            setAiPurpose('');
        }
    }

    function insertListing(listing: Listing) {
        if (channel === 'sms') {
            const snippet = formatListingForSms(listing);
            setBody((prev) => prev ? prev + '\n\n' + snippet : snippet);
        } else {
            richEditorRef.current?.insertHtml(formatListingForEmailHtml(listing));
        }
    }

    function insertDeal(deal: Deal) {
        if (channel === 'sms') {
            const snippet = formatDealForSms(deal);
            setBody((prev) => prev ? prev + '\n\n' + snippet : snippet);
        } else {
            richEditorRef.current?.insertHtml(formatDealForEmailHtml(deal));
        }
    }

    function insertEmoji(data: EmojiClickData) {
        if (channel === 'sms') {
            insertAtCaretSms(smsTextareaRef.current, data.emoji, body, setBody);
        } else {
            richEditorRef.current?.insertHtml(data.emoji);
        }
    }

    function insertLink(url: string, label?: string) {
        if (channel === 'sms') {
            setBody((prev) => prev ? prev + ' ' + url : url);
        } else {
            const html = `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(label || url)}</a>`;
            richEditorRef.current?.insertHtml(html);
        }
    }

    async function handleSend() {
        if (!body.trim() || sending) return;
        if (channel === 'email' && !subject.trim()) return;
        setSending(true);
        try {
            if (channel === 'sms') {
                if (!contactPhone) {
                    alert("This contact doesn't have a phone number on file.");
                    setSending(false);
                    return;
                }
                await axios.post(route('crm.sms.send'), {
                    contact_id: contactId,
                    to_number: contactPhone,
                    body,
                });
            } else {
                if (!contactEmail) {
                    alert("This contact doesn't have an email on file.");
                    setSending(false);
                    return;
                }
                const accounts = await axios.get(route('crm.email.accounts')).then((r) => r.data);
                const defaultAccount = accounts.find((a: any) => a.is_default) ?? accounts[0];
                if (!defaultAccount) {
                    alert('No email account connected.');
                    setSending(false);
                    return;
                }
                await axios.post(route('crm.email.send'), {
                    email_account_id: defaultAccount.id,
                    to: contactEmail,
                    subject,
                    body_html: body,
                    contact_id: contactId,
                });
            }
            setSubject('');
            setBody('');
            onSent();
        } catch (e: any) {
            alert(e?.response?.data?.message || e?.response?.data?.error || 'Failed to send');
        } finally {
            setSending(false);
        }
    }

    const formatButtons = channel === 'email' ? (
        <>
            <FormatButton command="bold" title="Bold (⌘B)" icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3.75v16.5h7.875a4.125 4.125 0 0 0 0-8.25H6.75m0 0h6.375a3.75 3.75 0 0 0 0-7.5H6.75Z" /></svg>
            } />
            <FormatButton command="italic" title="Italic (⌘I)" icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75H9.75M14.25 20.25H9.75M14.5 3.75 9.5 20.25" /></svg>
            } />
            <FormatButton command="underline" title="Underline (⌘U)" icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 3.75v9a5.25 5.25 0 0 1-10.5 0v-9M5.25 20.25h13.5" /></svg>
            } />
            <FormatButton command="insertUnorderedList" title="Bullet list" icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
            } />
            <FormatButton command="insertOrderedList" title="Numbered list" icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.242 5.992h12M8.242 11.992h12m-12 6h12M3 6h1v-2H3M3 12h1l-1.5 2h1.5M3 17.5h1V19H3v.5h1" /></svg>
            } />
        </>
    ) : null;

    return (
        <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
            {/* Sending from */}
            {channel === 'sms' && phoneNumber && !compact && (
                <p className="text-[11px] text-[#8B9096]">
                    Sending from <span className="font-medium text-[#5F656D]">{phoneNumber.phone_number}</span>
                </p>
            )}

            {channel === 'email' && (
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className={`w-full ${compact ? 'h-8' : 'h-9'} text-sm border border-[#E4E7EB] rounded-lg px-3 text-[#111315] bg-white focus:outline-none focus:ring-2 focus:ring-[#1693C9]/20 focus:border-[#1693C9] placeholder:text-[#8B9096]`}
                />
            )}

            {/* Rich-text format toolbar — its own row only in non-compact mode. In compact mode it merges into the action toolbar below. */}
            {channel === 'email' && !compact && (
                <div className="flex items-center gap-0.5 px-1 py-1 bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg w-fit">
                    {formatButtons}
                </div>
            )}

            {channel === 'email' ? (
                <RichTextEditor
                    ref={richEditorRef}
                    value={body}
                    onChange={setBody}
                    placeholder="Compose your email..."
                    minHeight={compact ? 90 : 140}
                />
            ) : (
                <div className="flex items-end gap-2">
                    <textarea
                        ref={smsTextareaRef}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Type a message..."
                        rows={2}
                        maxLength={1600}
                        className="flex-1 resize-none text-sm border border-[#E4E7EB] rounded-xl px-4 py-3 text-[#111315] bg-white focus:outline-none focus:ring-2 focus:ring-[#1693C9]/20 focus:border-[#1693C9] placeholder:text-[#8B9096] shadow-sm"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!body.trim() || sending}
                        className="h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                    >
                        {sending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            )}

            {/* Action toolbar: AI / Listing / Deal / Emoji / Link / File (+ Send for email).
                In compact mode we also fold the rich-text format buttons into this row. */}
            <div className="flex items-center gap-2 flex-wrap">
                {channel === 'email' && compact && (
                    <>
                        <div className="flex items-center gap-0.5">{formatButtons}</div>
                        <span className="w-px h-4 bg-[#E4E7EB]" />
                    </>
                )}
                <ComposerToolbarButton
                    onClick={() => setShowAiPurpose((s) => !s)}
                    disabled={aiLoading}
                    icon={
                        aiLoading ? (
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                            </svg>
                        )
                    }
                    label={aiLoading ? 'Drafting…' : 'AI draft'}
                />
                <ListingPickerButton onPick={insertListing} />
                <DealPickerButton onPick={insertDeal} />
                <EmojiPickerButton open={showEmojiPicker} onToggle={() => setShowEmojiPicker((s) => !s)} onPick={insertEmoji} />
                <LinkInsertButton onInsert={insertLink} channel={channel} />
                {channel === 'email' && <FileAttachButton onInsert={insertLink} />}
                {channel === 'sms' && <VoicedropButton contactId={contactId} onSent={onSent} />}
                {channel === 'email' && (
                    <button
                        onClick={handleSend}
                        disabled={!body.trim() || !subject.trim() || sending}
                        className="ml-auto h-8 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                    >
                        {sending ? 'Sending...' : 'Send'}
                    </button>
                )}
            </div>

            {showAiPurpose && (
                <div className="flex items-center gap-2 bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg px-3 py-2">
                    <input
                        ref={aiPurposeRef}
                        type="text"
                        value={aiPurpose}
                        onChange={(e) => setAiPurpose(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') generateDraft(); if (e.key === 'Escape') { setShowAiPurpose(false); setAiPurpose(''); } }}
                        placeholder='Purpose (e.g. "follow up on showing")'
                        className="flex-1 h-8 text-xs bg-white border border-[#E4E7EB] rounded-md px-2.5 text-[#111315] focus:outline-none focus:border-[#1693C9]"
                    />
                    <button
                        onClick={generateDraft}
                        disabled={aiLoading}
                        className="h-8 px-3 text-xs font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50"
                    >
                        Generate
                    </button>
                </div>
            )}
        </div>
    );
}

function insertAtCaretSms(el: HTMLTextAreaElement | null, text: string, body: string, setBody: (b: string) => void) {
    if (!el) {
        setBody(body + text);
        return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + text + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + text.length, start + text.length);
    });
}

function ConfigurePhonePrompt() {
    return (
        <div className="flex items-start gap-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-4">
            <svg className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#111315]">Configure a phone number to enable SMS</p>
                <p className="text-xs text-[#5F656D] mt-0.5">Provision a local phone number to send text messages and make calls.</p>
                <Link
                    href={route('crm.settings') + '?tab=phone'}
                    className="inline-flex items-center mt-3 h-8 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                >
                    Set up phone
                </Link>
            </div>
        </div>
    );
}

function ConnectEmailPrompt() {
    return (
        <div className="flex items-start gap-3 bg-[#FAFBFC] border border-[#E4E7EB] rounded-lg p-4">
            <svg className="h-5 w-5 text-[#5F656D] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#111315]">Connect your email to send</p>
                <p className="text-xs text-[#5F656D] mt-0.5">Link your Gmail account to send and receive emails from BunnyIDX.</p>
                <Link
                    href={route('crm.settings') + '?tab=email'}
                    className="inline-flex items-center mt-3 h-8 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                >
                    Connect Gmail
                </Link>
            </div>
        </div>
    );
}

function LinkInsertButton({ onInsert, channel }: { onInsert: (url: string, label?: string) => void; channel: 'sms' | 'email' }) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [label, setLabel] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const urlRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        if (open) setTimeout(() => urlRef.current?.focus(), 50);
    }, [open]);

    function submit() {
        const trimmed = url.trim();
        if (!trimmed) return;
        const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        onInsert(normalized, label.trim() || undefined);
        setUrl('');
        setLabel('');
        setOpen(false);
    }

    return (
        <div ref={wrapperRef} className="relative">
            <ComposerToolbarButton
                onClick={() => setOpen((o) => !o)}
                icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>}
                label="Link"
            />
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-[#E4E7EB] rounded-xl shadow-lg p-3 space-y-2 z-50">
                    <div>
                        <label className="block text-[10px] font-medium text-[#5F656D] mb-1">URL</label>
                        <input
                            ref={urlRef}
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                            placeholder="https://example.com"
                            className="w-full h-8 px-2.5 text-xs bg-white border border-[#E4E7EB] rounded-md text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                        />
                    </div>
                    {channel === 'email' && (
                        <div>
                            <label className="block text-[10px] font-medium text-[#5F656D] mb-1">Display text <span className="text-[#8B9096]">(optional)</span></label>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                                placeholder="Click here"
                                className="w-full h-8 px-2.5 text-xs bg-white border border-[#E4E7EB] rounded-md text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button onClick={() => setOpen(false)} className="h-7 px-3 text-[11px] font-medium text-[#5F656D] hover:text-[#111315]">Cancel</button>
                        <button onClick={submit} disabled={!url.trim()} className="h-7 px-3 text-[11px] font-semibold text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] disabled:opacity-50">Insert</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FileAttachButton({ onInsert }: { onInsert: (url: string, label?: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            // Best-effort: try a generic uploads endpoint. If not implemented, surface a clear message.
            const res = await axios.post('/crm/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data?.url) {
                onInsert(res.data.url, file.name);
            } else {
                throw new Error('Upload response missing url');
            }
        } catch {
            alert("Attaching files inline isn't wired to Gmail yet. The file button is here for layout; full Gmail attachment support is coming. For now, share files via a hosted link using the Link button.");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    return (
        <>
            <input ref={inputRef} type="file" hidden onChange={handleFile} />
            <ComposerToolbarButton
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                icon={
                    uploading
                        ? <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                        : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
                }
                label={uploading ? 'Uploading…' : 'File'}
            />
        </>
    );
}

function VoicedropButton({ contactId, onSent }: { contactId: number; onSent: () => void }) {
    const [open, setOpen] = useState(false);
    const [drops, setDrops] = useState<VoicedropTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false); }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        axios.get(route('crm.voicemail-drops.index'))
            .then((r) => setDrops(r.data))
            .catch(() => setDrops([]))
            .finally(() => setLoading(false));
    }, [open]);

    async function send(dropId: number) {
        setSending(dropId);
        try {
            await axios.post(route('crm.voicemail-drops.send'), { contact_id: contactId, voicemail_drop_id: dropId });
            setOpen(false);
            onSent();
            alert('Voicedrop initiated. The recipient will hear it when their voicemail picks up.');
        } catch (e: any) {
            alert(e?.response?.data?.error || 'Failed to send voicedrop');
        } finally {
            setSending(null);
        }
    }

    return (
        <div ref={wrapperRef} className="relative">
            <ComposerToolbarButton
                onClick={() => setOpen((o) => !o)}
                icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>}
                label="Voicedrop"
            />
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-[#E4E7EB] flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#111315]">Voicedrop templates</p>
                        <Link href={route('crm.settings') + '?tab=phone'} className="text-[10px] font-medium text-[#1693C9] hover:underline">Manage</Link>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {loading ? (
                            <div className="px-3 py-6 text-center text-xs text-[#8B9096]">Loading…</div>
                        ) : drops.length === 0 ? (
                            <div className="px-3 py-6 text-center">
                                <p className="text-xs text-[#8B9096] mb-2">No voicedrop recordings yet</p>
                                <Link href={route('crm.settings') + '?tab=phone'} className="inline-flex h-7 px-3 text-[11px] font-medium text-white bg-[#1693C9] rounded-md hover:bg-[#1380AF] items-center">
                                    Upload one
                                </Link>
                            </div>
                        ) : (
                            drops.map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => send(d.id)}
                                    disabled={sending !== null}
                                    className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#F3F4F6] transition-colors text-left disabled:opacity-50"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-medium text-[#111315] truncate">{d.name}</p>
                                        {d.description && <p className="text-[11px] text-[#8B9096] truncate">{d.description}</p>}
                                        {d.duration_seconds && (
                                            <p className="text-[10px] text-[#5F656D] mt-0.5">{Math.round(d.duration_seconds)}s</p>
                                        )}
                                    </div>
                                    {sending === d.id ? (
                                        <svg className="animate-spin h-3.5 w-3.5 text-[#1693C9] mt-0.5" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    ) : (
                                        <svg className="h-3.5 w-3.5 text-[#5F656D] mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                        </svg>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmojiPickerButton({ open, onToggle, onPick }: { open: boolean; onToggle: () => void; onPick: (d: EmojiClickData) => void }) {
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) { if (open && wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) onToggle(); }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    return (
        <div ref={wrapperRef} className="relative">
            <ComposerToolbarButton
                onClick={onToggle}
                icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>}
                label="Emoji"
            />
            {open && (
                <div className="absolute bottom-full left-0 mb-2 z-50 shadow-lg rounded-lg overflow-hidden">
                    <EmojiPicker
                        onEmojiClick={(d) => { onPick(d); onToggle(); }}
                        theme={Theme.LIGHT}
                        height={350}
                        width={300}
                        skinTonesDisabled
                        searchPlaceHolder="Search emoji"
                    />
                </div>
            )}
        </div>
    );
}

function DealPickerButton({ onPick }: { onPick: (d: Deal) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
        if (!open) return;
        setTimeout(() => inputRef.current?.focus(), 50);
        loadResults('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => loadResults(search), 200);
        return () => clearTimeout(t);
    }, [search, open]);

    async function loadResults(q: string) {
        setLoading(true);
        try {
            const res = await axios.get(route('crm.inbox.search-deals'), { params: { q } });
            setResults(res.data);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div ref={wrapperRef} className="relative">
            <ComposerToolbarButton
                onClick={() => setOpen((o) => !o)}
                icon={<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>}
                label="Add deal"
            />
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="p-2 border-b border-[#E4E7EB]">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search deals..."
                            className="w-full h-8 px-2.5 text-xs bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded-md focus:outline-none focus:bg-white focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {loading ? (
                            <div className="px-3 py-6 text-center text-xs text-[#8B9096]">Loading…</div>
                        ) : results.length === 0 ? (
                            <div className="px-3 py-6 text-center text-xs text-[#8B9096]">
                                {search ? 'No deals match' : 'No deals yet'}
                            </div>
                        ) : (
                            results.map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => { onPick(d); setOpen(false); }}
                                    className="w-full flex items-start gap-2.5 px-2.5 py-2 hover:bg-[#F3F4F6] transition-colors text-left"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-medium text-[#111315] truncate leading-tight">{d.title}</p>
                                        {d.property_address && <p className="text-[11px] text-[#8B9096] truncate leading-tight">{d.property_address}</p>}
                                        <div className="flex items-center gap-2 text-[10px] text-[#5F656D] mt-0.5">
                                            {d.value && <span className="font-semibold text-[#059669]">${Number(d.value).toLocaleString()}</span>}
                                            {d.stage && <span>{d.stage}</span>}
                                        </div>
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

function ComposerToolbarButton({ onClick, disabled, icon, label }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-[#5F656D] hover:text-[#111315] bg-white border border-[#E4E7EB] rounded-full hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}

function ListingPickerButton({ onPick }: { onPick: (l: Listing) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
        if (!open) return;
        setTimeout(() => inputRef.current?.focus(), 50);
        loadResults('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => loadResults(search), 200);
        return () => clearTimeout(t);
    }, [search, open]);

    async function loadResults(q: string) {
        setLoading(true);
        try {
            const res = await axios.get(route('crm.inbox.search-listings'), { params: { q } });
            setResults(res.data);
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div ref={wrapperRef} className="relative">
            <ComposerToolbarButton
                onClick={() => setOpen((o) => !o)}
                icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045c.439-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                }
                label="Add listing"
            />
            {open && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="p-2 border-b border-[#E4E7EB]">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search listings by address, city, MLS#..."
                            className="w-full h-8 px-2.5 text-xs bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded-md focus:outline-none focus:bg-white focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]"
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                        {loading ? (
                            <div className="px-3 py-6 text-center text-xs text-[#8B9096]">Loading…</div>
                        ) : results.length === 0 ? (
                            <div className="px-3 py-6 text-center text-xs text-[#8B9096]">
                                {search ? 'No listings match' : 'No listings yet'}
                            </div>
                        ) : (
                            results.map((l) => (
                                <button
                                    key={l.id}
                                    type="button"
                                    onClick={() => { onPick(l); setOpen(false); }}
                                    className="w-full flex items-start gap-2.5 px-2.5 py-2 hover:bg-[#F3F4F6] transition-colors text-left"
                                >
                                    {l.photo ? (
                                        <img src={l.photo} alt="" className="shrink-0 h-10 w-12 rounded-md object-cover bg-[#F3F4F6]" />
                                    ) : (
                                        <div className="shrink-0 h-10 w-12 rounded-md bg-[#F3F4F6] flex items-center justify-center">
                                            <svg className="h-4 w-4 text-[#C4C9D1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045c.439-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-medium text-[#111315] truncate leading-tight">
                                            {l.address || l.title || `Listing #${l.id}`}
                                        </p>
                                        <p className="text-[11px] text-[#8B9096] truncate leading-tight">
                                            {[l.city, l.state_province].filter(Boolean).join(', ')}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-[#5F656D] mt-0.5">
                                            {l.price && <span className="font-semibold text-[#059669]">${Number(l.price).toLocaleString()}</span>}
                                            {l.bedrooms && <span>{l.bedrooms}bd</span>}
                                            {l.bathrooms && <span>{l.bathrooms}ba</span>}
                                            {l.sqft && <span>{l.sqft.toLocaleString()}sf</span>}
                                        </div>
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
