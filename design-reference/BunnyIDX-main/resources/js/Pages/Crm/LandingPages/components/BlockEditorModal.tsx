import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import type { LpPageData } from '@/landing-pages/public/types';
import { BLOCK_DEF_MAP, Field, FLOW_PRESETS } from '../blockSchema';
import MediaField from './MediaField';

interface Block {
    id: string;
    type: string;
    hidden?: boolean;
    data: Record<string, any>;
}

interface Props {
    block: Block;
    pageUuid: string;
    /** Page context so image previews resolve through the shared public resolver. */
    pageContext: LpPageData;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

/**
 * Schema-driven per-block editor, presented in the shared right-side slide-over
 * (the same component the Websites editor uses). Edits a local draft and hands
 * the finished data back via onSave — the parent persists the whole page.
 */
export default function BlockEditorModal({ block, pageUuid, pageContext, onClose, onSave }: Props) {
    const def = BLOCK_DEF_MAP[block.type];
    const [data, setData] = useState<Record<string, any>>(() => ({ ...block.data }));

    if (!def) return null;

    const set = (key: string, value: any) => {
        // Switching the hero flow swaps in that flow's full copy bundle + lead type.
        if (block.type === 'hero' && key === 'flow' && FLOW_PRESETS[value]) {
            setData((d) => ({ ...d, ...FLOW_PRESETS[value], flow: value }));
            return;
        }
        setData((d) => ({ ...d, [key]: value }));
    };

    const footer = (
        <>
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315]">
                Cancel
            </button>
            <button
                type="button"
                onClick={() => onSave(data)}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF]"
            >
                Save
            </button>
        </>
    );

    return (
        <SlideOverModal title={`Edit ${def.label}`} onClose={onClose} footer={footer} width={460}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {def.fields.map((field) => (
                    <FieldEditor key={field.key} field={field} value={data[field.key]} onChange={(v) => set(field.key, v)} pageUuid={pageUuid} pageContext={pageContext} />
                ))}
            </div>
        </SlideOverModal>
    );
}

export function FieldEditor({ field, value, onChange, pageUuid, pageContext }: { field: Field; value: any; onChange: (v: any) => void; pageUuid: string; pageContext: LpPageData }) {
    if (field.type === 'image') {
        return <MediaField label={field.label} value={value ?? ''} onChange={onChange} pageUuid={pageUuid} pageContext={pageContext} section={field.section} help={(field as any).help} />;
    }
    if (field.type === 'checkbox') {
        return (
            <label className="flex items-center gap-2 text-[13px] text-[#111315] cursor-pointer">
                <input type="checkbox" checked={value !== false} onChange={(e) => onChange(e.target.checked)} className="rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                {field.label}
            </label>
        );
    }
    if (field.type === 'textarea') {
        return (
            <div>
                <FieldLabel help={(field as any).help}>{field.label}</FieldLabel>
                <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} className={`${formInputClass} resize-none`} />
            </div>
        );
    }
    if (field.type === 'select') {
        return (
            <div>
                <FieldLabel>{field.label}</FieldLabel>
                <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={formInputClass}>
                    {field.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>
        );
    }
    if (field.type === 'items') {
        const items: any[] = Array.isArray(value) ? value : [];
        const update = (idx: number, key: string, v: any) => onChange(items.map((it, i) => (i === idx ? { ...it, [key]: v } : it)));
        const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
        const move = (idx: number, dir: -1 | 1) => {
            const t = idx + dir;
            if (t < 0 || t >= items.length) return;
            const next = [...items];
            [next[idx], next[t]] = [next[t], next[idx]];
            onChange(next);
        };
        const add = () => onChange([...items, { ...field.default }]);
        return (
            <div>
                <FieldLabel>{field.label}</FieldLabel>
                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div key={idx} className="rounded-[6px] border border-[#E4E7EB] p-3 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] font-semibold text-[#5F656D]">{field.itemLabel} {idx + 1}</span>
                                <div className="flex items-center gap-1 text-[#8B9096]">
                                    <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} title="Move up" className="rounded p-0.5 hover:bg-[#F3F4F6] disabled:opacity-30">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                                    </button>
                                    <button type="button" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} title="Move down" className="rounded p-0.5 hover:bg-[#F3F4F6] disabled:opacity-30">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                    </button>
                                    <button type="button" onClick={() => removeItem(idx)} title="Remove" className="rounded p-0.5 text-[#8B9096] hover:bg-[#FEF2F2] hover:text-[#DC2626]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2.5">
                                {field.itemFields.map((sub) => (
                                    <FieldEditor key={sub.key} field={sub} value={item[sub.key]} onChange={(v) => update(idx, sub.key, v)} pageUuid={pageUuid} pageContext={pageContext} />
                                ))}
                            </div>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={add}
                        className="w-full h-10 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE]"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        {field.addLabel}
                    </button>
                </div>
            </div>
        );
    }
    return (
        <div>
            <FieldLabel help={(field as any).help}>{field.label}</FieldLabel>
            <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={(field as any).placeholder} className={formInputClass} />
        </div>
    );
}
