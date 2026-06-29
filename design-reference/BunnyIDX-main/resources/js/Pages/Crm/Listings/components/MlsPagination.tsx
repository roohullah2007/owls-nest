interface Props {
    page: number;
    total: number;
    perPage?: number;
    loading?: boolean;
    onPageChange: (page: number) => void;
    /** "bar" matches the table footer; "compact" is for grid/map below content. */
    variant?: 'bar' | 'compact';
}

/**
 * Reusable pagination for MLS results.
 * "bar" → full-width footer bar (used under the table).
 * "compact" → centered card (used under grid + half-map).
 */
export default function MlsPagination({ page, total, perPage = 20, loading, onPageChange, variant = 'compact' }: Props) {
    const lastPage = Math.ceil(total / perPage);
    if (lastPage <= 1) return null;

    const canPrev = page > 1 && !loading;
    const canNext = page < lastPage && !loading;

    if (variant === 'bar') {
        return (
            <div className="flex items-stretch h-10 bg-[#F9FAFB] border-t border-[#E4E7EB]">
                <div className="flex items-center px-4 border-r border-[#E4E7EB] shrink-0">
                    <span className="text-[10px] text-[#5F656D] font-medium">Page {page} / {lastPage}</span>
                </div>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!canPrev}
                    className="flex items-center justify-center min-w-[32px] px-3 text-xs font-medium border-r border-[#E4E7EB] text-[#5F656D] hover:bg-[#F3F4F6] disabled:text-[#D1D5DB] disabled:cursor-not-allowed transition-colors"
                >
                    Prev
                </button>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!canNext}
                    className="flex items-center justify-center min-w-[32px] px-3 text-xs font-medium border-r border-[#E4E7EB] text-[#5F656D] hover:bg-[#F3F4F6] disabled:text-[#D1D5DB] disabled:cursor-not-allowed transition-colors"
                >
                    Next
                </button>
                <div className="flex-1" />
                <div className="flex items-center px-4 border-l border-[#E4E7EB] shrink-0">
                    <span className="text-[10px] text-[#5F656D] font-medium">{total} results</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between bg-white border border-[#E4E7EB] rounded-xl px-4 py-2.5 mt-3">
            <span className="text-xs text-[#5F656D] font-medium">Page {page} / {lastPage}</span>
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!canPrev}
                    className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-md border border-[#C8CCD1] text-[#5F656D] hover:bg-[#F9FAFB] hover:text-[#111315] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                    Prev
                </button>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!canNext}
                    className="inline-flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-md border border-[#C8CCD1] text-[#5F656D] hover:bg-[#F9FAFB] hover:text-[#111315] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                </button>
            </div>
            <span className="text-xs text-[#5F656D] font-medium">{total} results</span>
        </div>
    );
}
