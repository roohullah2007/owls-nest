import CrmLayout from '@/Layouts/CrmLayout';
import CrmToolbar, { ToolbarTitle } from '@/Components/Crm/CrmToolbar';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import SmsThread from '@/Components/Crm/SmsThread';
import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { formatPhone } from '@/utils/phone';
import type { SmsConversation, PageProps } from '@/types';

interface Props {
    conversations: SmsConversation[];
}

function formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function SmsInbox({ conversations: initialConversations }: Props) {
    const { hasPhoneNumber } = usePage<PageProps>().props;
    const [conversations, setConversations] = useState(initialConversations);
    const [activeContactId, setActiveContactId] = useState<number | null>(null);

    const activeConversation = conversations.find((c) => c.contact_id === activeContactId) ?? null;

    // Listen for real-time SMS updates to bump conversations
    useEffect(() => {
        if (typeof window.Echo === 'undefined') return;

        const channel = window.Echo.private(`user.${(window as any).__userId || ''}`);
        const handler = (e: any) => {
            const sms = e.sms_message;
            if (!sms) return;

            setConversations((prev) => {
                const existing = prev.find((c) => c.contact_id === sms.contact_id);
                if (existing) {
                    const updated = prev.map((c) =>
                        c.contact_id === sms.contact_id
                            ? {
                                  ...c,
                                  last_message_body: sms.body,
                                  last_message_at: sms.created_at,
                                  last_message_direction: sms.direction,
                                  unread_count: sms.direction === 'inbound' && sms.contact_id !== activeContactId
                                      ? c.unread_count + 1
                                      : c.unread_count,
                              }
                            : c,
                    );
                    return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
                }
                // New conversation from unknown contact that was just auto-created
                if (sms.contact) {
                    const newConvo: SmsConversation = {
                        contact_id: sms.contact_id,
                        contact_uuid: sms.contact.uuid,
                        contact_name: `${sms.contact.first_name} ${sms.contact.last_name}`,
                        contact_phone: sms.contact.phone ?? null,
                        contact_mobile: sms.contact.mobile ?? null,
                        sms_consent: false,
                        sms_opted_out: false,
                        last_message_body: sms.body,
                        last_message_at: sms.created_at,
                        last_message_direction: sms.direction,
                        unread_count: sms.direction === 'inbound' ? 1 : 0,
                    };
                    return [newConvo, ...prev];
                }
                return prev;
            });
        };

        channel.listen('.NewSmsMessage', handler);
        return () => { channel.stopListening('.NewSmsMessage', handler); };
    }, [activeContactId]);

    const handleSelectConversation = (convo: SmsConversation) => {
        setActiveContactId(convo.contact_id);
        // Clear unread count for this conversation
        setConversations((prev) =>
            prev.map((c) =>
                c.contact_id === convo.contact_id ? { ...c, unread_count: 0 } : c,
            ),
        );
    };

    if (!hasPhoneNumber) {
        return (
            <CrmLayout>
                <Head title="SMS Inbox" />
                <CrmToolbar>
                    <ToolbarTitle>SMS Inbox</ToolbarTitle>
                </CrmToolbar>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="bg-white border border-[#E4E7EB] rounded-xl p-8 max-w-md text-center">
                        <svg className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 className="text-sm font-semibold text-[#111315] mb-1">Get started with SMS</h3>
                        <p className="text-xs text-[#5F656D] mb-4">
                            Purchase a phone number in Settings to start texting your leads.
                        </p>
                        <div className="inline-flex">
                            <PrimaryButton href={route('crm.settings.index')} icon={null} label="Go to Settings" labelClassName="" />
                        </div>
                    </div>
                </div>
            </CrmLayout>
        );
    }

    return (
        <CrmLayout>
            <Head title="SMS Inbox" />
            <CrmToolbar>
                <ToolbarTitle>SMS Inbox</ToolbarTitle>
            </CrmToolbar>

            <div className="flex h-[calc(100vh-7.5rem)] bg-white border border-[#E4E7EB] rounded-xl overflow-hidden mx-4 mb-4">
                {/* Left panel - conversation list */}
                <div className="w-80 border-r border-[#E4E7EB] flex flex-col shrink-0">
                    <div className="px-3 py-2.5 border-b border-[#E4E7EB]">
                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">
                            Conversations ({conversations.length})
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <svg className="w-8 h-8 mx-auto text-[#D1D5DB] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-xs text-[#8B9096]">No SMS conversations yet.</p>
                                <p className="text-[11px] text-[#D1D5DB] mt-1">Send your first text from a contact page.</p>
                            </div>
                        ) : (
                            conversations.map((convo) => (
                                <button
                                    key={convo.contact_id}
                                    onClick={() => handleSelectConversation(convo)}
                                    className={`w-full text-left px-3 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors ${
                                        activeContactId === convo.contact_id ? 'bg-[#E6F0FF]' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                {convo.unread_count > 0 && (
                                                    <span className="w-2 h-2 rounded-full bg-[#1693C9] shrink-0" />
                                                )}
                                                <p className={`text-[13px] truncate ${convo.unread_count > 0 ? 'font-semibold text-[#111315]' : 'font-medium text-[#5F656D]'}`}>
                                                    {convo.contact_name}
                                                </p>
                                            </div>
                                            <p className="text-[11px] text-[#8B9096] truncate mt-0.5">
                                                {convo.last_message_direction === 'outbound' && 'You: '}
                                                {convo.last_message_body}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-[10px] text-[#8B9096]">{formatTime(convo.last_message_at)}</span>
                                            {convo.unread_count > 0 && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-[#1693C9] rounded-full">
                                                        {convo.unread_count}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right panel - active thread */}
                <div className="flex-1 flex flex-col">
                    {activeConversation ? (
                        <SmsThread
                            contactId={activeConversation.contact_id}
                            contactUuid={activeConversation.contact_uuid}
                            contactPhone={activeConversation.contact_phone}
                            contactMobile={activeConversation.contact_mobile}
                            contactName={activeConversation.contact_name}
                            smsConsent={activeConversation.sms_consent}
                            smsOptedOut={activeConversation.sms_opted_out}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-10 h-10 mx-auto text-[#E4E7EB] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p className="text-sm text-[#8B9096]">Select a conversation</p>
                                <p className="text-[11px] text-[#D1D5DB] mt-0.5">Choose a contact from the left to view their messages</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CrmLayout>
    );
}
