import { DragEvent, ReactNode } from 'react';

interface Props {
    /** Icon chip glyph (inline SVG), shown in the two-tone teal chip. */
    icon: ReactNode;
    /** Bold display title — caller supplies a sensible fallback. */
    title: string;
    /** Optional muted second line (position label, status badges…). */
    subtitle?: ReactNode;
    enabled: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onRemove: () => void;
    /** Drag-to-reorder wiring (HTML5 dnd, like PageBlockEditor). */
    dragging?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onDragOver?: (e: DragEvent) => void;
    onDrop?: () => void;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={onClick}
            className={`relative inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}
        >
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

/**
 * Compact, draggable block-card row — the same chrome PageBlockEditor uses for
 * page blocks (drag handle · icon chip · title/subtitle · toggle · edit · remove).
 * Editing happens in a slide-over, not inline, so the list stays scannable.
 */
export default function EditorBlockCard({
    icon, title, subtitle, enabled, onToggle, onEdit, onRemove,
    dragging, onDragStart, onDragEnd, onDragOver, onDrop,
}: Props) {
    return (
        <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={`group flex items-center bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all ${dragging ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
        >
            {/* Only the handle is draggable so buttons keep working. */}
            <span
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing"
                aria-label="Drag to reorder"
                title="Drag to reorder"
            >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
            </span>
            <span className="shrink-0 pl-2 flex items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]">{icon}</span>
            </span>
            <button type="button" onClick={onEdit} className="flex-1 min-w-0 px-3 py-2.5 text-left">
                <p className="truncate text-[13px] font-semibold text-[#111315]">{title}</p>
                {subtitle && <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8B9096]">{subtitle}</div>}
            </button>
            <div className="flex shrink-0 items-center gap-1.5 pr-2.5">
                <Toggle on={enabled} onClick={onToggle} />
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315] transition-colors"
                    aria-label="Edit"
                    title="Edit"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
                <button
                    type="button"
                    onClick={onRemove}
                    className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                    aria-label="Remove"
                    title="Remove"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M10 11v6M14 11v6" /></svg>
                </button>
            </div>
        </div>
    );
}

/** Status pill used in card subtitles. */
export function Badge({ children }: { children: ReactNode }) {
    return <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2 py-[1px] text-[10.5px] font-medium text-[#5F656D] capitalize">{children}</span>;
}
