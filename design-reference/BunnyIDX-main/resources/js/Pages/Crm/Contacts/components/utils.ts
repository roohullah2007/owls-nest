import { Column } from './types';
import { STORAGE_KEY } from './constants';

/**
 * Resolves the user's preferred visible columns + order. Server preferences
 * (synced across devices) win; falls back to localStorage, then to columns
 * marked defaultVisible.
 */
export function getInitialColumns(
    allCols: Column[],
    serverPref?: { order?: string[]; visible?: string[] } | null,
): string[] {
    const validKeys = new Set(allCols.map((c) => c.key));

    // 1) Server-side preference (logged-in user, cross-device).
    if (serverPref?.visible && Array.isArray(serverPref.visible)) {
        const order = serverPref.order && Array.isArray(serverPref.order) ? serverPref.order : serverPref.visible;
        const visible = new Set(serverPref.visible);
        const ordered = order.filter((k) => validKeys.has(k) && visible.has(k));
        // Append any visible keys missing from the order list (e.g. newly added columns).
        serverPref.visible.forEach((k) => { if (validKeys.has(k) && !ordered.includes(k)) ordered.push(k); });
        if (ordered.length > 0) return ordered;
    }

    // 2) localStorage (anonymous fallback).
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as string[];
                const filtered = parsed.filter((k) => validKeys.has(k));
                if (filtered.length > 0) return filtered;
            }
        } catch {}
    }

    // 3) Defaults from the column definitions.
    return allCols.filter((c) => c.defaultVisible).map((c) => c.key);
}

export function capitalize(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
