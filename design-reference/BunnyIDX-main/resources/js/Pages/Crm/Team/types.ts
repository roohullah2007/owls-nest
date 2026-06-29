import type { TeamMemberPermissions } from '@/types';

export interface TeamMemberItem {
    id: number;
    user_id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    accepted_at: string | null;
}

export interface Invitation {
    id: number;
    email: string;
    role: string;
    expires_at: string;
    invited_by_name: string;
    /** Latest team-invitation email send status (queued/sent/failed/…) or null if none. */
    email_status: string | null;
}

export interface Team {
    id: number;
    name: string;
    owner_id: number;
    created_at: string | null;
    members: TeamMemberItem[];
    invitations: Invitation[];
}

export interface TeamPageProps {
    team: Team | null;
    userRole: string | null;
    rolePermissions: Record<string, TeamMemberPermissions>;
    availableRoles: string[];
    teamStats: { memberCount: number; activeCount: number; pendingInvitations: number };
    canUseTeamFeatures: boolean;
}

export type TeamTab = 'members' | 'invitations' | 'permissions' | 'settings';
