import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { PageProps } from '@/types';
import type { TeamPageProps, TeamTab } from './types';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import CreateTeamCard from './components/CreateTeamCard';
import MembersTab from './components/MembersTab';
import InvitationsTab from './components/InvitationsTab';
import PermissionsTab from './components/PermissionsTab';
import SettingsTab from './components/SettingsTab';
import TeamSidebar from './components/TeamSidebar';

const TAB_LABELS: Record<TeamTab, string> = {
    members: 'Members',
    invitations: 'Invitations',
    permissions: 'Permissions',
    settings: 'Settings',
};

export default function TeamIndex({
    team,
    userRole,
    rolePermissions,
    availableRoles,
    teamStats,
    canUseTeamFeatures,
}: TeamPageProps) {
    const { auth } = usePage<PageProps>().props;
    const currentUser = auth.user;
    const [tab, setTab] = useState<TeamTab>('members');

    const canManage = userRole === 'owner' || userRole === 'admin';

    // No team yet: Team-plan users (or admins) get the create-team flow;
    // everyone else gets an upgrade prompt instead of a dead create form.
    if (!team) {
        if (canUseTeamFeatures || auth.is_admin) {
            return (
                <CrmLayout>
                    <Head title="Team" />
                    <CreateTeamCard />
                </CrmLayout>
            );
        }
        return (
            <CrmLayout>
                <Head title="Team" />
                <div className="max-w-xl mx-auto mt-10 bg-white border border-[#E4E7EB] rounded-xl p-8 text-center">
                    <div className="h-12 w-12 mx-auto rounded-xl bg-[#E6F0FF] flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                    </div>
                    <h1 className="text-lg font-semibold text-[#111315] mb-1">Team collaboration is a Team-plan feature</h1>
                    <p className="text-sm text-[#5F656D] mb-6">
                        Invite team members, assign leads, share an inbox and deal board, and see team reports.
                        Upgrade to the Team plan to create your workspace.
                    </p>
                    <Link
                        href={route('crm.settings.tab', { tab: 'subscription' })}
                        className="inline-flex items-center h-9 px-5 text-xs font-medium bg-[#1693C9] text-white hover:bg-[#1380AF] rounded-lg transition-colors"
                    >
                        View Team plan
                    </Link>
                </div>
            </CrmLayout>
        );
    }

    return (
        <CrmLayout>
            <Head title="Team" />

            <div className="flex items-stretch">
                {/* Left sidebar */}
                <TeamSidebar
                    tab={tab}
                    onSwitchTab={setTab}
                    memberCount={teamStats.memberCount}
                    pendingInvitations={teamStats.pendingInvitations}
                    canManage={canManage}
                    onInviteClick={() => setTab('invitations')}
                />

                {/* Main content */}
                <div className="flex-1 min-w-0 overflow-auto px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
                    <div className="mx-auto max-w-[1350px] space-y-3">

                        {/* Mobile tab switcher */}
                        <div className="md:hidden flex gap-1 bg-white border border-[#E4E7EB] rounded-full p-1 mt-3">
                            {(Object.keys(TAB_LABELS) as TeamTab[]).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTab(t)}
                                    className={`flex-1 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
                                        tab === t ? 'bg-[#111315] text-white' : 'text-[#5F656D]'
                                    }`}
                                >
                                    {TAB_LABELS[t]}
                                </button>
                            ))}
                        </div>

                        {/* Page header */}
                        <div className="flex items-center gap-3 flex-wrap pt-3 md:pt-4">
                            <h1 className="text-lg font-normal text-[#111315]">{TAB_LABELS[tab]}</h1>
                            <div className="flex-1" />
                            {tab === 'members' && canManage && (
                                <PrimaryButton onClick={() => setTab('invitations')} label="Invite" />
                            )}
                        </div>

                        {/* Tab content */}
                        {tab === 'members' && (
                            <MembersTab
                                members={team.members}
                                availableRoles={availableRoles}
                                canManage={canManage}
                                currentUserId={currentUser.id}
                                isOwner={userRole === 'owner'}
                                memberCount={teamStats.memberCount}
                                activeCount={teamStats.activeCount}
                                pendingInvitations={teamStats.pendingInvitations}
                            />
                        )}

                        {tab === 'invitations' && (
                            <InvitationsTab
                                invitations={team.invitations}
                                canManage={canManage}
                                availableRoles={availableRoles}
                            />
                        )}

                        {tab === 'permissions' && (
                            <PermissionsTab
                                teamId={team.id}
                                availableRoles={availableRoles}
                                rolePermissions={rolePermissions}
                                members={team.members}
                                canManage={canManage}
                            />
                        )}

                        {tab === 'settings' && (
                            <SettingsTab
                                team={team}
                                userRole={userRole}
                                canManage={canManage}
                                currentUserId={currentUser.id}
                                teamStats={teamStats}
                            />
                        )}
                    </div>
                </div>
            </div>
        </CrmLayout>
    );
}
