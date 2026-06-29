import { useEffect, useState } from 'react';

const PencilSvg = (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
    </svg>
);

type InlineEditProps = {
    value: string;
    onSave: (next: string) => void;
    type?: 'text' | 'email' | 'tel' | 'date' | 'number';
    placeholder?: string;
    multiline?: boolean;
    options?: { value: string; label: string }[];
    pencilTone?: 'dark' | 'light';
    children: React.ReactNode;
};

export function InlineEdit({ value, onSave, type = 'text', placeholder, multiline, options, pencilTone = 'dark', children }: InlineEditProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    useEffect(() => { setDraft(value); }, [value]);

    function commit() {
        if (draft !== value) onSave(draft);
        setEditing(false);
    }
    function cancel() { setDraft(value); setEditing(false); }
    function handleKey(e: React.KeyboardEvent) {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
    }

    if (editing) {
        const inputCls = 'w-full text-[13px] border border-[#1693C9] rounded-[4px] px-2.5 py-1.5 text-[#111315] bg-white focus:outline-none focus:ring-1 focus:ring-[#1693C9] placeholder:text-[#C4C9D1]';
        if (options) {
            return (
                <select autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} className={inputCls}>
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            );
        }
        if (multiline) {
            return <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} placeholder={placeholder} rows={3} className={inputCls + ' resize-none'} />;
        }
        return <input autoFocus type={type} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={handleKey} placeholder={placeholder} className={inputCls} />;
    }

    const pencilCls = pencilTone === 'light'
        ? 'opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-white/70 hover:text-white hover:bg-white/20'
        : 'opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6]';

    return (
        <div className="group flex items-center gap-1.5 w-full">
            <div className="flex-1 min-w-0">{children}</div>
            <button type="button" onClick={() => setEditing(true)} className={pencilCls} aria-label="Edit">
                {PencilSvg}
            </button>
        </div>
    );
}

interface ContactRowProps {
    icon: React.ReactNode;
    iconBg: string;
    value: string;
    placeholder: string;
    type?: 'text' | 'email' | 'tel';
    onSave: (v: string) => void;
    renderDisplay: (v: string) => React.ReactNode;
}

export function ContactRow({ icon, iconBg, value, placeholder, type = 'text', onSave, renderDisplay }: ContactRowProps) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="shrink-0 h-7 w-7 flex items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>{icon}</span>
            <div className="flex-1 min-w-0">
                <InlineEdit value={value} onSave={onSave} type={type} placeholder={placeholder}>
                    {renderDisplay(value)}
                </InlineEdit>
            </div>
        </div>
    );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
    return <p className="text-[13px] font-semibold text-[#111315]">{children}</p>;
}
