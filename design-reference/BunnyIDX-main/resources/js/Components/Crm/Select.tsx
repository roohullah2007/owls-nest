import { useEffect, useRef, useState } from 'react';

export interface SelectOption {
    value: string;
    label: string;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    triggerClassName?: string;
    menuClassName?: string;
    size?: 'sm' | 'md';
    fullWidth?: boolean;
    disabled?: boolean;
    menuAlign?: 'left' | 'right';
    /** `filter` (default): darker border, brand-color focus ring (toolbar look).
     *  `form`: light border, dark focus border, no ring (matches Contacts/Create). */
    appearance?: 'filter' | 'form';
}

/**
 * Custom select — button trigger + popover menu. Avoids the macOS native
 * chevron that `appearance-none` doesn't fully suppress on a real `<select>`.
 */
export default function Select({
    value,
    onChange,
    options,
    placeholder = 'Select…',
    className = '',
    triggerClassName = '',
    menuClassName = '',
    size = 'md',
    fullWidth = false,
    disabled = false,
    menuAlign = 'left',
    appearance = 'filter',
}: Props) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

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

    const selected = options.find((o) => o.value === value);
    const triggerSizing = size === 'sm'
        ? 'h-7 pl-2 pr-7 text-[12px]'
        : appearance === 'form'
            // Match formInputClass height (px-2 py-[5px]) so form selects line up
            // with the shared <input> styling used by the Add Person modal.
            ? 'py-[5px] pl-2 pr-9 text-[13px] leading-[1.42857143]'
            : 'h-9 pl-3 pr-9 text-[13px]';
    const chevronOffset = size === 'sm' ? 'right-2 h-3 w-3' : 'right-2.5 h-3.5 w-3.5';
    const triggerAppearance = appearance === 'form'
        ? 'border-[#C8CCD1] hover:bg-white focus:border-[#1693C9] focus:ring-0'
        : 'border-[#C8CCD1] hover:bg-[#F9FAFB] focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';

    return (
        <div ref={wrapRef} className={`relative ${fullWidth ? 'block w-full' : 'inline-block'} ${className}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className={`${triggerSizing} relative flex items-center font-medium text-[#111315] bg-white border rounded-[4px] cursor-pointer focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-left ${fullWidth ? 'w-full' : ''} ${triggerAppearance} ${triggerClassName}`}
            >
                <span className={`flex-1 truncate ${selected ? '' : 'text-[#8B9096]'}`}>{selected?.label || placeholder}</span>
                <svg className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#8B9096] transition-transform ${chevronOffset} ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div
                    role="listbox"
                    className={`absolute z-40 top-full ${menuAlign === 'right' ? 'right-0' : 'left-0'} mt-1 min-w-full bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg max-h-72 overflow-y-auto ${menuClassName}`}
                >
                    <ul className="py-1">
                        {options.map((opt) => {
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
                </div>
            )}
        </div>
    );
}
