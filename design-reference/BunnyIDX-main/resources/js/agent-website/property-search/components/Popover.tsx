import { ReactNode, useEffect, useRef } from 'react';

interface Props {
    label: string;
    icon?: ReactNode;
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
    align?: 'left' | 'right';
    panelClassName?: string;
    children: ReactNode;
}

const CHEVRON = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);

/** Filter-bar popover: pill button + dropdown panel (accordion row in the mobile sheet). */
export default function Popover({ label, icon, open, onToggle, onClose, align = 'left', panelClassName = '', children }: Props) {
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click (the panel itself doesn't bubble out).
    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open, onClose]);

    return (
        <div ref={ref} className={`ps-pop relative ${open ? 'is-open' : ''}`}>
            <button
                type="button"
                onClick={onToggle}
                className="ps-pop-btn flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 text-[13px] font-medium transition-colors hover:bg-gray-50"
                style={{ height: 40, whiteSpace: 'nowrap' }}
            >
                {icon}
                {label}
                {CHEVRON}
            </button>
            <div className={`ps-pop-panel ${align === 'right' ? 'ps-pop-panel--right' : ''} ${panelClassName}`}>
                {children}
            </div>
        </div>
    );
}

/** Min/max numeric pair used inside several popovers. */
export function MinMaxRow({ labels = ['Min', 'Max'], values, onChange, step = 1, min = 0, placeholder = ['No min', 'No max'] }: {
    labels?: [string, string];
    values: [string, string];
    onChange: (next: [string, string]) => void;
    step?: number;
    min?: number;
    placeholder?: [string, string];
}) {
    return (
        <div className="ps-pop-row">
            <label>{labels[0]}<input type="number" min={min} step={step} value={values[0]} placeholder={placeholder[0]} onChange={(e) => onChange([e.target.value, values[1]])} /></label>
            <label>{labels[1]}<input type="number" min={min} step={step} value={values[1]} placeholder={placeholder[1]} onChange={(e) => onChange([values[0], e.target.value])} /></label>
        </div>
    );
}

/** Segmented "Any / 1+ / 2+ …" control (beds & baths). */
export function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
    return (
        <div className="ps-seg">
            {['', ...options].map((v) => (
                <button key={v || 'any'} type="button" className={value === v ? 'is-active' : ''} onClick={() => onChange(v)}>
                    {v === '' ? 'Any' : `${v}+`}
                </button>
            ))}
        </div>
    );
}
