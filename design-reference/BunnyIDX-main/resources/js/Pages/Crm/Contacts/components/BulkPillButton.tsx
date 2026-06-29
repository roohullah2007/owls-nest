/**
 * Icon-only bulk action button (Phone / Email / Text / Delete) sitting in the
 * main Contacts toolbar. Always rendered; faded + disabled when no contacts
 * are selected so the agent sees what's possible without selecting first.
 *
 * Variant via `danger` for the Delete button (red text + red outline).
 */
export default function BulkPillButton({
    title,
    onClick,
    path,
    danger = false,
    disabled = false,
}: {
    label?: string;
    title?: string;
    onClick: () => void;
    path: string;
    danger?: boolean;
    disabled?: boolean;
}) {
    const base = 'inline-flex items-center justify-center h-9 w-9 rounded-[4px] border transition-colors shrink-0';
    const variant = danger
        ? 'text-[#DC2626] bg-white border-[#C8CCD1] hover:bg-[#FEF2F2]'
        : 'text-[#5F656D] bg-white border-[#C8CCD1] hover:text-[#111315] hover:bg-[#F9FAFB]';
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            className={`${base} ${variant} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={path} />
            </svg>
        </button>
    );
}
