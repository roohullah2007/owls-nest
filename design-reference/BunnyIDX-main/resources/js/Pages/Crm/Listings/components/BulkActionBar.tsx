import { ReactNode } from 'react';

interface Props {
    count: number;
    onClear: () => void;
    actions?: ReactNode;
}

/**
 * Sticky bottom bar shown when any rows are selected.
 * Caller supplies optional contextual action buttons via `actions`.
 */
export default function BulkActionBar({ count, onClear, actions }: Props) {
    if (count === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-11 bg-[#111315]">
            <div className="flex items-stretch h-full">
                <div className="flex items-center px-3 sm:px-5 border-r border-white/10 shrink-0">
                    <span className="text-xs font-medium text-white">{count} selected</span>
                </div>
                {actions}
                <div className="flex-1" />
                <button
                    onClick={onClear}
                    className="flex items-center px-3 sm:px-5 text-xs font-medium text-white/40 border-l border-white/10 hover:text-white hover:bg-white/10 transition-colors"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
