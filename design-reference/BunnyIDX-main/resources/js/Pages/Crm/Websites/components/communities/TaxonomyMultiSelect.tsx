import { useMemo, useRef, useState, KeyboardEvent } from 'react';
import { labelClass } from '../../constants';

/**
 * Chip multi-select backed by a list of taxonomy options (cities, counties,
 * subdivisions…). With `allowCustom` it doubles as a free-entry tag input
 * (used for zip codes). Selected values are plain strings.
 */
export default function TaxonomyMultiSelect({
    label,
    help,
    options,
    value,
    onChange,
    placeholder,
    allowCustom = false,
    sanitize,
}: {
    label: string;
    help?: string;
    options: string[];
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    allowCustom?: boolean;
    /** Optional transform applied to custom entries (e.g. digits-only for zips). */
    sanitize?: (raw: string) => string;
}) {
    const [draft, setDraft] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const matches = useMemo(() => {
        const q = draft.trim().toLowerCase();
        if (!q) return [];
        const chosen = new Set(value.map((v) => v.toLowerCase()));
        return options.filter((o) => o.toLowerCase().includes(q) && !chosen.has(o.toLowerCase())).slice(0, 8);
    }, [draft, options, value]);

    function add(raw: string) {
        let v = raw.trim();
        if (sanitize) v = sanitize(v);
        if (!v) return;
        if (!value.some((x) => x.toLowerCase() === v.toLowerCase())) {
            onChange([...value, v]);
        }
        setDraft('');
        setOpen(false);
    }

    function remove(v: string) {
        onChange(value.filter((x) => x !== v));
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (matches[0]) add(matches[0]);
            else if (allowCustom) add(draft);
        } else if (e.key === 'Backspace' && draft === '' && value.length) {
            remove(value[value.length - 1]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="relative">
                <div
                    onClick={() => inputRef.current?.focus()}
                    className="min-h-[40px] flex flex-wrap items-center gap-1.5 rounded-md border border-[#C8CCD1] bg-white px-2 py-1.5 cursor-text focus-within:border-[#1693C9] focus-within:ring-1 focus-within:ring-[#1693C9] transition-all"
                >
                    {value.map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 rounded bg-[#F0F9FE] border border-[#1693C9]/30 pl-2 pr-1 py-0.5 text-[12px] font-medium text-[#0F6E97]">
                            {v}
                            <button type="button" onClick={(e) => { e.stopPropagation(); remove(v); }} className="h-3.5 w-3.5 flex items-center justify-center rounded-full hover:bg-[#1693C9]/15">
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        value={draft}
                        onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 150)}
                        onKeyDown={onKeyDown}
                        placeholder={value.length === 0 ? placeholder : ''}
                        className="flex-1 min-w-[100px] border-0 bg-transparent p-0 text-[13px] text-[#111315] placeholder:text-[#C4C9D1] focus:outline-none focus:ring-0"
                    />
                </div>

                {open && matches.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-md border border-[#E4E7EB] bg-white shadow-lg py-1">
                        {matches.map((m) => (
                            <button
                                key={m}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => add(m)}
                                className="w-full text-left px-3 py-1.5 text-[13px] text-[#111315] hover:bg-[#F0F9FE]"
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {help && <p className="mt-1 text-[11px] text-[#8B9096]">{help}</p>}
        </div>
    );
}
