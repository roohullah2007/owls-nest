import { ReactNode, useState } from 'react';

interface Props {
    title: string;
    icon: ReactNode;
    count?: number;
    action?: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
}

/**
 * Collapsible sidebar card. Used in record-detail pages (Lead view, Deal view, etc.)
 * to compose the right-column stack of related-data cards.
 */
export default function SidebarCard({
    title, icon, count, action, defaultOpen = true, children,
}: Props) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center justify-between w-full px-4 py-3 text-left bg-[#F3F4F6] hover:bg-[#E4E7EB] transition-colors ${open ? 'border-b border-[#E4E7EB]' : ''}`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-[#5F656D]">{icon}</span>
                    <span className="text-[13px] font-semibold text-[#111315]">{title}</span>
                    {count !== undefined && count > 0 && (
                        <span className="text-[10px] font-medium text-[#8B9096]">({count})</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {open && action}
                    <svg className={`h-3.5 w-3.5 text-[#8B9096] transition-transform ${!open ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                </div>
            </button>
            {open && <div className="p-3">{children}</div>}
        </div>
    );
}

interface EmptyProps {
    icon: ReactNode;
    label: string;
}

/** Centered icon-circle + caption — the consistent empty-state for sidebar cards. */
export function CardEmptyState({ icon, label }: EmptyProps) {
    return (
        <div className="flex flex-col items-center text-center py-3 px-2 mb-2">
            <div className="h-9 w-9 flex items-center justify-center rounded-full bg-[#F3F4F6] mb-2 text-[#8B9096]">
                {icon}
            </div>
            <p className="text-[11px] text-[#8B9096]">{label}</p>
        </div>
    );
}

interface DashedProps {
    onClick: () => void;
    label: string;
}

/** Full-width dashed-border "+ Label" button — for adding items to a sidebar card list. */
export function DashedAddButton({ onClick, label }: DashedProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium text-[#5F656D] hover:text-[#111315] bg-white border border-dashed border-[#D1D5DB] hover:border-[#9CA3AF] hover:bg-[#F9FAFB] rounded-[4px] transition-colors"
        >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {label}
        </button>
    );
}
