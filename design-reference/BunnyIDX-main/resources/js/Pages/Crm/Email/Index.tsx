import CrmLayout from '@/Layouts/CrmLayout';
import CrmToolbar, { ToolbarTitle } from '@/Components/Crm/CrmToolbar';
import EmailThreadView from '@/Components/Crm/EmailThreadView';
import EmailComposeModal from '@/Components/Crm/EmailComposeModal';
import NativeSelect from '@/Components/Crm/NativeSelect';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { EmailThread, EmailAccount, PageProps } from '@/types';

interface PaginatedThreads {
    data: EmailThread[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Props {
    threads: PaginatedThreads;
    accounts: EmailAccount[];
    activeAccountId: number;
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

export default function EmailInbox({ threads: initialThreads, accounts, activeAccountId }: Props) {
    const { hasEmailAccount } = usePage<PageProps>().props;
    const [threads, setThreads] = useState(initialThreads.data);
    const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
    const [composeOpen, setComposeOpen] = useState(false);

    const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

    // Listen for real-time email updates
    useEffect(() => {
        if (typeof window.Echo === 'undefined') return;

        const channel = window.Echo.private(`user.${(window as any).__userId || ''}`);
        const handler = (e: any) => {
            const msg = e.email_message;
            if (!msg) return;

            setThreads((prev) => {
                const existing = prev.find((t) => t.id === msg.email_thread_id);
                if (existing) {
                    const updated = prev.map((t) =>
                        t.id === msg.email_thread_id
                            ? {
                                  ...t,
                                  snippet: msg.snippet,
                                  last_message_at: msg.sent_at,
                                  is_read: msg.email_thread_id === activeThreadId ? true : false,
                                  message_count: t.message_count + 1,
                              }
                            : t,
                    );
                    return updated.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
                }
                return prev;
            });
        };

        channel.listen('.NewEmailMessage', handler);
        return () => { channel.stopListening('.NewEmailMessage', handler); };
    }, [activeThreadId]);

    const handleSelectThread = (thread: EmailThread) => {
        setActiveThreadId(thread.id);
        setThreads((prev) =>
            prev.map((t) => (t.id === thread.id ? { ...t, is_read: true } : t)),
        );
    };

    const handleAccountChange = (accountId: number) => {
        router.get(route('crm.email.index'), { account_id: accountId }, { preserveState: false });
    };

    if (!hasEmailAccount) {
        return (
            <CrmLayout>
                <Head title="Email" />
                <CrmToolbar>
                    <ToolbarTitle>Email</ToolbarTitle>
                </CrmToolbar>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="bg-white border border-[#E4E7EB] rounded-xl p-8 max-w-md text-center">
                        <svg className="w-10 h-10 mx-auto text-[#D1D5DB] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                        <h3 className="text-sm font-semibold text-[#111315] mb-1">Connect your email</h3>
                        <p className="text-xs text-[#5F656D] mb-4">
                            Connect your Gmail account in Settings to start sending and receiving emails.
                        </p>
                        <Link
                            href={route('crm.settings')}
                            className="inline-flex items-center h-8 px-4 text-xs font-medium text-white bg-[#7C36EE] rounded-md hover:bg-[#6B2CD4] transition-colors"
                        >
                            Go to Settings
                        </Link>
                    </div>
                </div>
            </CrmLayout>
        );
    }

    return (
        <CrmLayout>
            <Head title="Email" />
            <CrmToolbar>
                <ToolbarTitle>Email</ToolbarTitle>
                <div className="flex items-center gap-2 ml-auto pr-3">
                    {accounts.length > 1 && (
                        <NativeSelect
                            size="sm"
                            value={activeAccountId}
                            onChange={(e) => handleAccountChange(Number(e.target.value))}
                        >
                            {accounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.email_address}</option>
                            ))}
                        </NativeSelect>
                    )}
                    <button
                        onClick={() => setComposeOpen(true)}
                        className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium text-white bg-[#7C36EE] rounded-[4px] hover:bg-[#6B2CD4] transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                        Compose
                    </button>
                </div>
            </CrmToolbar>

            <div className="flex h-[calc(100vh-7.5rem)] bg-white border border-[#E4E7EB] rounded-xl overflow-hidden mx-4 mb-4">
                {/* Left panel - thread list */}
                <div className="w-80 border-r border-[#E4E7EB] flex flex-col shrink-0">
                    <div className="px-3 py-2.5 border-b border-[#E4E7EB]">
                        <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider">
                            Inbox ({threads.length})
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {threads.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <svg className="w-8 h-8 mx-auto text-[#D1D5DB] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                </svg>
                                <p className="text-xs text-[#8B9096]">No emails yet.</p>
                                <p className="text-[11px] text-[#D1D5DB] mt-1">Your synced emails will appear here.</p>
                            </div>
                        ) : (
                            threads.map((thread) => (
                                <button
                                    key={thread.id}
                                    onClick={() => handleSelectThread(thread)}
                                    className={`w-full text-left px-3 py-3 border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors ${
                                        activeThreadId === thread.id ? 'bg-[#F3EAFF]' : ''
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                {!thread.is_read && (
                                                    <span className="w-2 h-2 rounded-full bg-[#7C36EE] shrink-0" />
                                                )}
                                                <p className={`text-[13px] truncate ${!thread.is_read ? 'font-semibold text-[#111315]' : 'font-medium text-[#5F656D]'}`}>
                                                    {thread.contact
                                                        ? `${thread.contact.first_name} ${thread.contact.last_name}`
                                                        : thread.subject || '(no subject)'}
                                                </p>
                                            </div>
                                            {thread.contact && (
                                                <p className={`text-xs truncate mt-0.5 ${!thread.is_read ? 'font-medium text-[#111315]' : 'text-[#5F656D]'}`}>
                                                    {thread.subject || '(no subject)'}
                                                </p>
                                            )}
                                            <p className="text-[11px] text-[#8B9096] truncate mt-0.5">
                                                {thread.snippet}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-[10px] text-[#8B9096]">{formatTime(thread.last_message_at)}</span>
                                            {thread.message_count > 1 && (
                                                <span className="text-[10px] text-[#8B9096] mt-1 block">{thread.message_count}</span>
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
                    {activeThread ? (
                        <EmailThreadView
                            threadId={activeThread.id}
                            subject={activeThread.subject}
                            accounts={accounts}
                            activeAccountId={activeAccountId}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-10 h-10 mx-auto text-[#E4E7EB] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                </svg>
                                <p className="text-sm text-[#8B9096]">Select an email</p>
                                <p className="text-[11px] text-[#D1D5DB] mt-0.5">Choose a thread from the left to view messages</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Compose Modal */}
            {composeOpen && (
                <EmailComposeModal
                    accounts={accounts}
                    defaultAccountId={activeAccountId}
                    onClose={() => setComposeOpen(false)}
                />
            )}
        </CrmLayout>
    );
}
