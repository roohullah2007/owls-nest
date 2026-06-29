import { useEffect, useRef, useState } from 'react';
import { Filters, StatusMode } from '../types';

interface Props {
    filters: Filters;
    onApply: (next: Filters) => void;
    drawing?: boolean;
    polygonActive?: boolean;
    onToggleDraw?: () => void;
    onCancelDraw?: () => void;
    onClearShape?: () => void;
    /** Hide the Draw/Cancel/Clear buttons (grid view — no map). */
    showDraw?: boolean;
    /** Taxonomy-driven: hide Sold when the MLS doesn't carry the status. */
    hasSold?: boolean;
    /** Layout mode: map overlay (absolute) or inline bar (grid view). */
    overlay?: boolean;
}

const STATUS_LABELS: Record<StatusMode, string> = { all: 'All', active: 'Active', sold: 'Sold' };

/** Active-listings days-on-market refinement → new_within_days. */
const DOM_RANGES: Array<[string, string]> = [
    ['', 'Any time on market'],
    ['7', 'Last 7 days'],
    ['10', 'Last 10 days'],
    ['15', 'Last 15 days'],
    ['30', 'Last 30 days'],
    ['60', 'Last 2 months'],
];

/** Sold timeframe → sold_within_days (supported by MlsQuery/the gateway). */
const SOLD_RANGES: Array<[string, string]> = [
    ['', 'Any time'],
    ['30', 'Last 30 days'],
    ['90', 'Last 3 months'],
    ['180', 'Last 6 months'],
    ['365', 'Last year'],
    ['730', 'Last 2 years'],
];

const I = {
    chevron: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
    priceTag: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>,
    draw: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>,
    clear: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 8" /></svg>,
};

/**
 * Map-overlay status controls (top-left of the map, like the original design):
 * Active toggle with a days-on-market dropdown, Sold quick toggle with a
 * timeframe dropdown, Price Changed, and the Draw / Cancel / Clear Boundary
 * buttons. All commit immediately onto the APPLIED filters.
 */
export default function StatusRow({ filters, onApply, drawing = false, polygonActive = false, onToggleDraw, onCancelDraw, onClearShape, showDraw = true, overlay = true, hasSold = true }: Props) {
    const [statusMenu, setStatusMenu] = useState(false);
    const [soldMenu, setSoldMenu] = useState(false);
    const statusRef = useRef<HTMLDivElement>(null);
    const soldRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!statusMenu && !soldMenu) return;
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (statusMenu && !statusRef.current?.contains(t)) setStatusMenu(false);
            if (soldMenu && !soldRef.current?.contains(t)) setSoldMenu(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [statusMenu, soldMenu]);

    const commit = (patch: Partial<Filters>) => onApply({ ...filters, ...patch });
    const setStatusMode = (mode: StatusMode) =>
        commit({ statusMode: mode, soldWithinDays: mode === 'sold' ? filters.soldWithinDays : '' });

    const mode = filters.statusMode;
    const soldRangeLabel = SOLD_RANGES.find(([v]) => v === filters.soldWithinDays)?.[1] ?? 'Any time';

    return (
        <div className={`ps-status-row flex flex-wrap items-center gap-2 ${overlay ? 'absolute left-3 top-3 z-[5]' : 'border-b border-gray-200 bg-white px-4 py-2'}`}>
            {/* Active toggle + days-on-market dropdown (independent of Sold). */}
            <div ref={statusRef} className="relative shrink-0">
                <div className="ps-row2-group" data-variant="active" data-active={mode === 'active' || mode === 'all'}>
                    <button type="button" onClick={() => setStatusMode('active')} title="Show active listings">
                        {STATUS_LABELS[mode] === 'All' ? 'Active' : STATUS_LABELS[mode] === 'Active' && filters.newDays ? `Active · ${DOM_RANGES.find(([v]) => v === filters.newDays)?.[1] ?? ''}` : 'Active'}
                    </button>
                    <button type="button" aria-label="Filter active listings by days on market" aria-expanded={statusMenu} onClick={() => setStatusMenu((o) => !o)}>
                        {I.chevron}
                    </button>
                </div>
                {statusMenu && (
                    <div className="ps-row2-menu">
                        <div className="ps-menu">
                            {DOM_RANGES.map(([value, label]) => (
                                <button key={value || 'any'} type="button" aria-pressed={mode === 'active' && filters.newDays === value} onClick={() => { commit({ statusMode: 'active', newDays: value, soldWithinDays: '' }); setStatusMenu(false); }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Sold quick toggle + timeframe refinement (sold_within_days) */}
            {hasSold && (
            <div ref={soldRef} className="relative shrink-0">
                <div className="ps-row2-group" data-variant="sold" data-active={mode === 'sold'}>
                    <button type="button" onClick={() => setStatusMode(mode === 'sold' ? 'active' : 'sold')} title="Show sold listings">
                        Sold
                    </button>
                    {mode === 'sold' && (
                        <button type="button" aria-label="Sold timeframe" aria-expanded={soldMenu} onClick={() => setSoldMenu((o) => !o)} style={{ fontSize: 11 }}>
                            {soldRangeLabel}
                            {I.chevron}
                        </button>
                    )}
                </div>
                {soldMenu && (
                    <div className="ps-row2-menu">
                        <div className="ps-menu">
                            {SOLD_RANGES.map(([value, label]) => (
                                <button key={value || 'any'} type="button" aria-pressed={filters.soldWithinDays === value} onClick={() => { commit({ soldWithinDays: value }); setSoldMenu(false); }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            )}


            {/* Price Changed → recently_reduced (a for-sale concept — hidden on rentals) */}
            {filters.transaction !== 'rent' && (
                <button type="button" className="ps-row2-pill shrink-0" aria-pressed={filters.priceReduced} onClick={() => commit({ priceReduced: !filters.priceReduced })} title="Only listings with a recent price reduction">
                    {I.priceTag}
                    Price Changed
                </button>
            )}

            {/* Draw / Cancel / Clear Boundary (map view only) */}
            {showDraw && (
            <>
            <button
                type="button"
                aria-pressed={drawing}
                onClick={onToggleDraw}
                className="ps-draw-btn flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                style={{ height: 36, whiteSpace: 'nowrap' }}
                title={drawing ? 'Click the map to outline an area, right-click to undo, Esc to cancel' : polygonActive ? 'Redraw the search area' : 'Draw a search area'}
            >
                {I.draw}
                <span>{drawing ? 'Apply area' : 'Draw'}</span>
            </button>
            {drawing ? (
                <button
                    type="button"
                    onClick={onCancelDraw}
                    className="ps-draw-cancel flex shrink-0 items-center rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    style={{ height: 36 }}
                    title="Cancel (Esc)"
                >
                    Cancel
                </button>
            ) : polygonActive && (
                <button
                    type="button"
                    onClick={onClearShape}
                    className="ps-clear-btn flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    style={{ height: 36, whiteSpace: 'nowrap' }}
                    title="Remove the drawn search area"
                >
                    {I.clear}
                    <span>Clear Boundary</span>
                </button>
            )}
            </>
            )}
        </div>
    );
}
