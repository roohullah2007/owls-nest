import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mls_pinned_listings';
const EVENT = 'mls-pinned-listings-changed';

function read(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        return new Set(Array.isArray(arr) ? arr.map(String) : []);
    } catch {
        return new Set();
    }
}

function write(set: Set<string>) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    window.dispatchEvent(new CustomEvent(EVENT));
}

/**
 * Lightweight "pin" toggle for MLS listings keyed by `<mls_slug>:<mls_id>`.
 * Backed by localStorage and synced across components via a custom event,
 * so the table and the drawer both see the same set without prop drilling.
 *
 * Server-side persistence can be layered on later — the hook contract stays
 * the same, just swap the storage adapter.
 */
export function usePinnedListings() {
    const [pinned, setPinned] = useState<Set<string>>(read);

    useEffect(() => {
        const onChange = () => setPinned(read());
        window.addEventListener(EVENT, onChange);
        window.addEventListener('storage', onChange);
        return () => {
            window.removeEventListener(EVENT, onChange);
            window.removeEventListener('storage', onChange);
        };
    }, []);

    const key = useCallback((mlsSlug: string, mlsId: string) => `${mlsSlug}:${mlsId}`, []);

    const isPinned = useCallback(
        (mlsSlug: string, mlsId: string) => pinned.has(key(mlsSlug, mlsId)),
        [pinned, key],
    );

    const togglePin = useCallback(
        (mlsSlug: string, mlsId: string) => {
            const next = new Set(read());
            const k = `${mlsSlug}:${mlsId}`;
            if (next.has(k)) next.delete(k);
            else next.add(k);
            write(next);
            setPinned(next);
        },
        [],
    );

    return { pinned, isPinned, togglePin };
}
