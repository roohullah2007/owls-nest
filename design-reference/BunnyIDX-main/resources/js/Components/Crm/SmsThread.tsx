import { useEffect, useRef, useState } from 'react';
import SmsConsentBadge from './SmsConsentBadge';
import SmsOptInModal from './SmsOptInModal';
import { formatPhone } from '@/utils/phone';
import type { SmsMessage } from '@/types';

interface ContactInfo {
    id: number;
    uuid: string;
    name: string;
    phone: string | null;
    mobile: string | null;
    sms_consent: boolean;
    sms_opted_out: boolean;
}

interface Props {
    contactId: number;
    contactUuid: string;
    contactPhone: string | null;
    contactMobile: string | null;
    contactName: string;
    smsConsent: boolean;
    smsOptedOut: boolean;
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// GSM-7 basic character set (plus extension table chars)
const GSM_BASIC_CHARS = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ!"#¤%&'()*+,\-.\/0-9:;<=>?¡A-ZÄÖÑÜa-zäöñüà\^{}\[~\]|€\r\n\\]*$/;

function isGsm7(text: string): boolean {
    return GSM_BASIC_CHARS.test(text);
}

function getSegmentInfo(text: string): { charCount: number; segmentCount: number; encoding: string; charsPerSegment: number } {
    const charCount = text.length;
    if (charCount === 0) return { charCount: 0, segmentCount: 0, encoding: 'GSM-7', charsPerSegment: 160 };

    const gsm = isGsm7(text);
    const encoding = gsm ? 'GSM-7' : 'UCS-2';

    let charsPerSegment: number;
    if (gsm) {
        charsPerSegment = charCount <= 160 ? 160 : 153;
    } else {
        charsPerSegment = charCount <= 70 ? 70 : 67;
    }

    const segmentCount = Math.ceil(charCount / charsPerSegment);

    return { charCount, segmentCount, encoding, charsPerSegment };
}

export default function SmsThread({ contactId, contactUuid, contactPhone, contactMobile, contactName, smsConsent, smsOptedOut }: Props) {
    const [messages, setMessages] = useState<SmsMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [consent, setConsent] = useState(smsConsent);
    const [optedOut, setOptedOut] = useState(smsOptedOut);
    const [updatingConsent, setUpdatingConsent] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const toNumber = contactMobile || contactPhone || '';

    useEffect(() => {
        loadThread();
    }, [contactId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Listen for real-time SMS via Echo
    useEffect(() => {
        if (typeof window.Echo === 'undefined') return;

        const channel = window.Echo.private(`user.${(window as any).__userId || ''}`);
        const handler = (e: any) => {
            const sms = e.sms_message;
            if (sms && sms.contact_id === contactId) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === sms.id)) return prev;
                    return [...prev, sms];
                });
            }
        };

        channel.listen('.NewSmsMessage', handler);

        return () => {
            channel.stopListening('.NewSmsMessage', handler);
        };
    }, [contactId]);

    const loadThread = async () => {
        setLoading(true);
        try {
            const res = await fetch(route('crm.sms.thread', { contact: contactUuid }));
            const data = await res.json();
            setMessages(data.messages || []);
            if (data.contact) {
                setConsent(data.contact.sms_consent);
                setOptedOut(data.contact.sms_opted_out);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const sendMessage = async () => {
        if (!body.trim() || !toNumber || sending) return;
        setSending(true);

        try {
            const res = await fetch(route('crm.sms.send'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({
                    contact_id: contactId,
                    to_number: toNumber,
                    body: body.trim(),
                }),
            });

            const data = await res.json();
            if (res.ok && data.message) {
                setMessages((prev) => [...prev, data.message]);
                setBody('');
            } else {
                alert(data.error || 'Failed to send SMS.');
            }
        } catch {
            alert('Failed to send SMS.');
        } finally {
            setSending(false);
        }
    };

    const revokeConsent = async () => {
        setUpdatingConsent(true);
        try {
            const res = await fetch(route('crm.sms.consent', { contact: contactUuid }), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
                },
                body: JSON.stringify({ sms_consent: false }),
            });
            if (res.ok) {
                setConsent(false);
            }
        } catch {
            // ignore
        } finally {
            setUpdatingConsent(false);
        }
    };

    const handleConsentClick = () => {
        if (consent) {
            revokeConsent();
        } else {
            setShowConsentModal(true);
        }
    };

    const handleConsentGranted = () => {
        setConsent(true);
        setOptedOut(false);
        setShowConsentModal(false);
    };

    const seg = getSegmentInfo(body);

    if (!toNumber) {
        return (
            <div className="text-center py-8">
                <p className="text-xs text-[#8B9096]">No phone number on file for this contact.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E4E7EB]">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#1693C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#111315]">SMS</span>
                </div>
                <div className="flex items-center gap-2">
                    <SmsConsentBadge consent={consent} optedOut={optedOut} />
                    <button
                        onClick={handleConsentClick}
                        disabled={updatingConsent}
                        className="text-[10px] text-[#1693C9] hover:underline disabled:opacity-50"
                    >
                        {consent ? 'Revoke' : 'Grant'} Consent
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block w-5 h-5 border-2 border-[#E4E7EB] border-t-[#1693C9] rounded-full animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-xs text-[#8B9096]">No messages yet. Send the first text.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] px-3 py-2 rounded-xl ${
                                    msg.direction === 'outbound'
                                        ? 'bg-[#1693C9] text-white'
                                        : 'bg-[#F3F4F6] text-[#111315]'
                                }`}
                            >
                                <p className="text-[13px] whitespace-pre-wrap break-words">{msg.body}</p>
                                <div className={`flex items-center gap-1.5 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                                    <span className={`text-[10px] ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-[#8B9096]'}`}>
                                        {formatTime(msg.created_at)}
                                    </span>
                                    {msg.direction === 'outbound' && (
                                        <span className={`text-[10px] ${msg.status === 'delivered' ? 'text-blue-200' : msg.status === 'failed' ? 'text-red-300' : 'text-blue-300'}`}>
                                            {msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : msg.status === 'failed' ? '✗' : '◌'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Composer */}
            {!consent || optedOut ? (
                <div className="px-4 py-3 border-t border-[#E4E7EB] bg-[#FEF2F2]">
                    <p className="text-xs text-[#DC2626]">
                        {optedOut
                            ? 'This contact has opted out of SMS.'
                            : 'SMS consent required. Grant consent above before sending messages.'}
                    </p>
                </div>
            ) : (
                <div className="px-4 py-3 border-t border-[#E4E7EB]">
                    <div className="flex gap-2">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            placeholder="Type a message..."
                            rows={2}
                            className="flex-1 px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                            maxLength={1600}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!body.trim() || sending}
                            className="self-end h-9 px-4 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                        >
                            {sending ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-[#8B9096]">
                            {seg.charCount}/{seg.charsPerSegment * seg.segmentCount || seg.charsPerSegment} · {seg.segmentCount || 1} segment{seg.segmentCount !== 1 ? 's' : ''}{seg.charCount > 0 && !isGsm7(body) ? ' · UCS-2' : ''}
                        </span>
                        <span className="text-[10px] text-[#8B9096]">Enter to send, Shift+Enter for new line</span>
                    </div>
                </div>
            )}

            {/* SMS Consent Modal */}
            {showConsentModal && (
                <SmsOptInModal
                    contactName={contactName}
                    contactUuid={contactUuid}
                    onConsent={handleConsentGranted}
                    onClose={() => setShowConsentModal(false)}
                />
            )}
        </div>
    );
}
