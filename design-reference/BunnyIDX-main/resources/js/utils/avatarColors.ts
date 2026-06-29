export const AVATAR_PALETTE = [
    '#1693C9',
    '#7C3AED',
    '#0E7490',
    '#D97706',
    '#0891B2',
    '#4F46E5',
    '#059669',
    '#475569',
    '#7C2D12',
    '#4338CA',
] as const;

export function getAvatarColor(id: number): string {
    return AVATAR_PALETTE[id % AVATAR_PALETTE.length];
}

export function getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === '') return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
