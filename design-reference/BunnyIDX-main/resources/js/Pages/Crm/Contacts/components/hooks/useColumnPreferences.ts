import { useState, useEffect, useRef, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Column } from '../types';
import { STORAGE_KEY, COL_WIDTHS_KEY } from '../constants';
import { getInitialColumns } from '../utils';

/**
 * Owns the contact table's column state: which columns are visible (and their
 * order), per-column widths with drag-to-resize, localStorage persistence, and
 * a debounced server sync so preferences travel across devices.
 *
 * Pure extraction from the Contacts index page — behaviour is unchanged.
 */
export function useColumnPreferences(
    allColumns: Column[],
    columnPreferences: Parameters<typeof getInitialColumns>[1],
) {
    const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getInitialColumns(allColumns, columnPreferences));

    // Column widths with localStorage persistence
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        if (typeof window === 'undefined') return {};
        try {
            const stored = localStorage.getItem(COL_WIDTHS_KEY);
            if (stored) return JSON.parse(stored);
        } catch {}
        return {};
    });
    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    function getColWidth(col: Column): number {
        return columnWidths[col.key] || col.width;
    }

    const handleResizeMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = e.clientX - resizingRef.current.startX;
        const newWidth = Math.max(60, resizingRef.current.startWidth + delta);
        setColumnWidths((prev) => ({ ...prev, [resizingRef.current!.key]: newWidth }));
    }, []);

    const handleResizeMouseUp = useCallback(() => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [handleResizeMouseMove]);

    function startResize(e: ReactMouseEvent, col: Column) {
        e.preventDefault();
        resizingRef.current = { key: col.key, startX: e.clientX, startWidth: getColWidth(col) };
        document.addEventListener('mousemove', handleResizeMouseMove);
        document.addEventListener('mouseup', handleResizeMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
    }, [visibleColumns]);

    useEffect(() => {
        if (Object.keys(columnWidths).length > 0) {
            localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(columnWidths));
        }
    }, [columnWidths]);

    // Debounced server sync — saves order + visibility + widths against the user
    // so preferences travel across devices.
    const syncedOnceRef = useRef(false);
    useEffect(() => {
        // Skip the very first render — that's just the initial state from the
        // server, no need to echo it back.
        if (!syncedOnceRef.current) { syncedOnceRef.current = true; return; }
        const t = setTimeout(() => {
            const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            fetch(route('crm.contacts.column-preferences.update'), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                body: JSON.stringify({ order: visibleColumns, visible: visibleColumns, widths: columnWidths }),
            }).catch(() => {});
        }, 600);
        return () => clearTimeout(t);
    }, [visibleColumns, columnWidths]);

    // Preserve the user's chosen order (visibleColumns is the source of truth).
    const activeColumns = visibleColumns
        .map((key) => allColumns.find((c) => c.key === key))
        .filter((c): c is Column => !!c);

    function toggleColumn(key: string) {
        setVisibleColumns((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
    }

    return { visibleColumns, setVisibleColumns, getColWidth, startResize, toggleColumn, activeColumns };
}
