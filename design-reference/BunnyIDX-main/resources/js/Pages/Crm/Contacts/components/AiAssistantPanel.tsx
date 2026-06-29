import { RefObject } from 'react';
import { router } from '@inertiajs/react';
import { getAvatarColor } from '@/utils/avatarColors';
import { AiContactResult, ChatMessage } from './types';
import { typeColors, defaultTypeColor, statusColors, defaultStatusColor } from './constants';
import { capitalize } from './utils';
import { EmailIcon } from './icons';

/**
 * Floating AI Assistant panel — fixed to the bottom of the Contacts page.
 *
 * Hidden while a bulk-selection is active (the BulkActionBar occupies that slot).
 * Internally renders three regions: the chat scroll panel (when expanded + has
 * messages), the gradient-border input form, and a row of suggestion chips
 * (shown before the user starts typing).
 *
 * All state + handlers live in the parent — this component is purely UI.
 */
interface Props {
    visible: boolean;
    hasTeam: boolean;
    chatMessages: ChatMessage[];
    aiQuery: string;
    aiLoading: boolean;
    aiExpanded: boolean;
    chatScrollRef: RefObject<HTMLDivElement>;
    aiInputRef: RefObject<HTMLInputElement>;
    onQueryChange: (q: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onFocus: () => void;
    onBlur: () => void;
    onSuggestionClick: (suggestion: string) => void;
    onContactAction: (contact: AiContactResult, action: 'view' | 'email' | 'sms') => void;
    onDisambiguate: (contact: AiContactResult) => void;
    onSelectAll: () => void;
    onClearChat: () => void;
}

export default function AiAssistantPanel({
    visible,
    hasTeam,
    chatMessages,
    aiQuery,
    aiLoading,
    aiExpanded,
    chatScrollRef,
    aiInputRef,
    onQueryChange,
    onSubmit,
    onFocus,
    onBlur,
    onSuggestionClick,
    onContactAction,
    onDisambiguate,
    onSelectAll,
    onClearChat,
}: Props) {
    return (
        <>
            <style>{`@keyframes ai-border-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            {visible && (
                <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
                    <div className="mx-auto max-w-2xl px-4 pb-4 pointer-events-auto">
                        {aiExpanded && chatMessages.length > 0 && (
                            <div ref={chatScrollRef} className="mb-2 bg-white border border-[#BFDBFE] rounded-xl shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#EBF5FF] to-[#DBEAFE] border-b border-[#BFDBFE]">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 flex items-center justify-center rounded-[4px] bg-[#1693C9]">
                                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                                        </div>
                                        <span className="text-[11px] font-semibold text-[#1693C9]">AI Assistant</span>
                                    </div>
                                    <button onMouseDown={(e) => { e.preventDefault(); onClearChat(); }} className="text-[10px] font-medium text-[#8B9096] hover:text-[#5F656D] transition-colors">Clear chat</button>
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
                                                    {/* Interpretation badge */}
                                                    {msg.data?.interpretation && msg.data.interpretation !== msg.text && (
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="h-3 w-3 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
                                                            <span className="text-[10px] text-[#8B9096] italic">{msg.data.interpretation}</span>
                                                        </div>
                                                    )}

                                                    {/* Main answer */}
                                                    {msg.text && (
                                                        <p className="text-sm text-[#111315] leading-relaxed whitespace-pre-line">{msg.text}</p>
                                                    )}

                                                    {/* Contact cards */}
                                                    {msg.data?.contacts && msg.data.contacts.length > 0 && (
                                                        <div className="space-y-1.5 mt-2">
                                                            {msg.data.contacts.map((c) => {
                                                                const scoreColor = (c.lead_score ?? 0) >= 60 ? '#059669' : (c.lead_score ?? 0) >= 30 ? '#D97706' : '#DC2626';
                                                                const tc = typeColors[c.type] || defaultTypeColor;
                                                                const sc = statusColors[c.status] || defaultStatusColor;
                                                                return (
                                                                    <div key={c.id} className="flex items-center gap-3 p-2.5 bg-[#F9FAFB] border border-[#E4E7EB] rounded-[4px] group">
                                                                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ backgroundColor: getAvatarColor(c.id) }}>
                                                                            {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                                                                        </span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-[13px] font-medium text-[#111315] truncate">{c.name}</span>
                                                                                <span className="px-1.5 py-0.5 text-[8px] font-bold tracking-wide rounded-full" style={{ backgroundColor: tc.bg, color: tc.text }}>{capitalize(c.type)}</span>
                                                                                <span className="px-1.5 py-0.5 text-[8px] font-bold tracking-wide rounded-full" style={{ backgroundColor: sc.bg, color: sc.text }}>{capitalize(c.status)}</span>
                                                                                {c.lead_score !== null && (
                                                                                    <span className="inline-flex items-center justify-center h-4 min-w-[20px] px-1 text-[8px] font-bold rounded-full text-white" style={{ backgroundColor: scoreColor }}>{c.lead_score}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-3 text-[10px] text-[#5F656D] mt-0.5">
                                                                                {c.email && <span className="truncate">{c.email}</span>}
                                                                                {c.phone && <span className="shrink-0">{c.phone}</span>}
                                                                                {c.city && <span className="shrink-0">{c.city}</span>}
                                                                                {c.deals_count > 0 && <span className="shrink-0">{c.deals_count} deal{c.deals_count > 1 ? 's' : ''}</span>}
                                                                            </div>
                                                                            {c.tags.length > 0 && (
                                                                                <div className="flex gap-1 mt-1">
                                                                                    {c.tags.slice(0, 3).map((tag, ti) => (
                                                                                        <span key={ti} className="px-1.5 py-0.5 text-[8px] font-semibold rounded-full text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {/* Action buttons */}
                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            {msg.data?.action === 'disambiguate' ? (
                                                                                <button onMouseDown={(e) => { e.preventDefault(); onDisambiguate(c); }} className="px-2.5 py-1 text-[10px] font-semibold text-[#1693C9] bg-[#EBF5FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded transition-colors">Select</button>
                                                                            ) : (
                                                                                <>
                                                                                    <button onMouseDown={(e) => { e.preventDefault(); onContactAction(c, 'view'); }} className="p-1.5 text-[#8B9096] hover:text-[#1693C9] hover:bg-[#E6F0FF] rounded transition-colors" title="View profile">
                                                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                                                                    </button>
                                                                                    {c.email && (
                                                                                        <button onMouseDown={(e) => { e.preventDefault(); onContactAction(c, 'email'); }} className="p-1.5 text-[#8B9096] hover:text-[#1693C9] hover:bg-[#E6F0FF] rounded transition-colors" title="Draft email">
                                                                                            <EmailIcon className="h-3.5 w-3.5" />
                                                                                        </button>
                                                                                    )}
                                                                                    {c.phone && (
                                                                                        <button onMouseDown={(e) => { e.preventDefault(); onContactAction(c, 'sms'); }} className="p-1.5 text-[#8B9096] hover:text-[#0891B2] hover:bg-[#ECFEFF] rounded transition-colors" title="Draft SMS">
                                                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                                                                                        </button>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Draft preview */}
                                                    {msg.data?.draft && (
                                                        <div className="mt-2 p-3 bg-white border border-[#E4E7EB] rounded-[4px]">
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <span className="text-[10px] font-semibold text-[#1693C9] tracking-wider">
                                                                    {msg.data.draft.type === 'email' ? 'Email Draft' : 'SMS Draft'}
                                                                </span>
                                                            </div>
                                                            {msg.data.draft.subject && (
                                                                <p className="text-[11px] font-semibold text-[#5F656D] mb-1">Subject: {msg.data.draft.subject}</p>
                                                            )}
                                                            <p className="text-[12px] text-[#5F656D] leading-relaxed whitespace-pre-line">{msg.data.draft.body}</p>
                                                            {msg.data.draft.contact_uuid && (
                                                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#F3F4F6]">
                                                                    <button
                                                                        onMouseDown={(e) => { e.preventDefault(); if (msg.data?.draft?.contact_uuid) router.visit(route('crm.contacts.show', msg.data.draft.contact_uuid)); }}
                                                                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#1693C9] bg-[#E6F0FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded transition-colors"
                                                                    >
                                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                                                                        Open & Send
                                                                    </button>
                                                                    <button
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            const text = msg.data?.draft?.subject
                                                                                ? `Subject: ${msg.data.draft.subject}\n\n${msg.data.draft.body}`
                                                                                : msg.data?.draft?.body || '';
                                                                            navigator.clipboard.writeText(text);
                                                                        }}
                                                                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#5F656D] bg-[#F9FAFB] border border-[#E4E7EB] hover:bg-[#F3F4F6] rounded transition-colors"
                                                                    >
                                                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" /></svg>
                                                                        Copy
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Select all / matched count */}
                                                    {msg.data?.matchedCount !== undefined && msg.data.matchedCount > 0 && (
                                                        <button
                                                            onMouseDown={(e) => { e.preventDefault(); onSelectAll(); }}
                                                            className="mt-1 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#1693C9] bg-[#EBF5FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-full transition-colors"
                                                        >
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                                            Select {msg.data.matchedCount} matching contacts
                                                        </button>
                                                    )}

                                                    {/* Follow-up suggestions */}
                                                    {msg.data?.suggestions && msg.data.suggestions.length > 0 && (
                                                        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                                                            {msg.data.suggestions.map((s, i) => (
                                                                <button
                                                                    key={i}
                                                                    onMouseDown={(e) => { e.preventDefault(); onSuggestionClick(s); }}
                                                                    className="shrink-0 px-2.5 py-1 text-[10px] font-medium text-[#5F656D] bg-white border border-[#E4E7EB] hover:bg-[#F3F4F6] hover:text-[#5F656D] rounded-full transition-colors whitespace-nowrap"
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Loading indicator */}
                                    {aiLoading && (
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

                        {/* Main AI Input Bar — with animated border */}
                        <div className="relative rounded-2xl p-[1.5px]">
                            <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(90deg, #1693C9, #0891B2, #1693C9, #0891B2)', backgroundSize: '200% 100%', animation: 'ai-border-shimmer 3s linear infinite', opacity: aiExpanded || chatMessages.length > 0 ? 1 : 0.5 }} />
                            <div className="relative bg-white rounded-2xl shadow-xl transition-all">
                                <form id="ai-query-form" onSubmit={onSubmit} className="flex items-center">
                                    <div className="flex items-center pl-4 pr-1.5">
                                        {aiLoading ? (
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
                                        onChange={(e) => onQueryChange(e.target.value)}
                                        onFocus={onFocus}
                                        onBlur={onBlur}
                                        placeholder={chatMessages.length > 0 ? 'Ask a follow-up...' : aiExpanded ? 'Ask anything — "tell me about Sarah", "email Lisa", "top leads"...' : 'AI Assistant — search, filter, analyze, draft emails...'}
                                        className="flex-1 text-sm text-[#111315] placeholder:text-[#8B9096] border-0 py-3.5 px-3 focus:outline-none focus:ring-0 bg-transparent"
                                        disabled={aiLoading}
                                    />
                                    {!aiQuery && !aiExpanded && chatMessages.length === 0 && (
                                        <span className="hidden sm:flex items-center shrink-0 mr-3 px-1.5 py-0.5 text-[10px] font-medium text-[#8B9096] bg-[#F3F4F6] border border-[#E4E7EB] rounded">
                                            ⌘K
                                        </span>
                                    )}
                                    {(aiQuery || aiExpanded || chatMessages.length > 0) && (
                                        <button
                                            type="submit"
                                            disabled={aiLoading || !aiQuery.trim()}
                                            className="shrink-0 mr-2 h-8 w-8 flex items-center justify-center rounded-[4px] bg-gradient-to-br from-[#1693C9] to-[#1380AF] text-white hover:from-[#1380AF] hover:to-[#004099] disabled:opacity-30 disabled:hover:from-[#1693C9] disabled:hover:to-[#1380AF] transition-all"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>
                                        </button>
                                    )}
                                </form>

                                {/* Quick suggestion chips — shown when expanded but no chat yet */}
                                {aiExpanded && !aiQuery && chatMessages.length === 0 && (
                                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                                        {[
                                            { label: 'Who needs follow-up?', q: 'Show contacts I haven\'t contacted in 2 weeks' },
                                            { label: 'Top leads by score', q: 'Show my best leads sorted by score' },
                                            { label: 'New this week', q: 'Show contacts added this week' },
                                            { label: 'Morning briefing', q: 'Give me a morning briefing on what I should focus on today' },
                                            { label: 'IDX / Website leads', q: 'Show leads from IDX and website' },
                                            ...(hasTeam ? [{ label: 'Unassigned leads', q: 'Show new leads that need to be assigned' }] : []),
                                        ].map((chip, i) => (
                                            <button
                                                key={i}
                                                onMouseDown={(e) => { e.preventDefault(); onSuggestionClick(chip.q); }}
                                                className="shrink-0 px-3 py-1.5 text-[11px] font-medium text-[#5F656D] bg-[#F9FAFB] border border-[#E4E7EB] hover:bg-[#F3F4F6] hover:text-[#5F656D] hover:border-[#D1D5DB] rounded-full transition-colors whitespace-nowrap"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
