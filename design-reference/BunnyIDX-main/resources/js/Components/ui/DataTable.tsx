import { ReactNode } from 'react';

/**
 * Canonical table primitives for the whole app. ALL new list / table views
 * should use these — admin, CRM, settings — so the look stays unified.
 *
 * Visual tokens (matches /crm/contacts):
 * - White card: square corners + shadow-sm + border #E4E7EB
 * - Header bg white; label text 11px semibold #5F656D, 34px tall
 * - Vertical column dividers: border-r border-[#E4E7EB] (suppressed on the
 *   last column via the `last` prop)
 * - Body rows: hover #FAFAFA, full-row dividers, 38px (px-3 py-2)
 * - Selected row: bg #E6F0FF
 *
 * Note on the contacts table: it uses a div-based flex grid because it needs
 * column resizing + sortable headers + checkbox column — features beyond
 * what these primitives offer today. If admin tables need those, extend this
 * file rather than spawning a new system.
 *
 * Usage:
 *   <DataTable>
 *     <DataTableHead>
 *       <DataTableHeadCell>User</DataTableHeadCell>
 *       <DataTableHeadCell align="right" last>Actions</DataTableHeadCell>
 *     </DataTableHead>
 *     <tbody>
 *       {rows.map(r => (
 *         <DataTableRow key={r.id} onClick={() => select(r)}>
 *           <DataTableCell>{r.name}</DataTableCell>
 *           <DataTableCell align="right" last>…</DataTableCell>
 *         </DataTableRow>
 *       ))}
 *     </tbody>
 *   </DataTable>
 */

export function DataTable({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <div className={`bg-white border border-[#E4E7EB] rounded-[4px] shadow-sm overflow-hidden overflow-x-auto ${className}`}>
            <table className="w-full text-sm">{children}</table>
        </div>
    );
}

export function DataTableHead({ children }: { children: ReactNode }) {
    return (
        <thead>
            <tr className="bg-white border-b border-[#E4E7EB]">{children}</tr>
        </thead>
    );
}

interface HeadCellProps {
    children: ReactNode;
    align?: 'left' | 'right';
    last?: boolean;
}

export function DataTableHeadCell({ children, align = 'left', last = false }: HeadCellProps) {
    const alignClass = align === 'right' ? 'text-right' : 'text-left';
    const borderClass = last ? '' : 'border-r border-[#E4E7EB]';
    return (
        <th
            className={`${alignClass} font-normal px-3 ${borderClass} h-11`}
            style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'rgb(7, 9, 15)' }}
        >
            {children}
        </th>
    );
}

interface RowProps {
    children: ReactNode;
    onClick?: () => void;
    selected?: boolean;
}

export function DataTableRow({ children, onClick, selected = false }: RowProps) {
    const base = 'bg-white border-b border-[#E4E7EB] last:border-b-0 transition-colors';
    const interactive = onClick ? 'cursor-pointer' : '';
    // Rows stay white by default; selected rows get a very subtle tint so the
    // distinction is visible without breaking the all-white look.
    const selectedClass = selected ? 'bg-[#F7F8FB]' : '';
    return (
        <tr className={`${base} ${interactive} ${selectedClass}`} onClick={onClick}>
            {children}
        </tr>
    );
}

interface CellProps {
    children: ReactNode;
    align?: 'left' | 'right';
    last?: boolean;
    className?: string;
}

export function DataTableCell({ children, align = 'left', last = false, className = '' }: CellProps) {
    const alignClass = align === 'right' ? 'text-right' : '';
    const borderClass = last ? '' : 'border-r border-[#E4E7EB]';
    return (
        <td
            className={`px-3 py-2 ${alignClass} ${borderClass} ${className}`}
            style={{ fontSize: '14px', lineHeight: 'normal', fontWeight: 400, color: 'rgba(0, 0, 0, 0.87)' }}
        >
            {children}
        </td>
    );
}

/**
 * Fixed-size 32×64 slot for MLS / brand logos. Keeps row heights uniform
 * regardless of the logo's aspect ratio. Falls back to a small placeholder icon.
 */
export function LogoSlot({ src, alt, fallback }: { src: string | null | undefined; alt?: string; fallback?: ReactNode }) {
    return (
        <div className="shrink-0 h-8 w-16 rounded border border-[#F3F4F6] bg-white flex items-center justify-center overflow-hidden">
            {src ? (
                <img src={src} alt={alt || ''} className="max-h-6 max-w-[56px] object-contain" />
            ) : (
                fallback ?? (
                    <svg className="h-4 w-4 text-[#C4C9D1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3 19.5h18M3 19.5V4.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 4.5v15" />
                    </svg>
                )
            )}
        </div>
    );
}
