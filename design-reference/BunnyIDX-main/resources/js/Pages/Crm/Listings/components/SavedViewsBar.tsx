import { FormEvent, useMemo } from 'react';
import type { SavedView } from '../types';

interface Props {
    savedViews: SavedView[];
    currentFilters: Record<string, unknown>;
    hasActiveFilters: boolean;
    showSaveForm: boolean;
    saveName: string;
    saving: boolean;
    onApply: (view: SavedView) => void;
    onDelete: (id: number) => void;
    onStartSave: () => void;
    onChangeSaveName: (v: string) => void;
    onCancelSave: () => void;
    onSubmitSave: (e: FormEvent) => void;
}

/**
 * Header chip strip of saved CRM-listing views. Hidden when the user has no
 * saved views; doubles as an inline "create view" form when the user has
 * filters active but no matching view exists.
 */
export default function SavedViewsBar({
    savedViews, currentFilters, hasActiveFilters,
    showSaveForm, saveName, saving,
    onApply, onDelete,
    onStartSave, onChangeSaveName, onCancelSave, onSubmitSave,
}: Props) {
    // Cheap stringify-once instead of per-view inside the map. Same comparison
    // behavior as before, but only one stringify of the current filters per
    // render of the strip.
    const currentKey = useMemo(() => JSON.stringify(currentFilters), [currentFilters]);

    return (
        <>
            {savedViews.length > 0 && (
                <div className="hidden md:flex items-center gap-0.5 bg-white border border-[#C8CCD1] rounded-[4px] p-1">
                    <span className="px-2 text-[10px] font-semibold text-[#8B9096] whitespace-nowrap">Views</span>
                    {savedViews.map((view) => {
                        const isActive = currentKey === JSON.stringify(view.filters);
                        return (
                            <div key={view.id} className="relative flex items-center group">
                                <button
                                    onClick={() => onApply(view)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                                        isActive ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'
                                    }`}
                                >
                                    {view.name}
                                </button>
                                <button
                                    onClick={() => onDelete(view.id)}
                                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-4 h-4 bg-white border border-[#E4E7EB] shadow-sm rounded-full flex items-center justify-center text-[#8B9096] hover:text-[#EF4444] transition-all z-10"
                                >
                                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                    {hasActiveFilters && !showSaveForm && (
                        <button
                            onClick={onStartSave}
                            className="flex items-center justify-center w-6 h-6 rounded-[4px] text-[#8B9096] hover:text-[#111315] hover:bg-white transition-colors"
                            title="Save current view"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </button>
                    )}
                </div>
            )}

            {showSaveForm && (
                <form onSubmit={onSubmitSave} className="flex items-center gap-1.5 shrink-0">
                    <input
                        type="text"
                        value={saveName}
                        onChange={(e) => onChangeSaveName(e.target.value)}
                        placeholder="View name..."
                        autoFocus
                        className="h-7 w-32 px-2.5 text-xs border border-[#ECEEF1] bg-white text-[#303030] placeholder-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#1693C9] rounded-[4px]"
                    />
                    <button
                        type="submit"
                        disabled={!saveName.trim() || saving}
                        className="h-7 px-2.5 text-[11px] font-medium bg-[#1693C9] text-white rounded-[4px] disabled:opacity-30"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onCancelSave}
                        className="text-[11px] text-[#8B9096] hover:text-[#111315]"
                    >
                        Cancel
                    </button>
                </form>
            )}
        </>
    );
}
