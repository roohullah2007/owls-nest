import { useEffect, useRef, useState } from 'react';

export interface ComboboxSuggestion {
    value: string;
    label: string;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    suggestions: ComboboxSuggestion[];
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    menuClassName?: string;
    inputMode?: 'numeric' | 'text' | 'decimal';
    fullWidth?: boolean;
    size?: 'sm' | 'md';
    disabled?: boolean;
    /** If true, suggestions list is filtered by the typed input. */
    filterByInput?: boolean;
    /** Cap the number of rendered suggestions (keeps large lists snappy). */
    maxResults?: number;
    /** `filter` (default): darker border, brand-color focus ring. `form`: light border, dark focus, no ring. */
    appearance?: 'filter' | 'form';
}

/**
 * Typeable input with a dropdown of preset suggestions. Used where a select
 * should also accept free-form values (e.g. price filters where users may
 * want a specific number not in the preset list).
 */
export default function Combobox({
    value,
    onChange,
    suggestions,
    placeholder,
    className = '',
    inputClassName = '',
    menuClassName = '',
    inputMode = 'text',
    fullWidth = false,
    size = 'md',
    disabled = false,
    filterByInput = false,
    maxResults,
    appearance = 'filter',
}: Props) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        function onDoc(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const sizing = size === 'sm'
        ? 'h-7 pl-2 pr-7 text-[12px]'
        : appearance === 'form'
            // Match formInputClass height (px-2 py-[5px]) so form comboboxes line
            // up with the shared <input> styling used by the Add Person modal.
            ? 'py-[5px] pl-2 pr-9 text-[13px] leading-[1.42857143]'
            : 'h-9 pl-3 pr-9 text-[13px]';
    const chevronOffset = size === 'sm' ? 'right-2 h-3 w-3' : 'right-2.5 h-3.5 w-3.5';

    const filtered = filterByInput && value
        ? suggestions.filter((s) => s.label.toLowerCase().includes(value.toLowerCase()) || s.value.includes(value))
        : suggestions;
    const list = maxResults ? filtered.slice(0, maxResults) : filtered;
    const truncated = maxResults ? filtered.length - list.length : 0;

    const inputAppearance = appearance === 'form'
        ? 'border-[#C8CCD1] placeholder-[#C4C9D1] focus:border-[#1693C9] focus:ring-0'
        : 'border-[#C8CCD1] placeholder-[#8B9096] focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';

    return (
        <div ref={wrapRef} className={`relative ${fullWidth ? 'block w-full' : 'inline-block'} ${className}`}>
            <input
                ref={inputRef}
                type="text"
                inputMode={inputMode}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                className={`${sizing} w-full font-medium text-[#111315] bg-white border rounded-[4px] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${inputAppearance} ${inputClassName}`}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => { setOpen((o) => !o); inputRef.current?.focus(); }}
                className={`absolute top-1/2 -translate-y-1/2 ${chevronOffset} flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors`}
                aria-label="Show suggestions"
            >
                <svg className={`h-full w-full transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && list.length > 0 && (
                <div className={`absolute z-40 top-full left-0 right-0 mt-1 bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg max-h-72 overflow-y-auto ${menuClassName}`}>
                    <ul className="py-1">
                        {list.map((opt) => {
                            const active = opt.value === value;
                            return (
                                <li key={opt.value || '__empty'}>
                                    <button
                                        type="button"
                                        onClick={() => { onChange(opt.value); setOpen(false); }}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] text-left transition-colors ${
                                            active ? 'bg-[#F3F4F6] text-[#111315] font-medium' : 'text-[#111315] hover:bg-[#F9FAFB]'
                                        }`}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {active && (
                                            <svg className="h-3.5 w-3.5 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    {truncated > 0 && (
                        <div className="px-3 py-1.5 text-[11px] text-[#8B9096] border-t border-[#F0F1F3]">
                            +{truncated.toLocaleString()} more — keep typing to narrow
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
