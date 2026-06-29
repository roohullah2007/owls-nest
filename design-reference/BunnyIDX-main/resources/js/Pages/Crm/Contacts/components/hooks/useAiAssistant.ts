import { useState, useRef, useEffect } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { router } from '@inertiajs/react';
import type { Contact, AiContactResult, AiResponse, ChatMessage } from '../types';

/**
 * Owns the Contacts AI assistant: chat state, the natural-language query
 * round-trip to /crm/ai/contacts-query, applying returned filters/selections,
 * the focus/blur expand behaviour, and the Cmd/Ctrl+K (or "/") shortcut.
 *
 * Pure extraction from the Contacts index page — behaviour is unchanged.
 * `pageContacts` is the current page's rows (for select-all scoping) and
 * `setSelectedIds` is the page's selection setter.
 */
export function useAiAssistant(
    aiEnabled: boolean | undefined,
    pageContacts: Contact[],
    setSelectedIds: Dispatch<SetStateAction<number[]>>,
) {
    const [aiQuery, setAiQuery] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);
    const [aiExpanded, setAiExpanded] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatMsgId, setChatMsgId] = useState(0);
    const aiInputRef = useRef<HTMLInputElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keyboard shortcut: Cmd/Ctrl+K or / to focus AI bar
    useEffect(() => {
        if (!aiEnabled) return;
        function handleKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                aiInputRef.current?.focus();
                setAiExpanded(true);
            }
            if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
                e.preventDefault();
                aiInputRef.current?.focus();
                setAiExpanded(true);
            }
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [aiEnabled]);

    function handleAiBlur() {
        blurTimeoutRef.current = setTimeout(() => {
            if (!aiQuery && !aiResponse && chatMessages.length === 0) setAiExpanded(false);
        }, 200);
    }
    function handleAiFocus() {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        setAiExpanded(true);
    }

    async function handleAiQuery(e: FormEvent) {
        e.preventDefault();
        submitAiQuery(aiQuery);
    }

    function handleAiSuggestionClick(suggestion: string) {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        setAiQuery(suggestion);
        submitAiQuery(suggestion);
    }

    function handleContactAction(contact: AiContactResult, action: 'view' | 'email' | 'sms' | 'call') {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        if (action === 'view') {
            router.visit(route('crm.contacts.show', contact.uuid));
        } else if (action === 'email') {
            submitAiQuery(`Draft an email to ${contact.name}`);
        } else if (action === 'sms') {
            submitAiQuery(`Draft a text message to ${contact.name}`);
        } else if (action === 'call') {
            router.visit(route('crm.contacts.show', contact.uuid));
        }
    }

    function handleDisambiguate(contact: AiContactResult) {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        submitAiQuery(`Tell me about ${contact.name}`);
    }

    async function submitAiQuery(queryText: string) {
        if (!queryText.trim() || aiLoading) return;
        setAiLoading(true);
        setAiExpanded(true);

        const userMsg: ChatMessage = {
            id: chatMsgId + 1,
            role: 'user',
            text: queryText,
            timestamp: new Date(),
        };
        setChatMsgId(prev => prev + 2);
        setChatMessages(prev => [...prev, userMsg]);
        setAiQuery('');

        try {
            const res = await fetch('/crm/ai/contacts-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query: queryText }),
            });

            if (!res.ok) {
                const errData: ChatMessage = { id: chatMsgId + 2, role: 'assistant', text: 'Something went wrong. Please try again.', timestamp: new Date() };
                setChatMessages(prev => [...prev, errData]);
                setAiLoading(false);
                return;
            }

            const data: AiResponse = await res.json();
            setAiResponse(data);

            const assistantMsg: ChatMessage = {
                id: chatMsgId + 2,
                role: 'assistant',
                text: data.answer || data.interpretation || 'Done.',
                data,
                timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, assistantMsg]);

            // Apply filters
            if (data.filters && Object.keys(data.filters).length > 0) {
                const params: Record<string, string> = {};
                const filterKeys = ['search', 'type', 'status', 'source', 'sort', 'direction', 'lead_score_min', 'lead_score_max', 'last_contacted_before', 'last_contacted_after', 'has_email', 'has_phone', 'city', 'tag'];
                for (const key of filterKeys) {
                    if (data.filters[key] !== undefined && data.filters[key] !== null) {
                        params[key] = String(data.filters[key]);
                    }
                }
                router.get(route('crm.contacts.index'), params, { preserveState: true });
            }

            // Select all action
            if (data.action === 'select_all' && data.matchedIds && data.matchedIds.length > 0) {
                const pageIds = new Set(pageContacts.map(c => c.id));
                setSelectedIds(data.matchedIds.filter(id => pageIds.has(id)));
            }

            if (data.error) {
                const errMsg: ChatMessage = { id: chatMsgId + 2, role: 'assistant', text: data.error, timestamp: new Date() };
                setChatMessages(prev => [...prev.slice(0, -1), errMsg]);
            }
        } catch {
            const errMsg: ChatMessage = { id: chatMsgId + 2, role: 'assistant', text: 'Failed to connect. Please try again.', timestamp: new Date() };
            setChatMessages(prev => [...prev, errMsg]);
        } finally {
            setAiLoading(false);
            setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
    }

    function clearAiChat() {
        setAiQuery('');
        setAiResponse(null);
        setChatMessages([]);
        setAiExpanded(false);
        router.get(route('crm.contacts.index'), {}, { preserveState: true });
    }

    function handleAiSelectAll() {
        if (aiResponse?.matchedIds) {
            const pageIds = new Set(pageContacts.map(c => c.id));
            setSelectedIds(aiResponse.matchedIds.filter(id => pageIds.has(id)));
        }
    }

    return {
        aiQuery, setAiQuery, aiLoading, aiExpanded, chatMessages,
        aiInputRef, chatScrollRef,
        handleAiQuery, handleAiFocus, handleAiBlur, handleAiSuggestionClick,
        handleContactAction, handleDisambiguate, handleAiSelectAll, clearAiChat,
    };
}
