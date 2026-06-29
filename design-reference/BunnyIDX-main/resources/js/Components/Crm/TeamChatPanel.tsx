import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ChatAttachment, ChatDeal, ChatListing, TeamChatMessage, TeamMember } from '@/types';
import useTypingIndicator from '@/hooks/useTypingIndicator';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    teamMembers: TeamMember[];
    onUnreadCountChange: (count: number) => void;
    teamId: number;
    currentUserId: number;
}

interface ContactResult {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    uuid: string;
}

interface ListingResult {
    id: number;
    title: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    price: string | null;
    bedrooms: number | null;
    bathrooms: string | null;
    photos: string[] | null;
    mls_number: string | null;
    status: string;
}

interface DealResult {
    id: number;
    title: string;
    value: string | null;
    type: string;
    property_address: string | null;
}

type ActiveChannel = { type: 'team' } | { type: 'dm'; userId: number; userName: string };

const avatarColors = ['#1693C9', '#7C3AED', '#DB2777', '#D97706', '#0891B2', '#4F46E5', '#059669', '#DC2626'];

const STICKERS = [
    { name: 'sold-sign', label: 'Sold!' },
    { name: 'keys-handoff', label: 'Keys' },
    { name: 'champagne-house', label: 'Celebrate' },
    { name: 'high-five', label: 'High Five' },
    { name: 'confetti-house', label: 'Confetti' },
    { name: 'dream-home', label: 'Dream Home' },
    { name: 'for-sale', label: 'For Sale' },
    { name: 'open-house', label: 'Open House' },
    { name: 'under-contract', label: 'Contract' },
    { name: 'price-reduced', label: 'Reduced' },
    { name: 'thumbs-up-house', label: 'Thumbs Up' },
    { name: 'love-it', label: 'Love It' },
    { name: 'thinking', label: 'Thinking' },
    { name: 'great-deal', label: 'Great Deal' },
    { name: 'let-me-check', label: 'Checking' },
    { name: 'mind-blown', label: 'Mind Blown' },
    { name: 'money-eyes', label: 'Money' },
    { name: 'clock-ticking', label: 'Hurry' },
    { name: 'on-fire', label: 'On Fire' },
    { name: 'perfect-10', label: 'Perfect' },
];

function isStickerMessage(body: string): boolean {
    return /^sticker:[a-z0-9_-]+$/.test(body);
}

function getStickerName(body: string): string | null {
    const match = body.match(/^sticker:([a-z0-9_-]+)$/);
    return match ? match[1] : null;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatPrice(price: string | null): string {
    if (!price) return '';
    const num = parseFloat(price);
    if (isNaN(num)) return '';
    return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function truncateText(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
}

function stripMentions(body: string): string {
    return body.replace(/@\[([^\]]+)\]\(\d+\)/g, '@$1');
}

// Auto-linkify URLs in text
function linkifyText(text: string): (string | JSX.Element)[] {
    const urlRegex = /(https?:\/\/[^\s<]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            return (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                    className="text-[#7C3AED] hover:underline break-all">{part}</a>
            );
        }
        // Reset lastIndex since we reuse the regex
        urlRegex.lastIndex = 0;
        return part;
    });
}

// Deterministic waveform bars from filename hash
function generateWaveform(name: string, barCount: number): number[] {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
        hash = ((hash << 5) - hash + i * 7 + 13) | 0;
        const v = Math.abs(hash % 100);
        // Shape: ramp up, peak in middle, taper down
        const pos = i / barCount;
        const envelope = Math.sin(pos * Math.PI) * 0.6 + 0.4;
        bars.push(Math.max(0.15, Math.min(1, (v / 100) * envelope)));
    }
    return bars;
}

function AudioPlayer({ url, name, size }: { url: string; name: string; size: number }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const waveformRef = useRef<HTMLDivElement>(null);
    const bars = useMemo(() => generateWaveform(name, 32), [name]);

    function toggle() {
        const el = audioRef.current;
        if (!el) return;
        if (playing) { el.pause(); setPlaying(false); }
        else { el.play(); setPlaying(true); }
    }

    function handleTimeUpdate() {
        const el = audioRef.current;
        if (!el || !el.duration) return;
        setProgress(el.currentTime / el.duration);
        setCurrentTime(el.currentTime);
    }

    function handleLoadedMetadata() {
        const el = audioRef.current;
        if (el && isFinite(el.duration)) setDuration(el.duration);
    }

    function handleEnded() {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
    }

    function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
        const el = audioRef.current;
        if (!el || !el.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        el.currentTime = pct * el.duration;
        setProgress(pct);
        setCurrentTime(pct * el.duration);
    }

    const formatDur = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const displayTime = playing || currentTime > 0 ? currentTime : duration;

    return (
        <div className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 bg-[#F9FAFB] border border-[#E4E7EB] rounded-2xl min-w-[220px] max-w-[280px]">
            <audio ref={audioRef} src={url} preload="metadata"
                onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} />
            <button type="button" onClick={toggle}
                className={`flex items-center justify-center h-9 w-9 rounded-full shrink-0 transition-colors ${
                    playing ? 'bg-[#111315] text-white' : 'bg-[#5F656D] text-white hover:bg-[#111315]'
                }`}>
                {playing ? (
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                ) : (
                    <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
            </button>
            <div className="flex-1 min-w-0">
                <div
                    ref={waveformRef}
                    className="flex items-center gap-[2px] h-7 cursor-pointer"
                    onClick={handleSeek}
                >
                    {bars.map((h, i) => {
                        const barProgress = i / bars.length;
                        const isPlayed = barProgress < progress;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-colors duration-150 ${
                                    isPlayed ? 'bg-[#111315]' : 'bg-[#D1D5DB]'
                                }`}
                                style={{
                                    height: `${Math.round(h * 100)}%`,
                                    minHeight: '3px',
                                    minWidth: '2px',
                                }}
                            />
                        );
                    })}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[10px] text-[#5F656D] tabular-nums">{displayTime > 0 ? formatDur(displayTime) : '0:00'}</span>
                    <div className="flex items-center gap-1">
                        <svg className="h-2.5 w-2.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                        <span className="text-[10px] text-[#8B9096]">{formatFileSize(size)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TeamChatPanel({ isOpen, onClose, teamName, teamMembers, onUnreadCountChange, teamId, currentUserId }: Props) {
    const [messages, setMessages] = useState<TeamChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasOlderMessages, setHasOlderMessages] = useState(true);

    // Contact attach
    const [selectedContact, setSelectedContact] = useState<ContactResult | null>(null);
    const [contactSearch, setContactSearch] = useState('');
    const [contactResults, setContactResults] = useState<ContactResult[]>([]);
    const [showContactPicker, setShowContactPicker] = useState(false);

    // Listing attach
    const [selectedListing, setSelectedListing] = useState<ListingResult | null>(null);
    const [listingSearch, setListingSearch] = useState('');
    const [listingResults, setListingResults] = useState<ListingResult[]>([]);
    const [showListingPicker, setShowListingPicker] = useState(false);

    // Deal attach
    const [selectedDeal, setSelectedDeal] = useState<DealResult | null>(null);
    const [dealSearch, setDealSearch] = useState('');
    const [dealResults, setDealResults] = useState<DealResult[]>([]);
    const [showDealPicker, setShowDealPicker] = useState(false);

    // DM channels
    const [activeChannel, setActiveChannel] = useState<ActiveChannel>({ type: 'team' });

    // Voice recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Mention
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStart, setMentionStart] = useState<number | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);

    // Files
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);

    // Reply
    const [replyTo, setReplyTo] = useState<TeamChatMessage | null>(null);

    // Edit
    const [editingMsg, setEditingMsg] = useState<TeamChatMessage | null>(null);
    const [editInput, setEditInput] = useState('');

    // Context menu
    const [contextMenuMsg, setContextMenuMsg] = useState<number | null>(null);

    // Attach menu (+ button)
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    // Unified Emoji & Sticker picker
    const [showPicker, setShowPicker] = useState(false);
    const [pickerTab, setPickerTab] = useState<'emoji' | 'stickers'>('emoji');
    const pickerRef = useRef<HTMLDivElement>(null);

    // AI typing indicator
    const [aiThinking, setAiThinking] = useState(false);

    // Swipe state
    const [swipingMsgId, setSwipingMsgId] = useState<number | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

    // Image lightbox
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Scroll state
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    // WebSocket
    const [wsConnected, setWsConnected] = useState(false);

    // Ref to track unread for WS listener (avoids stale closure)
    const unreadRef = useRef(0);

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const editInputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const contactPickerRef = useRef<HTMLDivElement>(null);
    const listingPickerRef = useRef<HTMLDivElement>(null);
    const dealPickerRef = useRef<HTMLDivElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const attachMenuRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const objectUrlsRef = useRef<string[]>([]);
    const lastSeenKey = activeChannel.type === 'dm'
        ? `teamchat_dm_${activeChannel.userId}_last_seen`
        : 'teamchat_last_seen';

    // Touch tracking refs
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchMsgId = useRef<number | null>(null);
    const isHorizontalSwipe = useRef(false);
    const swipeLocked = useRef(false);

    const { sendTyping, typingText } = useTypingIndicator(teamId, currentUserId);

    const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';

    const isNearBottom = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return true;
        return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    }, []);

    const scrollToBottom = useCallback((smooth = true) => {
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'instant',
            });
        });
    }, []);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // ── Scroll tracking for scroll-to-bottom button ──
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        function handleScroll() {
            setShowScrollBtn(!isNearBottom());
        }
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [isNearBottom]);

    // ── Close pickers on outside click / Escape ──
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (showContactPicker && contactPickerRef.current && !contactPickerRef.current.contains(e.target as Node)) {
                setShowContactPicker(false);
            }
            if (showListingPicker && listingPickerRef.current && !listingPickerRef.current.contains(e.target as Node)) {
                setShowListingPicker(false);
            }
            if (showDealPicker && dealPickerRef.current && !dealPickerRef.current.contains(e.target as Node)) {
                setShowDealPicker(false);
            }
            if (contextMenuMsg !== null && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenuMsg(null);
            }
            if (showAttachMenu && attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
                setShowAttachMenu(false);
            }
            if (showPicker && pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false);
            }
        }
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setShowContactPicker(false);
                setShowListingPicker(false);
                setShowDealPicker(false);
                setContextMenuMsg(null);
                setShowAttachMenu(false);
                setShowPicker(false);
                setReactionPickerMsg(null);
                if (lightboxUrl) { setLightboxUrl(null); e.preventDefault(); }
            }
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showContactPicker, showListingPicker, showDealPicker, contextMenuMsg, lightboxUrl, showAttachMenu, showPicker]);

    // ── WebSocket listeners ──
    useEffect(() => {
        if (!teamId || !window.Echo) return;
        const channel = window.Echo.private(`team.${teamId}`);

        channel.listen('.App\\Events\\NewChatMessage', (data: { message: TeamChatMessage }) => {
            setWsConnected(true);
            if (data.message.is_ai_response) setAiThinking(false);

            // Filter: only add message if it belongs to active channel
            const msg = data.message;
            const belongsToChannel = (() => {
                if (activeChannel.type === 'team') {
                    return !msg.recipient_id;
                }
                // DM channel: message between me and the other user
                return (msg.user_id === currentUserId && msg.recipient_id === activeChannel.userId)
                    || (msg.user_id === activeChannel.userId && msg.recipient_id === currentUserId);
            })();

            if (belongsToChannel) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            }

            const newId = msg.id;
            if (isOpen && belongsToChannel) {
                localStorage.setItem(lastSeenKey, String(newId));
                if (isNearBottom()) scrollToBottom();
            } else if (!isOpen && !msg.recipient_id) {
                // Only count team-wide messages as unread for the badge
                const teamLastSeen = parseInt(localStorage.getItem('teamchat_last_seen') || '0');
                if (newId > teamLastSeen) {
                    unreadRef.current += 1;
                    onUnreadCountChange(unreadRef.current);
                }
            }
        });

        channel.listen('.App\\Events\\ChatMessageUpdated', (data: { message: { id: number; body: string; edited_at: string; reactions: Record<string, number[]> | null } }) => {
            setMessages((prev) => prev.map((m) =>
                m.id === data.message.id
                    ? { ...m, body: data.message.body, edited_at: data.message.edited_at, reactions: data.message.reactions }
                    : m
            ));
        });

        channel.listen('.App\\Events\\ChatMessageDeleted', (data: { message_id: number }) => {
            setMessages((prev) => prev.filter((m) => m.id !== data.message_id));
        });

        channel.subscribed(() => setWsConnected(true));

        return () => {
            channel.stopListening('.App\\Events\\NewChatMessage');
            channel.stopListening('.App\\Events\\ChatMessageUpdated');
            channel.stopListening('.App\\Events\\ChatMessageDeleted');
        };
    }, [teamId, isOpen, scrollToBottom, isNearBottom, onUnreadCountChange]);

    // Build channel query string
    const channelParams = activeChannel.type === 'dm' ? `recipient_id=${activeChannel.userId}` : '';

    // ── Load messages on open or channel change ──
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setHasOlderMessages(true);
        const qs = channelParams ? `?${channelParams}` : '';
        fetch(`/crm/team-chat${qs}`, { headers: { Accept: 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const msgs = data.messages || [];
                setMessages(msgs);
                if (msgs.length < 50) setHasOlderMessages(false);
                const lastId = msgs.at(-1)?.id;
                if (lastId) localStorage.setItem(lastSeenKey, String(lastId));
                if (activeChannel.type === 'team') {
                    unreadRef.current = 0;
                    onUnreadCountChange(0);
                }
            })
            .catch(() => {})
            .finally(() => { setLoading(false); setTimeout(() => scrollToBottom(false), 50); });
    }, [isOpen, activeChannel]);

    // ── Load older messages (infinite scroll up) ──
    const loadOlderMessages = useCallback(() => {
        if (loadingOlder || !hasOlderMessages || messages.length === 0) return;
        const firstId = messages[0]?.id;
        if (!firstId) return;
        setLoadingOlder(true);

        const el = scrollRef.current;
        const prevScrollHeight = el?.scrollHeight || 0;

        const qs = channelParams ? `&${channelParams}` : '';
        fetch(`/crm/team-chat?before=${firstId}${qs}`, { headers: { Accept: 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const olderMsgs: TeamChatMessage[] = data.messages || [];
                if (olderMsgs.length < 50) setHasOlderMessages(false);
                if (olderMsgs.length > 0) {
                    setMessages(prev => [...olderMsgs, ...prev]);
                    // Maintain scroll position
                    requestAnimationFrame(() => {
                        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
                    });
                }
            })
            .catch(() => {})
            .finally(() => setLoadingOlder(false));
    }, [loadingOlder, hasOlderMessages, messages]);

    // ── Scroll-up detection for loading older ──
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !isOpen) return;
        function handleScroll() {
            if (el!.scrollTop < 50 && !loadingOlder && hasOlderMessages && messages.length > 0) {
                loadOlderMessages();
            }
        }
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => el.removeEventListener('scroll', handleScroll);
    }, [isOpen, loadOlderMessages, loadingOlder, hasOlderMessages, messages.length]);

    // ── Polling (reduced when WS is active) ──
    useEffect(() => {
        if (!isOpen) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            return;
        }
        const interval = wsConnected ? 30000 : 5000;
        pollingRef.current = setInterval(() => {
            const lastId = messages.at(-1)?.id || 0;
            const qs = channelParams ? `&${channelParams}` : '';
            fetch(`/crm/team-chat?after=${lastId}${qs}`, { headers: { Accept: 'application/json' } })
                .then(r => r.json())
                .then(data => {
                    if (data.messages?.length > 0) {
                        if (data.messages.some((m: TeamChatMessage) => m.is_ai_response)) setAiThinking(false);
                        setMessages(prev => {
                            const ids = new Set(prev.map(m => m.id));
                            const newMsgs = data.messages.filter((m: TeamChatMessage) => !ids.has(m.id));
                            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev;
                        });
                        const newLastId = data.messages.at(-1)?.id;
                        if (newLastId) localStorage.setItem(lastSeenKey, String(newLastId));
                        if (isNearBottom()) scrollToBottom();
                    }
                })
                .catch(() => {});
        }, interval);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [isOpen, messages, wsConnected, isNearBottom, scrollToBottom]);

    // ── Unread check when closed (lightweight latestId) ──
    useEffect(() => {
        if (isOpen) return;
        const check = setInterval(() => {
            fetch('/crm/team-chat/latest-id', { headers: { Accept: 'application/json' } })
                .then(r => r.json())
                .then(data => {
                    const latestId = data.latest_id ?? 0;
                    const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || '0');
                    const diff = Math.max(0, latestId - lastSeen);
                    onUnreadCountChange(diff);
                })
                .catch(() => {});
        }, 15000);
        return () => clearInterval(check);
    }, [isOpen, onUnreadCountChange]);

    // ── Contact search (loads recent on open, searches on type) ──
    useEffect(() => {
        if (!showContactPicker) return;
        const t = setTimeout(() => {
            fetch(`/crm/team-chat/contacts?q=${encodeURIComponent(contactSearch)}`, { headers: { Accept: 'application/json' } })
                .then(r => r.json()).then(d => setContactResults(d.contacts || [])).catch(() => {});
        }, contactSearch.trim() ? 300 : 0);
        return () => clearTimeout(t);
    }, [contactSearch, showContactPicker]);

    // ── Listing search (loads recent on open, searches on type) ──
    useEffect(() => {
        if (!showListingPicker) return;
        const t = setTimeout(() => {
            fetch(`/crm/team-chat/listings?q=${encodeURIComponent(listingSearch)}`, { headers: { Accept: 'application/json' } })
                .then(r => r.json()).then(d => setListingResults(d.listings || [])).catch(() => {});
        }, listingSearch.trim() ? 300 : 0);
        return () => clearTimeout(t);
    }, [listingSearch, showListingPicker]);

    // ── Deal search (loads recent on open, searches on type) ──
    useEffect(() => {
        if (!showDealPicker) return;
        const t = setTimeout(() => {
            fetch(`/crm/team-chat/deals?q=${encodeURIComponent(dealSearch)}`, { headers: { Accept: 'application/json' } })
                .then(r => r.json()).then(d => setDealResults(d.deals || [])).catch(() => {});
        }, dealSearch.trim() ? 300 : 0);
        return () => clearTimeout(t);
    }, [dealSearch, showDealPicker]);

    // ── Textarea auto-resize ──
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 96) + 'px';
    }, [input]);

    // ── Touch handlers for swipe-to-reply ──
    function handleTouchStart(e: React.TouchEvent, msgId: number) {
        const touch = e.touches[0];
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        touchMsgId.current = msgId;
        isHorizontalSwipe.current = false;
        swipeLocked.current = false;
    }

    function handleTouchMove(e: React.TouchEvent) {
        if (touchMsgId.current === null) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX.current;
        const dy = touch.clientY - touchStartY.current;

        if (!swipeLocked.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            swipeLocked.current = true;
            isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy);
        }

        if (!isHorizontalSwipe.current) return;

        const offset = Math.max(0, Math.min(dx, 80));
        if (offset > 0) {
            e.preventDefault();
            setSwipingMsgId(touchMsgId.current);
            setSwipeOffset(offset);
        }
    }

    function handleTouchEnd() {
        if (swipeOffset > 50 && touchMsgId.current !== null) {
            const msg = messages.find(m => m.id === touchMsgId.current);
            if (msg) {
                setReplyTo(msg);
                inputRef.current?.focus();
            }
        }
        setSwipingMsgId(null);
        setSwipeOffset(0);
        touchMsgId.current = null;
    }

    // ── File handling ──
    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE);
        setPendingFiles(prev => [...prev, ...validFiles].slice(0, MAX_FILES));
        e.target.value = '';
    }

    function removeFile(index: number) {
        setPendingFiles(prev => {
            const removed = prev[index];
            // Revoke object URL for this file if it exists
            const url = objectUrlsRef.current.find(u => u.includes(removed?.name || ''));
            if (url) URL.revokeObjectURL(url);
            return prev.filter((_, i) => i !== index);
        });
    }

    // ── Send message ──
    async function handleSend() {
        if ((!input.trim() && pendingFiles.length === 0 && !selectedListing) || sending) return;
        setSending(true);

        const mentionMatches = [...input.matchAll(/@\[([^\]]+)\]\((\d+)\)/g)];
        const mentionIds = mentionMatches.map(m => parseInt(m[2]));
        const recipientId = activeChannel.type === 'dm' ? activeChannel.userId : null;

        try {
            let res: Response;

            if (pendingFiles.length > 0) {
                const formData = new FormData();
                formData.append('body', input);
                if (mentionIds.length > 0) mentionIds.forEach((id, i) => formData.append(`mentions[${i}]`, String(id)));
                if (selectedContact?.id) formData.append('contact_id', String(selectedContact.id));
                if (replyTo) formData.append('reply_to_id', String(replyTo.id));
                if (selectedListing) formData.append('listing_id', String(selectedListing.id));
                if (selectedDeal) formData.append('deal_id', String(selectedDeal.id));
                if (recipientId) formData.append('recipient_id', String(recipientId));
                pendingFiles.forEach((file, i) => formData.append(`attachments[${i}]`, file));

                res = await fetch('/crm/team-chat', {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', 'X-Socket-ID': window.Echo?.socketId?.() || '' },
                    body: formData,
                });
            } else {
                res = await fetch('/crm/team-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', 'X-Socket-ID': window.Echo?.socketId?.() || '' },
                    body: JSON.stringify({
                        body: input,
                        mentions: mentionIds.length > 0 ? mentionIds : null,
                        contact_id: selectedContact?.id || null,
                        reply_to_id: replyTo?.id || null,
                        listing_id: selectedListing?.id || null,
                        deal_id: selectedDeal?.id || null,
                        recipient_id: recipientId,
                    }),
                });
            }

            const data = await res.json();
            if (data.message) {
                setMessages(prev => [...prev, data.message]);
                localStorage.setItem(lastSeenKey, String(data.message.id));
                const wasAiTrigger = /^(@BunnyAI|\/ai)\s+/i.test(input);
                setInput('');
                setSelectedContact(null);
                setSelectedListing(null);
                setSelectedDeal(null);
                setPendingFiles([]);
                setReplyTo(null);
                scrollToBottom();
                if (wasAiTrigger) setAiThinking(true);
            }
        } catch {}
        finally { setSending(false); }
    }

    // ── Edit message ──
    async function handleEditSave() {
        if (!editingMsg || !editInput.trim()) return;
        try {
            const res = await fetch(`/crm/team-chat/${editingMsg.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', 'X-Socket-ID': window.Echo?.socketId?.() || '' },
                body: JSON.stringify({ body: editInput }),
            });
            const data = await res.json();
            if (data.message) {
                setMessages(prev => prev.map(m => m.id === data.message.id ? data.message : m));
            }
        } catch {}
        setEditingMsg(null);
        setEditInput('');
    }

    // ── Delete message ──
    async function handleDelete(msgId: number) {
        try {
            await fetch(`/crm/team-chat/${msgId}`, {
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', 'X-Socket-ID': window.Echo?.socketId?.() || '' },
            });
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch {}
        setContextMenuMsg(null);
    }

    // ── Reactions ──
    const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🏠', '🔥'];
    const [reactionPickerMsg, setReactionPickerMsg] = useState<number | null>(null);

    async function toggleReaction(msgId: number, emoji: string) {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;
        const reactors = msg.reactions?.[emoji] ?? [];
        const hasReacted = reactors.includes(currentUserId);
        const endpoint = hasReacted ? 'unreact' : 'react';

        // Optimistic update
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId) return m;
            const reactions = { ...(m.reactions ?? {}) };
            if (hasReacted) {
                reactions[emoji] = (reactions[emoji] ?? []).filter(uid => uid !== currentUserId);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...(reactions[emoji] ?? []), currentUserId];
            }
            return { ...m, reactions: Object.keys(reactions).length > 0 ? reactions : null };
        }));
        setReactionPickerMsg(null);

        try {
            await fetch(`/crm/team-chat/${msgId}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', 'X-Socket-ID': window.Echo?.socketId?.() || '' },
                body: JSON.stringify({ emoji }),
            });
        } catch {}
    }

    // ── Emoji selection ──
    function handleEmojiClick(emojiData: EmojiClickData) {
        const cursor = inputRef.current?.selectionStart ?? input.length;
        const before = input.slice(0, cursor);
        const after = input.slice(cursor);
        setInput(before + emojiData.emoji + after);
        setShowPicker(false);
        requestAnimationFrame(() => {
            if (inputRef.current) {
                const newPos = cursor + emojiData.emoji.length;
                inputRef.current.selectionStart = newPos;
                inputRef.current.selectionEnd = newPos;
                inputRef.current.focus();
            }
        });
    }

    // ── Send sticker ──
    async function handleSendSticker(stickerName: string) {
        if (sending) return;
        setSending(true);
        setShowPicker(false);
        try {
            const res = await fetch('/crm/team-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', 'X-Socket-ID': window.Echo?.socketId?.() || '' },
                body: JSON.stringify({ body: `sticker:${stickerName}` }),
            });
            const data = await res.json();
            if (data.message) {
                setMessages(prev => [...prev, data.message]);
                localStorage.setItem(lastSeenKey, String(data.message.id));
                scrollToBottom();
            }
        } catch {}
        finally { setSending(false); }
    }

    // ── Voice recording ──
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Prefer audio/webm with opus codec; fall back through options
            const mimeOptions = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', ''];
            const mimeType = mimeOptions.find(m => m === '' || MediaRecorder.isTypeSupported(m)) || '';
            const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);
        } catch {
            // Microphone permission denied or not available
        }
    }

    function cancelRecording() {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.onstop = () => {
                mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.stop();
        }
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
    }

    async function stopAndSendRecording() {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

        return new Promise<void>((resolve) => {
            const recorder = mediaRecorderRef.current!;
            recorder.onstop = async () => {
                recorder.stream?.getTracks().forEach(t => t.stop());
                const actualMime = recorder.mimeType || 'audio/webm';
                const ext = actualMime.includes('webm') ? 'webm' : actualMime.includes('ogg') ? 'ogg' : 'm4a';
                // Force audio/* MIME type so backend detects it correctly
                const audioMime = actualMime.replace(/^video\//, 'audio/');
                const blob = new Blob(audioChunksRef.current, { type: audioMime });
                const file = new File([blob], `voice-message.${ext}`, { type: audioMime });
                audioChunksRef.current = [];
                setIsRecording(false);
                setRecordingTime(0);

                // Send via FormData
                setSending(true);
                const recipientId = activeChannel.type === 'dm' ? activeChannel.userId : null;
                try {
                    const formData = new FormData();
                    formData.append('body', '');
                    formData.append('attachments[0]', file);
                    if (recipientId) formData.append('recipient_id', String(recipientId));

                    const res = await fetch('/crm/team-chat', {
                        method: 'POST',
                        headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json', 'X-Socket-ID': window.Echo?.socketId?.() || '' },
                        body: formData,
                    });
                    const data = await res.json();
                    if (data.message) {
                        setMessages(prev => [...prev, data.message]);
                        localStorage.setItem(lastSeenKey, String(data.message.id));
                        scrollToBottom();
                    }
                } catch {}
                finally { setSending(false); }
                resolve();
            };
            recorder.stop();
        });
    }

    function formatRecordingTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ── Input change with mention detection ──
    function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        const val = e.target.value;
        setInput(val);
        sendTyping();

        const pos = e.target.selectionStart;
        const textBefore = val.slice(0, pos);
        const atIdx = textBefore.lastIndexOf('@');
        if (atIdx >= 0 && (atIdx === 0 || !/\w/.test(textBefore[atIdx - 1]))) {
            const afterAt = textBefore.slice(atIdx + 1);
            if (!afterAt.includes('\n') && !/\s{2,}/.test(afterAt)) {
                setMentionQuery(afterAt);
                setMentionStart(atIdx);
                setShowMentionDropdown(true);
                setMentionIndex(0);
                return;
            }
        }
        setShowMentionDropdown(false);
    }

    function insertMention(member: TeamMember) {
        if (mentionStart === null) return;
        const pos = inputRef.current?.selectionStart || input.length;
        const before = input.slice(0, mentionStart);
        const after = input.slice(pos);
        const mention = `@[${member.user.name}](${member.user.id})`;
        setInput(before + mention + ' ' + after);
        setShowMentionDropdown(false);
        requestAnimationFrame(() => {
            if (inputRef.current) {
                const newPos = before.length + mention.length + 1;
                inputRef.current.selectionStart = newPos;
                inputRef.current.selectionEnd = newPos;
                inputRef.current.focus();
            }
        });
    }

    const filteredMembers = teamMembers.filter(m =>
        m.user.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 6);

    function handleKeyDown(e: React.KeyboardEvent) {
        if (showMentionDropdown && filteredMembers.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => (i + 1) % filteredMembers.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(i => (i - 1 + filteredMembers.length) % filteredMembers.length); return; }
            if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredMembers[mentionIndex]); return; }
            if (e.key === 'Escape') { setShowMentionDropdown(false); return; }
        }
        if (e.key === 'Escape' && replyTo) { setReplyTo(null); return; }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }

    // ── Renderers ──
    function renderMessageBody(body: string) {
        const parts = body.split(/(@\[([^\]]+)\]\(\d+\))/g);
        const result: (string | JSX.Element)[] = [];
        let i = 0;
        while (i < parts.length) {
            const match = /@\[([^\]]+)\]\((\d+)\)/.exec(parts[i]);
            if (match) {
                result.push(
                    <span key={i} className="inline-block bg-[#EDE9FE] text-[#7C3AED] px-1 rounded text-xs font-medium">
                        @{match[1]}
                    </span>
                );
                i += 3;
            } else {
                if (parts[i]) {
                    // Linkify plain text parts
                    const linked = linkifyText(parts[i]);
                    result.push(...linked.map((el, j) =>
                        typeof el === 'string' ? el : { ...el, key: `${i}-${j}` }
                    ));
                }
                i++;
            }
        }
        return result;
    }

    function renderReplyQuote(reply: NonNullable<TeamChatMessage['reply_to']>) {
        const color = avatarColors[reply.user_id % avatarColors.length];
        return (
            <div
                className="mb-1 pl-2 py-1 border-l-2 rounded-r bg-[#F9FAFB] cursor-pointer"
                style={{ borderColor: color }}
                onClick={() => {
                    const el = document.getElementById(`chat-msg-${reply.id}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('bg-[#EDE9FE]/50');
                        setTimeout(() => el.classList.remove('bg-[#EDE9FE]/50'), 1500);
                    }
                }}
            >
                <p className="text-[10px] font-semibold" style={{ color }}>{reply.user?.name || 'Unknown'}</p>
                <p className="text-[11px] text-[#5F656D] truncate">{truncateText(stripMentions(reply.body), 80)}</p>
            </div>
        );
    }

    function renderListingCard(listing: ChatListing) {
        const photo = listing.photos?.[0];
        return (
            <div className="mt-1.5 bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg overflow-hidden max-w-[280px]">
                {photo && (
                    <img src={photo} alt={listing.title} className="w-full h-[120px] object-cover" />
                )}
                <div className="p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        {listing.price && (
                            <span className="text-sm font-bold text-[#111315]">{formatPrice(listing.price)}</span>
                        )}
                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            listing.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                            listing.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                            listing.status === 'Sold' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>{listing.status}</span>
                    </div>
                    <p className="text-xs text-[#5F656D] font-medium truncate">{listing.title || listing.address}</p>
                    {(listing.city || listing.state_province) && (
                        <p className="text-[11px] text-[#8B9096] truncate">{[listing.city, listing.state_province].filter(Boolean).join(', ')}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                        {listing.bedrooms != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[#5F656D]">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                                {listing.bedrooms} bd
                            </span>
                        )}
                        {listing.bathrooms != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[#5F656D]">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                                {listing.bathrooms} ba
                            </span>
                        )}
                        {listing.mls_number && (
                            <span className="text-[10px] text-[#8B9096]">MLS# {listing.mls_number}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    function renderAttachments(attachments: ChatAttachment[]) {
        if (!attachments || attachments.length === 0) return null;
        return (
            <div className="flex flex-wrap gap-2 mt-1.5">
                {attachments.map((att) =>
                    att.is_image ? (
                        <button key={att.id} type="button" onClick={() => setLightboxUrl(att.url)}
                            className="block rounded overflow-hidden border border-[#E4E7EB] hover:border-[#7C3AED] transition-colors">
                            <img src={att.url} alt={att.original_name} className="max-w-[200px] max-h-[150px] object-cover" />
                        </button>
                    ) : att.is_audio ? (
                        <AudioPlayer key={att.id} url={att.url} name={att.original_name} size={att.size} />
                    ) : (
                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-2.5 py-1.5 bg-[#F9FAFB] border border-[#E4E7EB] rounded text-xs hover:bg-[#F3F4F6] transition-colors">
                            <svg className="h-4 w-4 text-[#5F656D] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                            <div className="min-w-0">
                                <p className="font-medium text-[#5F656D] truncate max-w-[140px]">{att.original_name}</p>
                                <p className="text-[10px] text-[#8B9096]">{formatFileSize(att.size)}</p>
                            </div>
                        </a>
                    )
                )}
            </div>
        );
    }

    function formatTime(dateStr: string) {
        return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    function formatDateSeparator(dateStr: string) {
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function shouldShowDateSeparator(msg: TeamChatMessage, prevMsg?: TeamChatMessage) {
        if (!prevMsg) return true;
        return new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
    }

    // Show time gap separator when >5 min between same-user messages
    function hasTimeGap(msg: TeamChatMessage, prevMsg?: TeamChatMessage): boolean {
        if (!prevMsg) return false;
        const diff = new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime();
        return diff > 5 * 60 * 1000;
    }

    // Generate safe object URL for file preview
    function getFilePreviewUrl(file: File): string {
        const url = URL.createObjectURL(file);
        objectUrlsRef.current.push(url);
        return url;
    }

    // ── Memoize file preview URLs ──
    const filePreviews = useMemo(() => {
        // Revoke previous URLs
        objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        objectUrlsRef.current = [];
        return pendingFiles.map(f => ({
            file: f,
            url: f.type.startsWith('image/') ? getFilePreviewUrl(f) : null,
        }));
    }, [pendingFiles]);

    // ── RENDER ──
    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/20 z-30 sm:hidden" onClick={onClose} />}

            {/* Image lightbox */}
            {lightboxUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightboxUrl(null)}>
                    <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={() => setLightboxUrl(null)}>
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                    <img src={lightboxUrl} alt="" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
                </div>
            )}

            <div
                className={`fixed top-14 right-0 bottom-0 w-full sm:w-[380px] z-40 bg-white border-l border-[#E4E7EB] shadow-[-4px_0_12px_rgba(0,0,0,0.08)] flex flex-col transform transition-transform duration-300 ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* ── Header ── */}
                <div className="h-12 bg-[#FAFAFA] border-b border-[#E4E7EB] flex items-center justify-between px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        {activeChannel.type === 'dm' && (
                            <button onClick={() => setActiveChannel({ type: 'team' })} className="text-[#8B9096] hover:text-[#111315] transition-colors mr-0.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                            </button>
                        )}
                        <h3 className="text-sm font-semibold text-[#111315]">
                            {activeChannel.type === 'dm' ? activeChannel.userName : 'Team Chat'}
                        </h3>
                        {activeChannel.type === 'team' && (
                            <span className="text-[10px] bg-[#F3F4F6] text-[#5F656D] px-1.5 py-0.5 rounded-full">{teamName}</span>
                        )}
                        {activeChannel.type === 'dm' && (
                            <span className="text-[10px] bg-[#EDE9FE] text-[#7C3AED] px-1.5 py-0.5 rounded-full">DM</span>
                        )}
                        {wsConnected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Live" />}
                    </div>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#5F656D] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* ── DM Channel Sidebar (inline) ── */}
                {activeChannel.type === 'team' && teamMembers.length > 1 && (
                    <div className="shrink-0 border-b border-[#E4E7EB] bg-[#FAFAFA] px-4 py-2">
                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1.5">Direct Messages</p>
                        <div className="flex flex-wrap gap-1.5">
                            {teamMembers.filter(m => m.user_id !== currentUserId).map(m => {
                                const color = avatarColors[m.user_id % avatarColors.length];
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setActiveChannel({ type: 'dm', userId: m.user_id, userName: m.user.name })}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-[#E4E7EB] rounded-full hover:border-[#7C3AED] hover:bg-[#F5F3FF] transition-colors"
                                    >
                                        <span className="h-5 w-5 flex items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                                            {m.user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="text-[11px] text-[#5F656D] font-medium">{m.user.name.split(' ')[0]}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Messages ── */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1 relative">
                    {/* Load older button/spinner */}
                    {hasOlderMessages && messages.length > 0 && (
                        <div className="flex justify-center py-2">
                            {loadingOlder ? (
                                <div className="animate-spin h-4 w-4 border-2 border-[#E4E7EB] border-t-[#7C3AED] rounded-full" />
                            ) : (
                                <button onClick={loadOlderMessages} className="text-xs text-[#7C3AED] hover:text-[#6D28D9] font-medium">
                                    Load older messages
                                </button>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin h-5 w-5 border-2 border-[#E4E7EB] border-t-[#7C3AED] rounded-full" />
                        </div>
                    )}
                    {!loading && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <svg className="h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                            <p className="mt-3 text-sm text-[#8B9096]">No messages yet</p>
                            <p className="text-xs text-[#C4C9D1]">Start a conversation with your team</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => {
                        const prevMsg = messages[idx - 1];
                        const showDate = shouldShowDateSeparator(msg, prevMsg);
                        const isAi = msg.is_ai_response;
                        const color = isAi ? '#8B5CF6' : avatarColors[(msg.user_id ?? 0) % avatarColors.length];
                        const timeGap = hasTimeGap(msg, prevMsg);
                        const isConsecutive = !showDate && !timeGap && prevMsg?.user_id === msg.user_id && !msg.reply_to && !isAi && !prevMsg?.is_ai_response;
                        const isSwiping = swipingMsgId === msg.id;
                        const msgSwipeOffset = isSwiping ? swipeOffset : 0;
                        const isOwn = msg.user_id === currentUserId;
                        const msgIsSticker = isStickerMessage(msg.body || '');

                        return (
                            <div key={msg.id} id={`chat-msg-${msg.id}`} className="transition-colors duration-500">
                                {showDate && (
                                    <div className="flex items-center gap-3 py-2">
                                        <div className="flex-1 h-px bg-[#E4E7EB]" />
                                        <span className="text-[10px] text-[#8B9096] font-medium">{formatDateSeparator(msg.created_at)}</span>
                                        <div className="flex-1 h-px bg-[#E4E7EB]" />
                                    </div>
                                )}
                                {!showDate && timeGap && (
                                    <div className="py-1">
                                        <div className="h-px bg-[#F3F4F6]" />
                                    </div>
                                )}
                                <div
                                    className={`group flex items-start gap-2.5 py-1 relative ${isConsecutive ? 'pt-0' : 'pt-2'}`}
                                    style={{ transform: `translateX(${msgSwipeOffset}px)`, transition: isSwiping ? 'none' : 'transform 0.2s ease-out' }}
                                    onTouchStart={(e) => handleTouchStart(e, msg.id)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    {/* Swipe reply indicator */}
                                    {isSwiping && msgSwipeOffset > 20 && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pl-2" style={{ transform: `translateX(${Math.min(msgSwipeOffset, 40)}px) translateY(-50%)` }}>
                                            <svg className={`h-4 w-4 transition-colors ${msgSwipeOffset > 50 ? 'text-[#7C3AED]' : 'text-[#8B9096]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                                            </svg>
                                        </div>
                                    )}

                                    {isConsecutive ? (
                                        <div className="w-7 shrink-0" />
                                    ) : isAi ? (
                                        <div className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white">
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
                                        </div>
                                    ) : (
                                        <div className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full text-white text-[10px] font-bold" style={{ backgroundColor: color }}>
                                            {msg.user?.name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        {!isConsecutive && (
                                            <div className="flex items-baseline gap-2 mb-0.5">
                                                <span className={`text-xs font-semibold ${isAi ? 'text-[#7C3AED]' : 'text-[#111315]'}`}>
                                                    {isAi ? 'BunnyAI' : (msg.user?.name || 'Unknown')}
                                                </span>
                                                {isAi ? (
                                                    <span className="text-[9px] font-medium bg-[#EDE9FE] text-[#7C3AED] px-1.5 py-0.5 rounded-full">AI</span>
                                                ) : (() => {
                                                    const member = teamMembers.find(m => m.user_id === msg.user_id);
                                                    if (!member || member.role === 'agent') return null;
                                                    const roleColor = member.role === 'owner' ? '#7C3AED' : member.role === 'admin' ? '#1693C9' : '#059669';
                                                    const roleLabel = member.role.charAt(0).toUpperCase() + member.role.slice(1).replace(/_/g, ' ');
                                                    return (
                                                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: roleColor + '18', color: roleColor }}>
                                                            {roleLabel}
                                                        </span>
                                                    );
                                                })()}
                                                <span className="text-[10px] text-[#8B9096]">{formatTime(msg.created_at)}</span>
                                                {msg.edited_at && <span className="text-[9px] text-[#C4C9D1] italic">edited</span>}
                                            </div>
                                        )}

                                        {/* Reply quote */}
                                        {msg.reply_to && renderReplyQuote(msg.reply_to)}

                                        {/* Message body (editable or display) */}
                                        {editingMsg?.id === msg.id ? (
                                            <div className="space-y-1.5">
                                                <textarea
                                                    ref={editInputRef}
                                                    value={editInput}
                                                    onChange={(e) => setEditInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                                                        if (e.key === 'Escape') { setEditingMsg(null); setEditInput(''); }
                                                    }}
                                                    className="w-full text-sm border border-[#7C3AED] rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] resize-none bg-[#F5F3FF]"
                                                    rows={2}
                                                    autoFocus
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleEditSave} className="text-[10px] text-[#7C3AED] hover:text-[#6D28D9] font-medium">Save</button>
                                                    <button onClick={() => { setEditingMsg(null); setEditInput(''); }} className="text-[10px] text-[#8B9096] hover:text-[#5F656D]">Cancel</button>
                                                    <span className="text-[9px] text-[#C4C9D1]">Esc to cancel, Enter to save</span>
                                                </div>
                                            </div>
                                        ) : msgIsSticker ? (
                                            <img
                                                src={`/stickers/${getStickerName(msg.body)}.svg`}
                                                alt={getStickerName(msg.body) || 'sticker'}
                                                className="h-20 w-20"
                                            />
                                        ) : msg.body ? (
                                            <div className={isAi ? 'bg-[#F5F3FF] border border-[#EDE9FE] rounded-lg px-3 py-2' : ''}>
                                                <p className="text-sm text-[#5F656D] whitespace-pre-wrap leading-relaxed break-words">{renderMessageBody(msg.body)}</p>
                                            </div>
                                        ) : null}

                                        {/* Listing card */}
                                        {msg.listing && renderListingCard(msg.listing)}

                                        {/* Attachments */}
                                        {renderAttachments(msg.attachments)}

                                        {/* Contact tag */}
                                        {msg.contact && (
                                            <a href={`/crm/contacts/${msg.contact.uuid}`}
                                                className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#F9FAFB] border border-[#E4E7EB] rounded text-xs hover:bg-[#F3F4F6] transition-colors">
                                                <svg className="h-3 w-3 text-[#5F656D]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                                                <span className="font-medium text-[#5F656D]">{msg.contact.first_name} {msg.contact.last_name}</span>
                                            </a>
                                        )}

                                        {/* Deal tag */}
                                        {msg.deal && (
                                            <a href={`/crm/deals/${msg.deal.id}`}
                                                className="mt-1.5 ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#E6F0FF] border border-[#BFDBFE] rounded text-xs hover:bg-[#DBEAFE] transition-colors">
                                                <svg className="h-3 w-3 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                                                <span className="font-medium text-[#1693C9]">{msg.deal.title}</span>
                                            </a>
                                        )}

                                        {/* Reactions display */}
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                                    const hasReacted = userIds.includes(currentUserId);
                                                    return (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => toggleReaction(msg.id, emoji)}
                                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] transition-colors ${
                                                                hasReacted
                                                                    ? 'bg-[#EDE9FE] border border-[#C4B5FD]'
                                                                    : 'bg-[#F3F4F6] border border-[#E4E7EB] hover:bg-[#E4E7EB]'
                                                            }`}
                                                            title={userIds.map(uid => {
                                                                if (uid === currentUserId) return 'You';
                                                                const m = teamMembers.find(tm => tm.user_id === uid);
                                                                return m?.user?.name ?? 'Unknown';
                                                            }).join(', ')}
                                                        >
                                                            <span>{emoji}</span>
                                                            <span className={`text-[10px] font-medium ${hasReacted ? 'text-[#7C3AED]' : 'text-[#5F656D]'}`}>{userIds.length}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover action buttons (desktop) */}
                                    <div className="hidden group-hover:flex items-center gap-0.5 absolute right-0 top-2">
                                        {/* React */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setReactionPickerMsg(reactionPickerMsg === msg.id ? null : msg.id)}
                                                className="flex items-center justify-center h-6 w-6 rounded-full bg-white border border-[#E4E7EB] text-[#8B9096] hover:text-[#F59E0B] hover:border-[#F59E0B] transition-colors shadow-sm"
                                                title="React"
                                            >
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                                                </svg>
                                            </button>
                                            {reactionPickerMsg === msg.id && (
                                                <div className="absolute right-0 top-full mt-1 flex items-center gap-0.5 bg-white border border-[#E4E7EB] rounded-full shadow-lg px-1.5 py-1 z-20">
                                                    {QUICK_REACTIONS.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => toggleReaction(msg.id, emoji)}
                                                            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors text-base"
                                                            title={emoji}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        {/* Reply */}
                                        <button
                                            type="button"
                                            onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                                            className="flex items-center justify-center h-6 w-6 rounded-full bg-white border border-[#E4E7EB] text-[#8B9096] hover:text-[#7C3AED] hover:border-[#7C3AED] transition-colors shadow-sm"
                                            title="Reply"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                                            </svg>
                                        </button>
                                        {/* More menu for own messages */}
                                        {isOwn && (
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setContextMenuMsg(contextMenuMsg === msg.id ? null : msg.id)}
                                                    className="flex items-center justify-center h-6 w-6 rounded-full bg-white border border-[#E4E7EB] text-[#8B9096] hover:text-[#5F656D] hover:border-[#5F656D] transition-colors shadow-sm"
                                                    title="More"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                                                    </svg>
                                                </button>
                                                {contextMenuMsg === msg.id && (
                                                    <div ref={contextMenuRef} className="absolute right-0 top-full mt-1 w-28 bg-white border border-[#E4E7EB] rounded-lg shadow-lg z-10 py-1">
                                                        <button
                                                            onClick={() => { setEditingMsg(msg); setEditInput(msg.body); setContextMenuMsg(null); }}
                                                            className="w-full text-left px-3 py-1.5 text-xs text-[#5F656D] hover:bg-[#F3F4F6] transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(msg.id)}
                                                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Scroll to bottom button ── */}
                {showScrollBtn && (
                    <div className="absolute bottom-[140px] right-6 z-10">
                        <button
                            onClick={() => scrollToBottom()}
                            className="h-8 w-8 rounded-full bg-white border border-[#E4E7EB] shadow-lg flex items-center justify-center text-[#5F656D] hover:text-[#7C3AED] hover:border-[#7C3AED] transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* ── Typing indicator ── */}
                {typingText && (
                    <div className="px-4 py-1.5 border-t border-[#F3F4F6]">
                        <p className="text-xs text-[#8B9096] italic animate-pulse">{typingText}</p>
                    </div>
                )}

                {/* ── AI thinking indicator ── */}
                {aiThinking && (
                    <div className="px-4 py-1.5 border-t border-[#F3F4F6] flex items-center gap-2">
                        <div className="flex items-center justify-center h-4 w-4 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1]">
                            <svg className="h-2.5 w-2.5 text-white animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                        </div>
                        <p className="text-xs text-[#7C3AED] italic animate-pulse">BunnyAI is thinking...</p>
                    </div>
                )}

                {/* ── Input bar ── */}
                <div className="shrink-0 border-t border-[#E4E7EB] bg-white p-3">
                    {/* Reply preview */}
                    {replyTo && (
                        <div className="flex items-start gap-2 mb-2 pl-2 py-1.5 bg-[#F5F3FF] border-l-2 border-[#7C3AED] rounded-r">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-[#7C3AED]">{replyTo.user?.name || 'Unknown'}</p>
                                <p className="text-[11px] text-[#5F656D] truncate">{truncateText(stripMentions(replyTo.body || ''), 80)}</p>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="text-[#8B9096] hover:text-[#5F656D] shrink-0 mt-0.5">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}

                    {/* Attached items row */}
                    {(selectedContact || selectedDeal || selectedListing || filePreviews.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {/* Contact chip */}
                            {selectedContact && (() => {
                                const initials = (selectedContact.first_name?.charAt(0) || '') + (selectedContact.last_name?.charAt(0) || '');
                                const color = avatarColors[selectedContact.id % avatarColors.length];
                                return (
                                    <div className="inline-flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-[#E4E7EB] rounded-lg shadow-sm">
                                        <span className="h-5 w-5 flex items-center justify-center rounded-md text-[8px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                                            {initials.toUpperCase()}
                                        </span>
                                        <span className="text-[12px] text-[#5F656D] font-medium">{selectedContact.first_name} {selectedContact.last_name}</span>
                                        <button onClick={() => setSelectedContact(null)} className="text-[#8B9096] hover:text-[#5F656D] transition-colors">
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Deal chip */}
                            {selectedDeal && (
                                <div className="inline-flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-[#E4E7EB] rounded-lg shadow-sm">
                                    <span className="h-5 w-5 flex items-center justify-center rounded-md bg-[#E6F0FF] shrink-0">
                                        <svg className="h-3 w-3 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                                    </span>
                                    <span className="text-[12px] text-[#5F656D] font-medium truncate max-w-[140px]">{selectedDeal.title}</span>
                                    <button onClick={() => setSelectedDeal(null)} className="text-[#8B9096] hover:text-[#5F656D] transition-colors">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}

                            {/* Listing chip */}
                            {selectedListing && (
                                <div className="inline-flex items-center gap-2 pl-1 pr-2 py-1 bg-white border border-[#E4E7EB] rounded-lg shadow-sm">
                                    {selectedListing.photos?.[0] ? (
                                        <img src={selectedListing.photos[0]} alt="" className="h-5 w-7 rounded object-cover shrink-0" />
                                    ) : (
                                        <span className="h-5 w-7 flex items-center justify-center rounded bg-[#F3F4F6] shrink-0">
                                            <svg className="h-3 w-3 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                                        </span>
                                    )}
                                    <div className="min-w-0">
                                        <span className="text-[12px] text-[#5F656D] font-medium truncate block max-w-[140px]">{selectedListing.title || selectedListing.address}</span>
                                        {selectedListing.price && <span className="text-[10px] text-[#5F656D]">{formatPrice(selectedListing.price)}</span>}
                                    </div>
                                    <button onClick={() => setSelectedListing(null)} className="text-[#8B9096] hover:text-[#5F656D] transition-colors shrink-0">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            )}

                            {/* File chips */}
                            {filePreviews.map((fp, idx) => (
                                <div key={idx} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 bg-white border border-[#E4E7EB] rounded-lg shadow-sm max-w-[180px]">
                                    {fp.url ? (
                                        <img src={fp.url} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                                    ) : (
                                        <span className="h-5 w-5 flex items-center justify-center rounded bg-[#FEF3C7] shrink-0">
                                            <svg className="h-3 w-3 text-[#D97706]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                            </svg>
                                        </span>
                                    )}
                                    <span className="text-[12px] text-[#5F656D] truncate">{fp.file.name}</span>
                                    <button onClick={() => removeFile(idx)} className="text-[#8B9096] hover:text-[#5F656D] transition-colors shrink-0">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        {/* Mention dropdown */}
                        {showMentionDropdown && filteredMembers.length > 0 && (
                            <ul className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-[#E4E7EB] rounded shadow-lg max-h-40 overflow-y-auto z-10">
                                {filteredMembers.map((m, i) => (
                                    <li key={m.id} onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                                        className={`px-3 py-2 text-xs cursor-pointer flex items-center gap-2 ${i === mentionIndex ? 'bg-[#EDE9FE] text-[#7C3AED]' : 'hover:bg-[#F3F4F6] text-[#5F656D]'}`}>
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-white text-[9px] font-bold shrink-0">
                                            {m.user.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="font-medium">{m.user.name}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Contact picker */}
                        {showContactPicker && (
                            <div ref={contactPickerRef} className="absolute bottom-full left-0 mb-2 w-[300px] bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden z-10">
                                <div className="px-3 pt-3 pb-2">
                                    <div className="relative">
                                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                        <input type="text" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)}
                                            placeholder="Search leads by name or email..." autoFocus
                                            className="w-full bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] placeholder:text-[#8B9096]" />
                                    </div>
                                    {!contactSearch.trim() && contactResults.length > 0 && (
                                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mt-2 mb-0.5">Recent Leads</p>
                                    )}
                                </div>
                                {contactResults.length > 0 ? (
                                    <ul className="max-h-[200px] overflow-y-auto px-1.5 pb-1.5">
                                        {contactResults.map(c => {
                                            const initials = (c.first_name?.charAt(0) || '') + (c.last_name?.charAt(0) || '');
                                            const color = avatarColors[c.id % avatarColors.length];
                                            return (
                                                <li key={c.id} onClick={() => { setSelectedContact(c); setShowContactPicker(false); }}
                                                    className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#F3F4F6] rounded-lg cursor-pointer transition-colors">
                                                    <span className="h-7 w-7 flex items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                                                        {initials.toUpperCase()}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-medium text-[#111315] truncate">{c.first_name} {c.last_name}</p>
                                                        {c.email && <p className="text-[11px] text-[#8B9096] truncate">{c.email}</p>}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : contactSearch.trim() ? (
                                    <div className="px-3 pb-4 pt-2 text-center">
                                        <p className="text-xs text-[#8B9096]">No leads matching "{contactSearch}"</p>
                                    </div>
                                ) : (
                                    <div className="px-3 pb-4 pt-1 text-center">
                                        <div className="animate-spin h-4 w-4 border-2 border-[#E4E7EB] border-t-[#5F656D] rounded-full mx-auto" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Listing picker */}
                        {showListingPicker && (
                            <div ref={listingPickerRef} className="absolute bottom-full left-0 mb-2 w-[320px] bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden z-10">
                                <div className="px-3 pt-3 pb-2">
                                    <div className="relative">
                                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                        <input type="text" value={listingSearch} onChange={(e) => setListingSearch(e.target.value)}
                                            placeholder="Search by address, MLS#, or city..." autoFocus
                                            className="w-full bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] placeholder:text-[#8B9096]" />
                                    </div>
                                    {!listingSearch.trim() && listingResults.length > 0 && (
                                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mt-2 mb-0.5">Recent Listings</p>
                                    )}
                                </div>
                                {listingResults.length > 0 ? (
                                    <ul className="max-h-[280px] overflow-y-auto px-1.5 pb-1.5">
                                        {listingResults.map(l => (
                                            <li key={l.id}
                                                onClick={() => { setSelectedListing(l); setShowListingPicker(false); }}
                                                className="flex items-center gap-2.5 px-2 py-2 hover:bg-[#F3F4F6] rounded-lg cursor-pointer transition-colors">
                                                {l.photos?.[0] ? (
                                                    <img src={l.photos[0]} alt="" className="h-11 w-14 rounded-lg object-cover shrink-0 border border-[#E4E7EB]" />
                                                ) : (
                                                    <div className="h-11 w-14 rounded-lg bg-[#F3F4F6] border border-[#E4E7EB] flex items-center justify-center shrink-0">
                                                        <svg className="h-4 w-4 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-medium text-[#111315] truncate">{l.title || l.address || 'Untitled'}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {l.price && <span className="text-[11px] font-semibold text-[#111315]">{formatPrice(l.price)}</span>}
                                                        {l.price && (l.city || l.mls_number) && <span className="text-[#D1D5DB]">&middot;</span>}
                                                        {l.city && <span className="text-[11px] text-[#5F656D]">{l.city}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {l.mls_number && (
                                                            <span className="text-[10px] text-[#8B9096] bg-[#F3F4F6] px-1.5 py-0.5 rounded font-medium">MLS# {l.mls_number}</span>
                                                        )}
                                                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                                                            l.status === 'active' || l.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                                                            l.status === 'pending' || l.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                                                            l.status === 'sold' || l.status === 'Sold' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-gray-50 text-gray-500'
                                                        }`}>{l.status}</span>
                                                        {l.bedrooms != null && <span className="text-[10px] text-[#8B9096]">{l.bedrooms}bd</span>}
                                                        {l.bathrooms != null && <span className="text-[10px] text-[#8B9096]">{l.bathrooms}ba</span>}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : listingSearch.trim() ? (
                                    <div className="px-3 pb-4 pt-2 text-center">
                                        <p className="text-xs text-[#8B9096]">No listings matching "{listingSearch}"</p>
                                    </div>
                                ) : (
                                    <div className="px-3 pb-4 pt-1 text-center">
                                        <div className="animate-spin h-4 w-4 border-2 border-[#E4E7EB] border-t-[#5F656D] rounded-full mx-auto" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Deal picker */}
                        {showDealPicker && (
                            <div ref={dealPickerRef} className="absolute bottom-full left-0 mb-2 w-[300px] bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden z-10">
                                <div className="px-3 pt-3 pb-2">
                                    <div className="relative">
                                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                        <input type="text" value={dealSearch} onChange={(e) => setDealSearch(e.target.value)}
                                            placeholder="Search deals by title or address..." autoFocus
                                            className="w-full bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] placeholder:text-[#8B9096]" />
                                    </div>
                                    {!dealSearch.trim() && dealResults.length > 0 && (
                                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mt-2 mb-0.5">Recent Deals</p>
                                    )}
                                </div>
                                {dealResults.length > 0 ? (
                                    <ul className="max-h-[200px] overflow-y-auto px-1.5 pb-1.5">
                                        {dealResults.map(d => (
                                            <li key={d.id} onClick={() => { setSelectedDeal(d); setShowDealPicker(false); }}
                                                className="flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#F3F4F6] rounded-lg cursor-pointer transition-colors">
                                                <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#E6F0FF] shrink-0">
                                                    <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[13px] font-medium text-[#111315] truncate">{d.title}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {d.value && <span className="text-[11px] font-semibold text-[#111315]">{formatPrice(d.value)}</span>}
                                                        {d.value && d.type && <span className="text-[#D1D5DB]">&middot;</span>}
                                                        {d.type && <span className="text-[10px] text-[#5F656D] capitalize">{d.type}</span>}
                                                    </div>
                                                    {d.property_address && <p className="text-[11px] text-[#8B9096] truncate mt-0.5">{d.property_address}</p>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : dealSearch.trim() ? (
                                    <div className="px-3 pb-4 pt-2 text-center">
                                        <p className="text-xs text-[#8B9096]">No deals matching "{dealSearch}"</p>
                                    </div>
                                ) : (
                                    <div className="px-3 pb-4 pt-1 text-center">
                                        <div className="animate-spin h-4 w-4 border-2 border-[#E4E7EB] border-t-[#5F656D] rounded-full mx-auto" />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hidden file input */}
                        <input ref={fileInputRef} type="file" multiple
                            accept="image/jpeg,image/png,image/gif,image/webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,audio/mp3,audio/ogg,audio/webm,audio/wav,audio/m4a,audio/mpeg"
                            onChange={handleFileSelect} className="hidden" />

                        {/* Unified Emoji & Sticker Picker */}
                        {showPicker && (
                            <div ref={pickerRef} className="absolute bottom-full right-0 mb-2 z-20 w-[320px] bg-white border border-[#E4E7EB] rounded-xl shadow-lg overflow-hidden">
                                {/* Tab bar */}
                                <div className="flex border-b border-[#E4E7EB]">
                                    <button
                                        type="button"
                                        onClick={() => setPickerTab('emoji')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                                            pickerTab === 'emoji'
                                                ? 'text-[#7C3AED] border-b-2 border-[#7C3AED] bg-[#F5F3FF]'
                                                : 'text-[#5F656D] hover:text-[#5F656D] hover:bg-[#F9FAFB]'
                                        }`}
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                                        Emojis
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPickerTab('stickers')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                                            pickerTab === 'stickers'
                                                ? 'text-[#7C3AED] border-b-2 border-[#7C3AED] bg-[#F5F3FF]'
                                                : 'text-[#5F656D] hover:text-[#5F656D] hover:bg-[#F9FAFB]'
                                        }`}
                                    >
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15M4.5 9h15M4.5 15h15M3.75 4.5h16.5a1.25 1.25 0 0 1 1.25 1.25v12.5a1.25 1.25 0 0 1-1.25 1.25H3.75a1.25 1.25 0 0 1-1.25-1.25V5.75A1.25 1.25 0 0 1 3.75 4.5Z" /></svg>
                                        Stickers
                                    </button>
                                </div>

                                {/* Emoji tab */}
                                {pickerTab === 'emoji' && (
                                    <EmojiPicker
                                        onEmojiClick={handleEmojiClick}
                                        theme={Theme.LIGHT}
                                        width={320}
                                        height={350}
                                        searchPlaceholder="Search emoji..."
                                        lazyLoadEmojis
                                    />
                                )}

                                {/* Stickers tab */}
                                {pickerTab === 'stickers' && (
                                    <div className="p-3">
                                        <div className="grid grid-cols-4 gap-2 max-h-[310px] overflow-y-auto">
                                            {STICKERS.map((s) => (
                                                <button
                                                    key={s.name}
                                                    type="button"
                                                    onClick={() => handleSendSticker(s.name)}
                                                    className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-[#F5F3FF] transition-colors"
                                                    title={s.label}
                                                >
                                                    <img src={`/stickers/${s.name}.svg`} alt={s.label} className="h-12 w-12" />
                                                    <span className="text-[9px] text-[#8B9096] truncate w-full text-center">{s.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Unified input container */}
                        <div className={`flex items-end gap-2 ${isRecording ? 'hidden' : ''}`}>
                            {/* + button with upward popup menu */}
                            <div ref={attachMenuRef} className="relative shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAttachMenu(!showAttachMenu);
                                        setShowContactPicker(false);
                                        setShowListingPicker(false);
                                    }}
                                    className={`flex items-center justify-center h-[38px] w-[38px] rounded-full border transition-all ${
                                        showAttachMenu
                                            ? 'bg-[#7C3AED] border-[#7C3AED] text-white rotate-45'
                                            : 'bg-white border-[#E4E7EB] text-[#5F656D] hover:border-[#7C3AED] hover:text-[#7C3AED]'
                                    }`}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                </button>

                                {/* Popup menu */}
                                {showAttachMenu && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-[#E4E7EB] rounded-xl shadow-lg py-1.5 z-10 animate-in fade-in slide-in-from-bottom-2">
                                        <button
                                            type="button"
                                            onClick={() => { setShowAttachMenu(false); setShowContactPicker(true); setContactSearch(''); setContactResults([]); }}
                                            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#5F656D] hover:bg-[#F5F3FF] transition-colors"
                                        >
                                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-[#EDE9FE]">
                                                <svg className="h-4 w-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
                                            </span>
                                            <span className="font-medium">Attach Lead</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowAttachMenu(false); setShowListingPicker(true); setListingSearch(''); setListingResults([]); }}
                                            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#5F656D] hover:bg-[#F5F3FF] transition-colors"
                                        >
                                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-[#DBEAFE]">
                                                <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                                            </span>
                                            <span className="font-medium">Share Listing</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowAttachMenu(false); setShowDealPicker(true); setDealSearch(''); setDealResults([]); }}
                                            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#5F656D] hover:bg-[#F5F3FF] transition-colors"
                                        >
                                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-[#E6F0FF]">
                                                <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
                                            </span>
                                            <span className="font-medium">Link Deal</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                                            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-[#5F656D] hover:bg-[#F5F3FF] transition-colors"
                                        >
                                            <span className="flex items-center justify-center h-8 w-8 rounded-full bg-[#FEF3C7]">
                                                <svg className="h-4 w-4 text-[#D97706]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                                </svg>
                                            </span>
                                            <span className="font-medium">Attach File</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Input + send */}
                            <div className="flex-1 flex items-end bg-[#F9FAFB] border border-[#E4E7EB] rounded-2xl focus-within:ring-1 focus-within:ring-[#7C3AED] focus-within:border-[#7C3AED]">
                                <textarea ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                                    placeholder={/^@BunnyAI\s*$/i.test(input) ? 'Ask your AI assistant anything...' : 'Message your team...'}
                                    rows={1}
                                    className="flex-1 bg-transparent border-0 pl-3.5 pr-1 py-2 text-sm resize-none focus:outline-none focus:ring-0 max-h-24 placeholder:text-[#8B9096]"
                                    style={{ minHeight: '38px' }} />

                                {/* Emoji & Sticker picker button */}
                                <button
                                    type="button"
                                    onClick={() => setShowPicker(!showPicker)}
                                    className={`flex items-center justify-center h-[38px] w-8 transition-colors shrink-0 ${showPicker ? 'text-[#7C3AED]' : 'text-[#8B9096] hover:text-[#5F656D]'}`}
                                    title="Emoji & Stickers"
                                >
                                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>
                                </button>

                                <button type="button" onClick={handleSend}
                                    disabled={(!input.trim() && pendingFiles.length === 0 && !selectedListing) || sending}
                                    className="flex items-center justify-center h-[38px] w-10 text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-30 transition-colors shrink-0">
                                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                                </button>
                            </div>

                            {/* Mic / Voice button */}
                            <button
                                type="button"
                                onClick={startRecording}
                                className="flex items-center justify-center h-[38px] w-[38px] rounded-full border border-[#E4E7EB] bg-white text-[#5F656D] hover:border-[#7C3AED] hover:text-[#7C3AED] transition-all shrink-0"
                                title="Voice message"
                            >
                                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                                </svg>
                            </button>
                        </div>

                        {/* Voice recording bar */}
                        {isRecording && (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-3 py-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                <span className="text-xs font-medium text-red-600">{formatRecordingTime(recordingTime)}</span>
                                <span className="text-[10px] text-red-400 flex-1">Recording...</span>
                                <button type="button" onClick={cancelRecording}
                                    className="text-xs text-[#8B9096] hover:text-red-600 font-medium transition-colors">Cancel</button>
                                <button type="button" onClick={stopAndSendRecording}
                                    className="flex items-center justify-center h-7 w-7 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0">
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
