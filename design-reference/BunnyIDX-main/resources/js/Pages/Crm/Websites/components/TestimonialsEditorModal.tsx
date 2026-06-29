import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { SiteData } from '@/website-editor/types';

interface Testimonial { text: string; name: string; role: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    site: SiteData | null;
}

/** Repeatable testimonials editor (site.testimonials) in a right-side slide-over. */
export default function TestimonialsEditorModal({ onClose, onSaved, site }: Props) {
    const [items, setItems] = useState<Testimonial[]>(
        () => (site?.testimonials || []).map((t) => ({ text: t.text || '', name: t.name || '', role: t.role || '' })),
    );
    const [saving, setSaving] = useState(false);

    function update(idx: number, key: keyof Testimonial, value: string) {
        setItems((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
    }
    function add() { setItems((prev) => [...prev, { text: '', name: '', role: '' }]); }
    function remove(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        if (!site) return;
        setSaving(true);
        try {
            await api.updateTestimonials(site.id, items.filter((t) => t.text.trim() || t.name.trim()));
            onSaved();
        } finally {
            setSaving(false);
        }
    }

    const footer = (
        <>
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                {saving ? 'Saving…' : 'Save'}
            </button>
        </>
    );

    return (
        <SlideOverModal title="Edit Testimonials" onClose={onClose} footer={footer} width={460}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {items.map((t, idx) => (
                    <div key={idx} className="border border-[#E4E7EB] rounded-[4px] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-semibold text-[#111315]">Testimonial {idx + 1}</span>
                            <button
                                type="button"
                                onClick={() => remove(idx)}
                                className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]"
                                aria-label="Remove"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                        </div>
                        <div>
                            <FieldLabel>Quote</FieldLabel>
                            <textarea value={t.text} onChange={(e) => update(idx, 'text', e.target.value)} className={`${formInputClass} resize-none`} rows={3} placeholder="What did the client say?" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>Client Name</FieldLabel>
                                <input type="text" value={t.name} onChange={(e) => update(idx, 'name', e.target.value)} className={formInputClass} placeholder="John Smith" />
                            </div>
                            <div>
                                <FieldLabel>Role / Title</FieldLabel>
                                <input type="text" value={t.role} onChange={(e) => update(idx, 'role', e.target.value)} className={formInputClass} placeholder="Home Buyer" />
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={add}
                    className="w-full py-2.5 border border-dashed border-[#C8CCD1] rounded-[4px] text-[12px] font-medium text-[#5F656D] hover:border-[#1693C9] hover:text-[#1693C9] hover:bg-[#F3FAFD] transition-colors flex items-center justify-center gap-1.5 bg-white"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Add Testimonial
                </button>
            </div>
        </SlideOverModal>
    );
}
