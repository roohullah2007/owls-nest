export const BUILT_IN_ROLES = ['admin', 'agent'];

const DEFAULT_ROLE_COLORS: Record<string, string> = {
    owner: '#111315',
    admin: '#1693C9',
    agent: '#5F656D',
};

const CUSTOM_ROLE_COLORS = [
    '#059669', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#0D9488', '#D7B500',
];

export function getRoleColor(role: string, index?: number): string {
    if (DEFAULT_ROLE_COLORS[role]) return DEFAULT_ROLE_COLORS[role];
    return CUSTOM_ROLE_COLORS[(index ?? role.length) % CUSTOM_ROLE_COLORS.length];
}

export function getRoleLabel(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ');
}

export const CONTACT_TYPE_OPTIONS = ['buyer', 'seller', 'lead', 'tenant', 'vendor', 'referral', 'other'];

import type { TeamMemberPermissions } from '@/types';

export const DEFAULT_PERMISSIONS: TeamMemberPermissions = {
    listings: 'all',
    contacts: 'all',
    contact_types: [],
    tasks: 'all',
    calendar: 'all',
    deals: 'all',
    phone: 'own',
};
