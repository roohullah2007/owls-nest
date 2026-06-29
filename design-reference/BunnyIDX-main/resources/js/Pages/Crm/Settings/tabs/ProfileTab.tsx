import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { EmailAccount, NotificationPreferences, PageProps } from '@/types';
import NotificationsTab from './NotificationsTab';
import EmailTab from './EmailTab';
import GeneralPane from './profile/GeneralPane';
import SecurityPane from './profile/SecurityPane';
import ConnectedAccountsPane from './profile/ConnectedAccountsPane';
import CalendarSyncPane from './profile/CalendarSyncPane';
import { PaneWrapper } from './profile/helpers';
import type { PropertyAlertsSettings, ResendStatus, SenderAliasStatus } from '../Index';

type SubTab = 'general' | 'security' | 'connected' | 'calendar' | 'email-settings' | 'notifications';

interface Props {
    mustVerifyEmail: boolean;
    status?: string;
    notificationPreferences: NotificationPreferences;
    propertyAlerts: PropertyAlertsSettings;
    emailAccounts: EmailAccount[];
    googleConfigured: boolean;
    resendStatus: ResendStatus;
    senderAlias: SenderAliasStatus;
}

const SUB_TABS: { key: SubTab; label: string; icon: JSX.Element }[] = [
    {
        key: 'general',
        label: 'General',
        icon: (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>),
    },
    {
        key: 'security',
        label: 'Security',
        icon: (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>),
    },
    {
        key: 'connected',
        label: 'Connected Accounts',
        icon: (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>),
    },
    {
        key: 'calendar',
        label: 'Calendar Sync',
        icon: (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>),
    },
    {
        key: 'email-settings',
        label: 'Email Settings',
        icon: (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>),
    },
    {
        key: 'notifications',
        label: 'Notifications',
        icon: (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>),
    },
];

export default function ProfileTab({ mustVerifyEmail, status, notificationPreferences, propertyAlerts, emailAccounts, googleConfigured, resendStatus, senderAlias }: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const [sub, setSub] = useState<SubTab>('general');

    // Best-effort split of a single-name field if first/last not yet stored.
    const settings = user.settings || {};
    const fallbackFirst = settings.first_name ?? user.name.split(' ')[0] ?? '';
    const fallbackLast = settings.last_name ?? user.name.split(' ').slice(1).join(' ') ?? '';

    return (
        <div className="flex-1 flex items-stretch min-w-0">
            {/* Inner sub-sidebar */}
            <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-[#E4E7EB] bg-[#F7F8FB] min-h-[calc(100vh-56px)]">
                <div className="px-5 py-5 border-b border-[#E4E7EB] flex flex-col items-start gap-2.5">
                    {user.avatar ? (
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-16 w-16 rounded-[4px] object-cover border border-[#E4E7EB]"
                        />
                    ) : (
                        <div className="h-16 w-16 rounded-[4px] bg-[#E6F0FF] text-[#1693C9] text-2xl font-semibold flex items-center justify-center border border-[#E4E7EB]">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0 w-full">
                        <div
                            className="font-normal truncate"
                            style={{ fontSize: '18px', lineHeight: '22px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}
                        >
                            {user.name}
                        </div>
                        <div className="text-[12px] text-[#5F656D] mt-0.5 truncate">{user.email}</div>
                    </div>
                </div>
                <nav className="py-2">
                    {SUB_TABS.map((t) => {
                        const active = sub === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setSub(t.key)}
                                className={`group flex items-center gap-2.5 w-full h-9 px-5 text-[14px] transition-colors [&_svg]:h-4 [&_svg]:w-4 ${
                                    active
                                        ? 'text-[#1693C9] font-medium'
                                        : 'text-[#374151] hover:text-[#1693C9] font-normal'
                                }`}
                            >
                                <span className={`shrink-0 ${active ? 'text-[#1693C9]' : 'text-[#374151] group-hover:text-[#1693C9]'}`}>
                                    {t.icon}
                                </span>
                                <span className="flex-1 text-left truncate">{t.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Content */}
            <div className="flex-1 overflow-auto min-w-0">
                {sub === 'general' && (
                    <GeneralPane
                        user={user}
                        fallbackFirst={fallbackFirst}
                        fallbackLast={fallbackLast}
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                )}
                {sub === 'security' && <SecurityPane />}
                {sub === 'connected' && <ConnectedAccountsPane />}
                {sub === 'calendar' && <CalendarSyncPane />}
                {sub === 'email-settings' && (
                    <PaneWrapper title="Email Settings">
                        <EmailTab emailAccounts={emailAccounts} googleConfigured={googleConfigured} resendStatus={resendStatus} senderAlias={senderAlias} />
                    </PaneWrapper>
                )}
                {sub === 'notifications' && (
                    <PaneWrapper title="Notifications">
                        <NotificationsTab preferences={notificationPreferences} propertyAlerts={propertyAlerts} />
                    </PaneWrapper>
                )}
            </div>
        </div>
    );
}
