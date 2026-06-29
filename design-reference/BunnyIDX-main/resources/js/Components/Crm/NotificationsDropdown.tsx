import { AppNotification, PageProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

function relativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function notificationIcon(type: string) {
    switch (type) {
        case 'new_contact':
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
            );
        case 'deal_created':
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
            );
        case 'task_assigned':
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            );
        case 'team_mention':
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
            );
        case 'task_reminder':
        case 'meeting_reminder':
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            );
        case 'overdue_tasks_digest':
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
            );
        case 'daily_meeting_summary':
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
            );
        default:
            return (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
            );
    }
}

function getNotificationUrl(data: AppNotification['data']): string | null {
    switch (data.type) {
        case 'new_contact':
            return data.contact_uuid ? `/crm/contacts/${data.contact_uuid}` : null;
        case 'deal_created':
            return data.deal_id ? `/crm/deals/${data.deal_id}` : null;
        case 'task_assigned':
        case 'task_reminder':
        case 'overdue_tasks_digest':
            return '/crm/tasks';
        case 'meeting_reminder':
        case 'daily_meeting_summary':
            return '/crm/calendar';
        case 'team_mention':
            return '/crm';
        default:
            return null;
    }
}

export default function NotificationsDropdown() {
    const { unreadNotifications, auth } = usePage<PageProps>().props;
    const userId = auth.user.id;
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(unreadNotifications);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const csrfToken = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';

    useEffect(() => {
        setUnreadCount(unreadNotifications);
    }, [unreadNotifications]);

    const fetchNotifications = useCallback(() => {
        fetch('/crm/notifications', { headers: { Accept: 'application/json' } })
            .then(r => r.json())
            .then(data => {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread_count ?? 0);
            })
            .catch(() => {});
    }, []);

    // Listen for real-time notifications via Echo
    useEffect(() => {
        if (!userId || !window.Echo) return;

        const channel = window.Echo.private(`App.Models.User.${userId}`);

        channel.notification((notification: AppNotification['data'] & { id: string; type: string; created_at?: string }) => {
            const newNotification: AppNotification = {
                id: notification.id,
                type: notification.type,
                data: notification,
                read_at: null,
                created_at: notification.created_at || new Date().toISOString(),
            };

            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((c) => c + 1);
        });

        return () => {
            channel.stopListening('.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated');
        };
    }, [userId]);

    // Fetch on open
    useEffect(() => {
        if (open) {
            setLoading(true);
            fetch('/crm/notifications', { headers: { Accept: 'application/json' } })
                .then(r => r.json())
                .then(data => {
                    setNotifications(data.notifications || []);
                    setUnreadCount(data.unread_count ?? 0);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }
    }, [open]);

    // Poll every 60s (reduced from 30s since we have WS)
    useEffect(() => {
        pollingRef.current = setInterval(fetchNotifications, 60000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    function markAsRead(id: string) {
        fetch(`/crm/notifications/${id}/read`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json' },
        }).then(() => {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
            setUnreadCount(c => Math.max(0, c - 1));
        }).catch(() => {});
    }

    function markAllAsRead() {
        fetch('/crm/notifications/read-all', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json' },
        }).then(() => {
            setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
            setUnreadCount(0);
        }).catch(() => {});
    }

    function handleNotificationClick(n: AppNotification) {
        if (!n.read_at) markAsRead(n.id);
        const url = getNotificationUrl(n.data);
        if (url) {
            setOpen(false);
            router.visit(url);
        }
    }

    return (
        <div ref={dropdownRef} className="relative flex items-stretch">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center justify-center w-10 sm:w-12 text-white/50 hover:text-white hover:bg-white/10 border-l border-white/10 transition-colors relative"
                title="Notifications"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-1.5 sm:right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-white border border-[#E4E7EB] rounded-lg shadow-lg z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E4E7EB] bg-[#FAFAFA]">
                        <span className="text-sm font-semibold text-[#111315]">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-[#7C3AED] hover:text-[#6D28D9] font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading && (
                            <div className="flex justify-center py-6">
                                <div className="animate-spin h-5 w-5 border-2 border-[#E4E7EB] border-t-[#7C3AED] rounded-full" />
                            </div>
                        )}
                        {!loading && notifications.length === 0 && (
                            <div className="py-8 text-center">
                                <svg className="h-8 w-8 mx-auto text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                                </svg>
                                <p className="mt-2 text-sm text-[#8B9096]">No notifications yet</p>
                            </div>
                        )}
                        {!loading && notifications.map(n => (
                            <button
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] last:border-b-0 ${
                                    !n.read_at ? 'bg-[#F5F3FF]' : ''
                                }`}
                            >
                                <div className={`shrink-0 mt-0.5 ${!n.read_at ? 'text-[#7C3AED]' : 'text-[#8B9096]'}`}>
                                    {notificationIcon(n.data.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-[#5F656D] leading-snug">{n.data.message}</p>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">{relativeTime(n.created_at)}</p>
                                </div>
                                {!n.read_at && (
                                    <div className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-[#7C3AED]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
