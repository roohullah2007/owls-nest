import Dropdown from '@/Components/Dropdown';
import Logo from '@/Components/ui/Logo';
import Toast from '@/Components/ui/Toast';
import NotificationsDropdown from '@/Components/Crm/NotificationsDropdown';
import GlobalSearch from '@/Components/Crm/GlobalSearch';
import TeamChatButton from '@/Components/Crm/TeamChatButton';
import TeamChatPanel from '@/Components/Crm/TeamChatPanel';
import PhoneDialer from '@/Components/Crm/PhoneDialer';
import IncomingCallBanner from '@/Components/Crm/IncomingCallBanner';
import ToolsMegaMenu from '@/Components/Crm/ToolsMegaMenu';
import { Link, router, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { PageProps } from '@/types';

// `feature` (optional) maps a nav item to a plan feature key. When the user
// lacks that feature, the item shows a lock and routes to the upgrade page
// instead of the (server-gated) destination.
const baseNavigation: { name: string; href: string; feature?: string }[] = [
    { name: 'Contacts', href: 'crm.contacts.index' },
    { name: 'Inbox', href: 'crm.inbox.index' },
    { name: 'Deal Board', href: 'crm.deals.index' },
    { name: 'Properties', href: 'crm.listings.index' },
    { name: 'Tasks', href: 'crm.tasks.index' },
    { name: 'Action Plans', href: 'crm.action-plans.index', feature: 'email' },
    { name: 'Calendar', href: 'crm.calendar.index' },
    { name: 'Team', href: 'crm.team.index' },
    { name: 'Reports', href: 'crm.reports.index' },
];

export default function CrmLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, hasPhoneNumber, hasEmailAccount, activeDialerSession } = usePage<PageProps & { activeDialerSession?: { id: number; name: string | null; status: string; total_contacts: number; current_position: number } | null }>().props;
    const user = auth.user;
    const team = auth.team;
    const activeContext = auth.active_context ?? 'personal';
    const teamMember = auth.teamMember;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [dialerOpen, setDialerOpen] = useState(false);
    const [dialerNumber, setDialerNumber] = useState('');
    const [dialerContactId, setDialerContactId] = useState<number | null>(null);
    const [dialerContactName, setDialerContactName] = useState('');
    const [incomingCall, setIncomingCall] = useState<{ callControlId: string; fromNumber: string; toNumber: string; contact: any } | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);

    // Cmd/Ctrl-K opens global search from anywhere in the app.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen((v) => !v);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Listen for incoming calls via Echo
    useEffect(() => {
        if (typeof window.Echo === 'undefined' || !user) return;
        const channel = window.Echo.private(`user.${user.id}`);
        const handler = (e: any) => {
            setIncomingCall(e);
        };
        channel.listen('.IncomingCall', handler);
        return () => { channel.stopListening('.IncomingCall', handler); };
    }, [user?.id]);

    // Expose a global function to open the dialer from anywhere
    useEffect(() => {
        window.__openDialer = (number?: string, contactId?: number, contactName?: string) => {
            setDialerNumber(number || '');
            setDialerContactId(contactId || null);
            setDialerContactName(contactName || '');
            setDialerOpen(true);
        };
        return () => { delete window.__openDialer; };
    }, []);

    // Account switcher only for invited (non-owner) users who belong to a team
    const isOwner = teamMember?.role === 'owner';
    const showAccountSwitcher = !!user.team_id && !!team && !isOwner;

    // Filter navigation based on context and role
    const navigation = baseNavigation.filter((item) => {
        if (item.name === 'Team') {
            // Only show Team nav when in team context AND user is owner/admin
            if (activeContext !== 'team' || !teamMember) return false;
            return teamMember.role === 'owner' || teamMember.role === 'admin';
        }
        return true;
    });

    // A nav item is locked when it maps to a plan feature the user lacks.
    // Admins bypass (mirrors the server-side EnsureFeature middleware).
    const features = auth.features ?? {};
    const isLocked = (feature?: string) => !!feature && !auth.is_admin && !features[feature];
    // Locked items route to the subscription/upgrade page instead of the gated module.
    const navTarget = (item: { href: string; feature?: string }) =>
        isLocked(item.feature) ? route('crm.settings.tab', { tab: 'subscription' }) : route(item.href);

    const switchContext = (context: 'personal' | 'team') => {
        router.post(route('crm.account.switch'), { context }, { preserveState: false });
    };

    return (
        <div className="min-h-screen bg-[#F7F8FB]">
            {/* Top bar */}
            <header className="sticky top-0 z-30 h-14 bg-[#282B36]">
                <div className="flex h-full items-stretch">
                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        className="flex items-center px-4 text-white/50 hover:text-white hover:bg-white/10 transition-colors md:hidden"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>

                    {/* Logo */}
                    <Link href={route('crm.dashboard')} className="flex items-center shrink-0 px-5 border-r border-white/10">
                        <Logo variant="icon" size="sm" className="text-white" />
                    </Link>

                    {/* Desktop navigation */}
                    <nav className="hidden md:flex items-stretch overflow-x-auto">
                        {navigation.map((item) => {
                            const isActive = route().current(item.href) || route().current(item.href.replace('.index', '.*'));
                            const locked = isLocked(item.feature);
                            return (
                                <Link
                                    key={item.name}
                                    href={navTarget(item)}
                                    title={locked ? 'Upgrade your plan to use this feature' : undefined}
                                    className={`flex items-center justify-center gap-1.5 px-3.5 lg:px-4 text-[13px] font-normal border-r border-white/10 transition-colors whitespace-nowrap ${
                                        isActive
                                            ? 'bg-white/15 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {item.name}
                                    {locked && (
                                        <svg className="h-3 w-3 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right side actions */}
                    <div className="ml-auto flex items-stretch">
                        {/* Marketing Tools mega-menu */}
                        <div className="hidden md:flex items-stretch border-l border-white/10">
                            <ToolsMegaMenu isActive={route().current('crm.tools.*') || route().current('crm.tools.index') || route().current('crm.landing-pages.*')} />
                        </div>
                        {/* Account context switcher - only for invited (non-owner) users */}
                        {showAccountSwitcher && (
                            <div className="hidden sm:flex items-center border-l border-white/10">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <button className="flex items-center gap-2 px-3 h-full hover:bg-white/10 transition-colors">
                                            <span className={`h-2 w-2 rounded-full ${activeContext === 'team' ? 'bg-[#22C55E]' : 'bg-[#1693C9]'}`} />
                                            <span className="text-xs font-medium text-white/80 max-w-[120px] truncate">
                                                {activeContext === 'team' ? team.name : user.name}
                                            </span>
                                            <svg className="h-3 w-3 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </button>
                                    </Dropdown.Trigger>
                                    <Dropdown.Content align="right" width="48">
                                        <div className="px-3 py-2 border-b border-[#E4E7EB]">
                                            <p className="text-[10px] font-medium text-[#8B9096] tracking-wider">Switch Account</p>
                                        </div>
                                        <button
                                            onClick={() => switchContext('personal')}
                                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors ${
                                                activeContext === 'personal' ? 'bg-[#E6F0FF] text-[#111315] font-medium' : 'text-[#5F656D] hover:bg-[#F9FAFB]'
                                            }`}
                                        >
                                            <span className={`h-2 w-2 rounded-full ${activeContext === 'personal' ? 'bg-[#1693C9]' : 'bg-[#D1D5DB]'}`} />
                                            {user.name}
                                            {activeContext === 'personal' && (
                                                <svg className="h-3.5 w-3.5 ml-auto text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                </svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => switchContext('team')}
                                            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors ${
                                                activeContext === 'team' ? 'bg-[#F0FDF4] text-[#111315] font-medium' : 'text-[#5F656D] hover:bg-[#F9FAFB]'
                                            }`}
                                        >
                                            <span className={`h-2 w-2 rounded-full ${activeContext === 'team' ? 'bg-[#22C55E]' : 'bg-[#D1D5DB]'}`} />
                                            {team.name}
                                            {activeContext === 'team' && (
                                                <svg className="h-3.5 w-3.5 ml-auto text-[#22C55E]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                </svg>
                                            )}
                                        </button>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        )}

                        {/* Power Dialer */}
                        <Link
                            href={route('crm.dialer.sessions.index')}
                            className="flex items-center justify-center w-10 sm:w-12 text-white/50 hover:text-white hover:bg-white/10 border-l border-white/10 transition-colors"
                            title="Power Dialer"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                            </svg>
                        </Link>

                        {/* Search */}
                        <button
                            type="button"
                            onClick={() => setSearchOpen(true)}
                            className="flex items-center justify-center w-10 sm:w-12 text-white/50 hover:text-white hover:bg-white/10 border-l border-white/10 transition-colors"
                            title="Search (⌘K)"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </button>

                        {/* Notifications */}
                        <NotificationsDropdown />

                        {/* Settings */}
                        <Link
                            href={route('crm.settings')}
                            title="Settings"
                            className="flex items-center justify-center w-10 sm:w-12 text-white/50 hover:text-white hover:bg-white/10 border-l border-white/10 transition-colors"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.137-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                        </Link>

                        {/* Team Chat */}
                        {team && (
                            <TeamChatButton
                                isOpen={chatOpen}
                                onClick={() => setChatOpen(!chatOpen)}
                                unreadCount={chatUnreadCount}
                            />
                        )}

                        {/* User dropdown */}
                        <div className="flex items-center border-l border-white/10 px-2 sm:px-3">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="flex items-center rounded-full p-1 hover:bg-white/10 transition-colors">
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white font-semibold text-sm">
                                            {user.name.charAt(0).toUpperCase()}
                                        </span>
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('crm.settings')}>Settings</Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button">
                                        Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                {/* Mobile navigation dropdown */}
                {mobileOpen && (
                    <nav className="border-t border-white/10 bg-[#282B36] px-4 py-2 md:hidden">
                        {/* Mobile account switcher */}
                        {showAccountSwitcher && (
                            <div className="border-b border-white/10 pb-2 mb-2">
                                <p className="text-[10px] font-medium text-white/40 tracking-wider px-3 mb-1">Account</p>
                                <button
                                    onClick={() => switchContext('personal')}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeContext === 'personal' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${activeContext === 'personal' ? 'bg-[#1693C9]' : 'bg-white/30'}`} />
                                    {user.name}
                                </button>
                                <button
                                    onClick={() => switchContext('team')}
                                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeContext === 'team' ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${activeContext === 'team' ? 'bg-[#22C55E]' : 'bg-white/30'}`} />
                                    {team.name}
                                </button>
                            </div>
                        )}
                        {navigation.map((item) => {
                            const isActive = route().current(item.href) || route().current(item.href.replace('.index', '.*'));
                            const locked = isLocked(item.feature);
                            return (
                                <Link
                                    key={item.name}
                                    href={navTarget(item)}
                                    className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                        isActive
                                            ? 'bg-white/15 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {item.name}
                                    {locked && (
                                        <svg className="h-3.5 w-3.5 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                        </svg>
                                    )}
                                </Link>
                            );
                        })}
                        <Link
                            href={route('crm.tools.index')}
                            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                route().current('crm.tools.*') || route().current('crm.tools.index')
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            Marketing
                        </Link>
                    </nav>
                )}
            </header>

            {/* Team Chat Panel */}
            {team && (
                <TeamChatPanel
                    isOpen={chatOpen}
                    onClose={() => setChatOpen(false)}
                    teamName={team.name}
                    teamMembers={team.members || []}
                    onUnreadCountChange={setChatUnreadCount}
                    teamId={team.id}
                    currentUserId={user.id}
                />
            )}

            {/* Resume-active-dialer banner — shown anywhere in CRM if the user has an unfinished session.
                Hidden on the dialer page itself (route already matches). */}
            {activeDialerSession && !route().current('crm.dialer.sessions.show') && (
                <Link
                    href={route('crm.dialer.sessions.show', { dialerSession: activeDialerSession.id })}
                    className={`flex items-center gap-3 px-4 sm:px-6 py-2 text-[12px] font-medium border-b transition-colors ${
                        activeDialerSession.status === 'paused'
                            ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]'
                            : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#047857] hover:bg-[#D1FAE5]'
                    }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${activeDialerSession.status === 'paused' ? 'bg-[#B45309]' : 'bg-[#047857] animate-pulse'}`} />
                    <span>
                        {activeDialerSession.status === 'paused' ? 'Paused' : 'Active'} Power Dialer session:
                        <strong className="ml-1">{activeDialerSession.name ?? `Session #${activeDialerSession.id}`}</strong>
                        <span className="ml-2 text-[#5F656D]">· {activeDialerSession.current_position} of {activeDialerSession.total_contacts}</span>
                    </span>
                    <span className="ml-auto underline">Resume →</span>
                </Link>
            )}

            {/* Page content */}
            <main>{children}</main>

            <Toast />

            <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

            {/* Phone Dialer */}
            <PhoneDialer
                visible={dialerOpen}
                initialNumber={dialerNumber}
                contactId={dialerContactId}
                contactName={dialerContactName}
                onClose={() => {
                    setDialerOpen(false);
                    setDialerNumber('');
                    setDialerContactId(null);
                    setDialerContactName('');
                }}
            />

            {/* Incoming Call Banner */}
            {incomingCall && (
                <IncomingCallBanner
                    call={incomingCall}
                    onAnswer={() => {
                        setDialerNumber(incomingCall.fromNumber);
                        setDialerContactName(incomingCall.contact?.name || '');
                        setDialerContactId(incomingCall.contact?.id || null);
                        setDialerOpen(true);
                        setIncomingCall(null);
                    }}
                    onDecline={() => setIncomingCall(null)}
                />
            )}
        </div>
    );
}
