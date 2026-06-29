import React from 'react';
import { ActiveSection, SECTION_TITLES } from './navConfig';

interface Props {
    activeSection: ActiveSection;
    isDirty: boolean;
    recentlySuccessful: boolean;
    lastSavedFormatted: string;
    siteUrl: string;
    showSave: boolean;
    saveDisabled: boolean;
    saveLabel: string;
    onSave: () => void;
    topBarAction: { label: string; onClick: () => void } | null;
}

export default function EditorTopBar({
    activeSection,
    isDirty,
    recentlySuccessful,
    lastSavedFormatted,
    siteUrl,
    showSave,
    saveDisabled,
    saveLabel,
    onSave,
    topBarAction,
}: Props) {
    return (
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E4E7EB]">
            <div className="flex items-center justify-between h-12 px-8 max-w-4xl">
                <div className="flex items-center gap-3">
                    <h2 className="text-[14px] font-semibold text-[#111315]">{SECTION_TITLES[activeSection]}</h2>
                    {isDirty && (
                        <span className="text-[11px] text-amber-600 font-medium">Unsaved changes</span>
                    )}
                    {!isDirty && recentlySuccessful && (
                        <span className="text-[11px] text-[#059669] font-medium">{lastSavedFormatted}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {topBarAction && (
                        <button
                            type="button"
                            onClick={topBarAction.onClick}
                            className="h-8 px-4 bg-[#111315] text-white text-[12px] font-medium rounded-lg hover:bg-[#2a2d30] transition-colors"
                        >
                            {topBarAction.label}
                        </button>
                    )}
                    <a
                        href={siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-4 flex items-center gap-1.5 text-[12px] font-medium text-[#5F656D] bg-white border border-[#E4E7EB] rounded-lg hover:bg-[#F9FAFB] hover:text-[#111315] transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        Preview
                    </a>
                    {showSave && (
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={saveDisabled}
                            className="h-8 px-5 bg-[#111315] text-white text-[12px] font-medium rounded-lg hover:bg-[#2a2d30] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                        >
                            {saveLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
