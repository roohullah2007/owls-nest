/**
 * Removable active-filter chip rendered in the toolbar banner. Click the × to
 * drop just this filter from the URL while keeping every other one applied.
 */
export default function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1 pl-2 pr-1 h-6 text-[11px] font-medium text-[#1693C9] bg-white border border-[#BFDBFE] rounded-full">
            <span>{label}</span>
            <button
                type="button"
                onClick={onRemove}
                title="Remove filter"
                className="h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-[#BFDBFE] text-[#1693C9] transition-colors"
            >
                <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </span>
    );
}
