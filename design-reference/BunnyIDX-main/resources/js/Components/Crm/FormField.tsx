import { ReactNode } from 'react';

/**
 * Shared form-field primitives used across modals, settings panes, and
 * inline-form areas so every input looks the same.
 *
 * - `FieldLabel` — 13px label with optional `?` tooltip
 * - `formInputClass` — applies to <input>/<select>/<textarea>
 *
 * Slide-over modals re-export these (and the legacy `slideOverInputClass` alias)
 * from `SlideOverModal.tsx`, so older imports keep working.
 */

interface FieldLabelProps {
    children: ReactNode;
    help?: string;
    htmlFor?: string;
}

export function FieldLabel({ children, help, htmlFor }: FieldLabelProps) {
    return (
        <label
            htmlFor={htmlFor}
            className="flex items-center gap-1 text-[13px] font-normal text-[#5F656D] leading-[18px] mb-1"
        >
            <span>{children}</span>
            {help && (
                <span className="relative inline-flex group">
                    <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full border border-[#C8CCD1] text-[#8B9096] text-[9px] font-semibold leading-none cursor-help select-none">
                        ?
                    </span>
                    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 z-10 hidden group-hover:block whitespace-normal w-56 rounded-md bg-[#111315] text-white text-[11px] leading-snug px-2.5 py-1.5 shadow-lg">
                        {help}
                    </span>
                </span>
            )}
        </label>
    );
}

/** Shared class for <input type="text|email|number|date|url"/>, <select>, and <textarea>. */
export const formInputClass =
    'block w-full px-2 py-[5px] text-[13px] leading-[1.42857143] border border-[#C8CCD1] rounded text-[#111315] bg-white placeholder-[#C4C9D1] focus:outline-none focus:border-[#1693C9] focus:ring-0';
