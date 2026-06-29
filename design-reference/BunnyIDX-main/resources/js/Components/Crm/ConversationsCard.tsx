import { useCallback, useEffect, useRef, useState } from 'react';
import { TeamChatMessage } from '@/types';

interface Props {
    contactId?: number;
    dealId?: number;
    listingId?: number;
}

const avatarColors = ['#1693C9', '#7C3AED', '#DB2777', '#D97706', '#0891B2', '#4F46E5', '#059669', '#DC2626'];

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function stripMentions(body: string): string {
    return body.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1');
}

function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
}

export default function ConversationsCard({ contactId, dealId, listingId }: Props) {
    const [messages, setMessages] = useState<TeamChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';

    const params = new URLSearchParams();
    if (contactId) params.set('contact_id', String(contactId));
    if (dealId) params.set('deal_id', String(dealId));
    if (listingId) params.set('listing_id', String(listingId));
    const queryString = params.toString();

    const loadMessages = useCallback(() => {
        if (!queryString) return;
        fetch(`/crm/team-chat/context?${queryString}`, { headers: { Accept: 'application/json' } })
            .then(r => r.json())
            .then(data => setMessages(data.messages || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [queryString]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    async function handleSend() {
        if (!input.trim() || sending) return;
        setSending(true);
        try {
            const body: Record<string, any> = { body: input };
            if (contactId) body.contact_id = contactId;
            if (dealId) body.deal_id = dealId;
            if (listingId) body.listing_id = listingId;

            const res = await fetch('/crm/team-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    Accept: 'application/json',
                    'X-Socket-ID': (window as any).Echo?.socketId?.() || '',
                },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.message) {
                setMessages(prev => [...prev, data.message]);
                setInput('');
            }
        } catch {}
        finally { setSending(false); }
    }

    const visibleMessages = expanded ? messages : messages.slice(-3);
    const hasAttachments = (msg: TeamChatMessage) => msg.attachments?.length > 0;
    const isSticker = (body: string) => /^sticker:[a-z0-9_-]+$/.test(body);

    return (
        <div className="border border-[#E4E7EB] bg-white rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Conversations</p>
                {messages.length > 3 && (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="text-[10px] text-[#7C3AED] hover:text-[#6D28D9] font-medium transition-colors"
                    >
                        {expanded ? 'Show less' : `Show all (${messages.length})`}
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-4">
                    <div className="animate-spin h-4 w-4 border-2 border-[#E4E7EB] border-t-[#7C3AED] rounded-full" />
                </div>
            ) : messages.length === 0 ? (
                <p className="text-xs text-[#C4C9D1] mb-3">No team conversations yet</p>
            ) : (
                <div className="space-y-2 mb-3">
                    {visibleMessages.map(msg => {
                        const color = msg.is_ai_response ? '#8B5CF6' : avatarColors[(msg.user_id ?? 0) % avatarColors.length];
                        const body = msg.body || '';
                        const displayBody = isSticker(body) ? '[Sticker]' : truncate(stripMentions(body), 100);

                        return (
                            <div key={msg.id} className="flex items-start gap-2">
                                <div
                                    className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full text-white text-[9px] font-bold"
                                    style={{ backgroundColor: color }}
                                >
                                    {msg.is_ai_response ? 'AI' : (msg.user?.name?.charAt(0).toUpperCase() || '?')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-[11px] font-semibold text-[#111315]">
                                            {msg.is_ai_response ? 'BunnyAI' : (msg.user?.name || 'Unknown')}
                                        </span>
                                        <span className="text-[10px] text-[#8B9096]">{formatTime(msg.created_at)}</span>
                                    </div>
                                    {displayBody && (
                                        <p className="text-xs text-[#5F656D] leading-relaxed break-words">{displayBody}</p>
                                    )}
                                    {hasAttachments(msg) && (
                                        <span className="text-[10px] text-[#8B9096]">
                                            {msg.attachments.some(a => a.is_audio) ? '🎤 Voice message' :
                                             msg.attachments.some(a => a.is_image) ? '📷 Image' : '📎 Attachment'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Inline compose */}
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Send a message..."
                    className="flex-1 h-8 px-3 text-xs border border-[#E4E7EB] rounded-lg bg-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#7C3AED] focus:border-[#7C3AED] placeholder:text-[#8B9096]"
                />
                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-30 transition-colors shrink-0"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
