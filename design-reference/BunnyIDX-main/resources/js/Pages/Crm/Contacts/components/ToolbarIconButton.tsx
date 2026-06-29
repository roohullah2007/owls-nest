/**
 * Compact icon-only button rendered in the main toolbar for bulk actions.
 * Variants for neutral and danger. Used internally by BulkActionBar and
 * elsewhere in the Contacts toolbar.
 */
export default function ToolbarIconButton({
    title,
    onClick,
    path,
    danger = false,
}: {
    title: string;
    onClick: () => void;
    path: string;
    danger?: boolean;
}) {
    const cls = danger
        ? 'text-[#DC2626] hover:bg-[#FEF2F2]'
        : 'text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6]';
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors ${cls}`}
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={path} />
            </svg>
        </button>
    );
}
