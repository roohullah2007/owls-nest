import { FormEvent, useEffect } from 'react';
import type { OfficeConfig } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    config: OfficeConfig;
    inputValue: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
    saving: boolean;
}

export default function OfficeConfigModal({ isOpen, onClose, config, inputValue, onInputChange, onSubmit, saving }: Props) {
    useEffect(() => {
        if (!isOpen) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-[4px] shadow-xl z-10 mx-4">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#E0E2E7] bg-[#F3F4F6]">
                    <h2 className="text-[14px] font-semibold text-[#111315]">Configure Office MLS ID</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[#5F656D] hover:text-[#111315] transition-colors"
                        aria-label="Close"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-5 py-5">
                    <p className="text-[13px] text-[#5F656D] mb-1.5">
                        {config.scope === 'team'
                            ? (config.can_edit
                                ? "Set your team's Office MLS ID to load all listings from your office."
                                : 'Your team admin needs to set the Office MLS ID.')
                            : 'Set your Office MLS ID to load all listings from your office.'}
                    </p>
                    <p className="text-xs text-[#8B9096] mb-4">Find it in your MLS dashboard (sometimes called ListOfficeMlsId).</p>

                    {config.can_edit ? (
                        <form onSubmit={onSubmit} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => onInputChange(e.target.value)}
                                placeholder="e.g. ABC123"
                                autoFocus
                                className="flex-1 h-9 px-3 text-[13px] bg-white text-[#111315] placeholder-[#8B9096] border border-[#C8CCD1] rounded-[4px] focus:outline-none focus:border-[#1693C9] focus:ring-0"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || saving}
                                className="h-9 px-5 bg-[#1693C9] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                            >
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </form>
                    ) : (
                        <p className="text-xs text-[#8B9096] italic">Contact your team admin to configure.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
