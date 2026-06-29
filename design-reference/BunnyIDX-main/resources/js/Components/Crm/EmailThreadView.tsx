import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { EmailMessageType, EmailAccount } from '@/types';

interface Props {
    threadId: number;
    subject: string | null;
    accounts: EmailAccount[];
    activeAccountId: number;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function EmailThreadView({ threadId, subject, accounts, activeAccountId }: Props) {
    const [messages, setMessages] = useState<EmailMessageType[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyBody, setReplyBody] = useState('');
    const [sending, setSending] = useState(false);
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [showQuoted, setShowQuoted] = useState<Set<number>>(new Set());
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLoading(true);
        setMessages([]);
        setReplyBody('');
        setExpanded(new Set());

        axios.get(route('crm.email.thread', threadId))
            .then((res) => {
                const msgs = res.data.messages ?? [];
                setMessages(msgs);
                // Expand the last message by default
                if (msgs.length > 0) {
                    setExpanded(new Set([msgs[msgs.length - 1].id]));
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [threadId]);

    useEffect(() => {
        if (!loading && messages.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [loading, messages.length]);

    const handleReply = async () => {
        if (!replyBody.trim() || sending) return;

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) return;

        const replyTo = lastMessage.direction === 'inbound' ? lastMessage.from_address : lastMessage.to_addresses[0];

        setSending(true);
        try {
            const res = await axios.post(route('crm.email.send'), {
                email_account_id: activeAccountId,
                to: replyTo,
                subject: subject?.startsWith('Re: ') ? subject : `Re: ${subject || ''}`,
                body_html: replyBody.replace(/\n/g, '<br>'),
                in_reply_to: lastMessage.gmail_message_id,
                thread_id: lastMessage.gmail_message_id ? undefined : undefined,
                contact_id: lastMessage.contact_id,
            });

            if (res.data.email_message) {
                setMessages((prev) => [...prev, res.data.email_message]);
                setExpanded((prev) => new Set([...prev, res.data.email_message.id]));
            }
            setReplyBody('');
        } catch {
            // Error handled silently
        } finally {
            setSending(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleQuoted = (id: number) => {
        setShowQuoted((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-[#7C36EE] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Thread header */}
            <div className="px-4 py-3 border-b border-[#E4E7EB] shrink-0">
                <h2 className="text-sm font-semibold text-[#111315] truncate">
                    {subject || '(no subject)'}
                </h2>
                <p className="text-[11px] text-[#8B9096] mt-0.5">
                    {messages.length} message{messages.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                    const isExpanded = expanded.has(msg.id);
                    const isOutbound = msg.direction === 'outbound';

                    return (
                        <div
                            key={msg.id}
                            className={`border rounded-lg ${isOutbound ? 'border-[#E8E0F7] bg-[#FDFBFF]' : 'border-[#E4E7EB] bg-white'}`}
                        >
                            {/* Message header — always visible */}
                            <button
                                onClick={() => toggleExpand(msg.id)}
                                className="w-full text-left px-4 py-2.5 flex items-center justify-between gap-2"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-semibold shrink-0 ${isOutbound ? 'bg-[#7C36EE]' : 'bg-[#5F656D]'}`}>
                                        {(msg.from_name || msg.from_address).charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-[#111315] truncate">
                                            {msg.from_name || msg.from_address}
                                        </p>
                                        <p className="text-[11px] text-[#8B9096] truncate">
                                            to {msg.to_addresses.join(', ')}
                                            {msg.cc_addresses?.length ? `, cc: ${msg.cc_addresses.join(', ')}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {msg.has_attachments && (
                                        <svg className="w-3.5 h-3.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                        </svg>
                                    )}
                                    <span className="text-[10px] text-[#8B9096] whitespace-nowrap">{formatDate(msg.sent_at)}</span>
                                    <svg className={`w-3.5 h-3.5 text-[#8B9096] transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </button>

                            {/* Message body — expanded */}
                            {isExpanded && (
                                <div className="px-4 pb-4 border-t border-[#F3F4F6]">
                                    {(() => {
                                        // Prefer the server-computed (sanitized, quote-split) fields.
                                        // Fall back to raw body for the optimistic outbound message
                                        // appended right after sending, which has no display_* fields.
                                        const mainHtml = msg.display_html ?? (msg.display_text == null ? msg.body_html : null);
                                        const mainText = msg.display_text ?? (msg.display_html == null ? (msg.body_text || msg.snippet) : null);
                                        const quotedHtml = msg.display_quoted_html ?? null;
                                        const quotedText = msg.display_quoted_text ?? null;
                                        const hasQuoted = !!(quotedHtml || quotedText);
                                        const quotedOpen = showQuoted.has(msg.id);

                                        return (
                                            <>
                                                {mainHtml != null ? (
                                                    <div
                                                        className="mt-3 text-sm text-[#111315] prose prose-sm max-w-none [&_img]:max-w-full [&_a]:text-[#7C36EE]"
                                                        dangerouslySetInnerHTML={{ __html: mainHtml }}
                                                    />
                                                ) : (
                                                    <pre className="mt-3 text-sm text-[#111315] whitespace-pre-wrap font-sans">
                                                        {mainText}
                                                    </pre>
                                                )}

                                                {hasQuoted && (
                                                    <div className="mt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleQuoted(msg.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[#5F656D] bg-[#F3F4F6] hover:bg-[#E8EAED] rounded transition-colors"
                                                            title={quotedOpen ? 'Hide quoted text' : 'Show quoted text'}
                                                        >
                                                            <span className="tracking-wider leading-none">···</span>
                                                            {quotedOpen ? 'Hide quoted text' : 'Show quoted text'}
                                                        </button>
                                                        {quotedOpen && (
                                                            quotedHtml != null ? (
                                                                <div
                                                                    className="mt-2 pl-3 border-l-2 border-[#E4E7EB] text-sm text-[#5F656D] prose prose-sm max-w-none [&_img]:max-w-full [&_a]:text-[#7C36EE]"
                                                                    dangerouslySetInnerHTML={{ __html: quotedHtml }}
                                                                />
                                                            ) : (
                                                                <pre className="mt-2 pl-3 border-l-2 border-[#E4E7EB] text-sm text-[#5F656D] whitespace-pre-wrap font-sans">
                                                                    {quotedText}
                                                                </pre>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {/* Attachments */}
                                    {msg.attachments_metadata && msg.attachments_metadata.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {msg.attachments_metadata.map((att, i) => (
                                                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F3F4F6] rounded-md text-xs text-[#5F656D]">
                                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                                    </svg>
                                                    <span className="truncate max-w-[150px]">{att.filename}</span>
                                                    <span className="text-[#8B9096]">({Math.round(att.size / 1024)}KB)</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Reply composer */}
            <div className="border-t border-[#E4E7EB] p-4 shrink-0">
                <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                    className="w-full border border-[#E4E7EB] rounded-lg px-3 py-2 text-sm text-[#111315] placeholder-[#8B9096] resize-none focus:outline-none focus:ring-1 focus:ring-[#7C36EE] focus:border-[#7C36EE]"
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={handleReply}
                        disabled={!replyBody.trim() || sending}
                        className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium text-white bg-[#7C36EE] rounded-md hover:bg-[#6B2CD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        )}
                        Send Reply
                    </button>
                </div>
            </div>
        </div>
    );
}
