interface Props {
    label: string;
    /** Hex color (e.g. "#1693C9"). Used as the text color and as the
     *  background at ~12% opacity. */
    color: string;
    title?: string;
    className?: string;
}

/**
 * Borderless dark-text-on-light-tint pill used by the MLS table for Type /
 * Subtype / Status. Sized at 13px so the label sits naturally alongside
 * other cell text. Centralized here so My Listings + MLS Listings render
 * identical badges.
 */
export default function TintBadge({ label, color, title, className = '' }: Props) {
    return (
        <span
            className={`inline-flex self-start items-center px-2 py-0.5 text-[13px] leading-[16px] font-medium whitespace-nowrap rounded-[3px] ${className}`}
            style={{ backgroundColor: color + '1F', color }}
            title={title}
        >
            {label}
        </span>
    );
}
