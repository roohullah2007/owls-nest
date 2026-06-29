import { KeyboardEvent, useRef, useState } from 'react';

interface Props {
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    fullWidth?: boolean;
    className?: string;
    inputClassName?: string;
    disabled?: boolean;
    appearance?: 'filter' | 'form';
}

/**
 * Chip-style multi-value text input. User types a token and presses Enter,
 * comma, or Tab to commit it. Existing tokens render as removable chips.
 *
 * `appearance="form"` matches the Contacts/Create form input tone
 * (light border + dark focus, no focus ring); `filter` matches the toolbar
 * style (darker border + brand-color focus ring).
 */
export default function MultiTokenInput({
    values,
    onChange,
    placeholder,
    fullWidth = true,
    className = '',
    inputClassName = '',
    disabled = false,
    appearance = 'filter',
}: Props) {
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    function commit(raw: string) {
        const token = raw.trim();
        if (!token) return;
        if (values.includes(token)) { setDraft(''); return; }
        onChange([...values, token]);
        setDraft('');
    }

    function remove(idx: number) {
        onChange(values.filter((_, i) => i !== idx));
    }

    function onKey(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
            if (draft.trim()) {
                e.preventDefault();
                commit(draft);
            }
            return;
        }
        if (e.key === 'Backspace' && !draft && values.length > 0) {
            e.preventDefault();
            remove(values.length - 1);
        }
    }

    const wrapBase = appearance === 'form'
        ? 'border-[#C8CCD1] focus-within:border-[#1693C9]'
        : 'border-[#C8CCD1] focus-within:border-[#1693C9] focus-within:ring-1 focus-within:ring-[#1693C9]';

    return (
        <div
            onClick={() => inputRef.current?.focus()}
            className={`flex flex-wrap items-center gap-1.5 min-h-9 px-2 py-1 bg-white border ${wrapBase} rounded-[4px] cursor-text transition-colors ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {values.map((v, i) => (
                <span
                    key={`${v}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-[#EBF5FF] text-[#0E6E9C] rounded-[4px]"
                >
                    <span className="truncate max-w-[160px]">{v}</span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); remove(i); }}
                        disabled={disabled}
                        title={`Remove ${v}`}
                        className="h-3.5 w-3.5 inline-flex items-center justify-center rounded-full text-[#0E6E9C] hover:bg-[#0E6E9C]/15 transition-colors"
                    >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={draft}
                disabled={disabled}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKey}
                onBlur={() => commit(draft)}
                placeholder={values.length === 0 ? placeholder : ''}
                /* border-0 overrides @tailwindcss/forms which gives all inputs a 1px border */
                className={`flex-1 min-w-[80px] h-7 px-1 text-[13px] bg-transparent text-[#111315] placeholder-[#8B9096] border-0 focus:outline-none focus:ring-0 ${inputClassName}`}
            />
        </div>
    );
}
