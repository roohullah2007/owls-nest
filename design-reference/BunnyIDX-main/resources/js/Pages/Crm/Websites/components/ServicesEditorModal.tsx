import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';
import { ColorRow } from './TeamEditorModal';

interface ServiceItem { image: string; title: string; link: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

/**
 * Dedicated editor for the Services block — section title/description, a
 * grid/slider toggle (slider needs 4+ services), and a repeater of cards
 * (image, title, link). Items are stored as a JSON string in block.data.items
 * so the block-data API (scalar strings only) accepts them.
 */
export default function ServicesEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [title, setTitle] = useState<string>(block.data.title || '');
    const [description, setDescription] = useState<string>(block.data.description || '');
    const [buttonLabel, setButtonLabel] = useState<string>(block.data.button_label || '');
    const [align, setAlign] = useState<'left' | 'center' | 'right'>(
        (['left', 'center', 'right'] as const).includes(block.data.align as never) ? (block.data.align as 'left' | 'center' | 'right') : 'center',
    );
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [textColor, setTextColor] = useState<string>(block.data.text_color || '');
    const [layout, setLayout] = useState<'grid' | 'slider'>(block.data.layout === 'slider' ? 'slider' : 'grid');
    const [items, setItems] = useState<ServiceItem[]>(() => {
        try {
            const parsed = JSON.parse(block.data.items || '[]');
            return Array.isArray(parsed) ? parsed.map((i) => ({ image: i.image || '', title: i.title || '', link: i.link || '' })) : [];
        } catch {
            return [];
        }
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const TABS = ['content', 'layout', 'styles'] as const;

    // A slider only makes sense with more than 3 cards.
    const sliderAvailable = items.length > 3;
    const effectiveLayout = layout === 'slider' && sliderAvailable ? 'slider' : 'grid';

    function update(idx: number, key: keyof ServiceItem, value: string) {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
    }
    function add() { setItems((prev) => [...prev, { image: '', title: '', link: '' }]); }
    function remove(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = items.filter((it) => it.image || it.title.trim() || it.link.trim());
            await api.updateBlock(websiteId, page, block.id, {
                title,
                description,
                button_label: buttonLabel,
                align,
                bg_color: bgColor,
                text_color: textColor,
                layout: effectiveLayout,
                items: JSON.stringify(clean),
            });
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
        <SlideOverModal title="Edit Services" onClose={onClose} footer={footer} width={460}>
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-[#E4E7EB] px-4 bg-white">
                {TABS.map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                        className={`relative px-3 py-2.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'text-[#1693C9]' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                        {t}
                        {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1693C9] rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {/* ── CONTENT ── */}
                {tab === 'content' && (
                    <>
                        {/* Section heading */}
                        <div>
                            <FieldLabel>Section Title</FieldLabel>
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. How I Can Help" />
                        </div>
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional intro text" />
                        </div>
                        <div>
                            <FieldLabel>Button Label</FieldLabel>
                            <input type="text" className={formInputClass} value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="Learn More" />
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Services</FieldLabel>
                            <div className="space-y-3">
                                {items.map((it, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Service {idx + 1}</span>
                                            <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove service">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <MediaField websiteId={websiteId} value={it.image} onChange={(p) => update(idx, 'image', p)} />
                                        <input type="text" className={formInputClass} value={it.title} onChange={(e) => update(idx, 'title', e.target.value)} placeholder="Title (e.g. Home Search)" />
                                        <input type="text" className={formInputClass} value={it.link} onChange={(e) => update(idx, 'link', e.target.value)} placeholder="Link (URL or /path)" />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={add}
                                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add Service
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <>
                        {/* Heading & description alignment */}
                        <div>
                            <FieldLabel>Heading Alignment</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {(['left', 'center', 'right'] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setAlign(opt)}
                                        className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${align === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Aligns the title and description.</p>
                        </div>

                        {/* Layout toggle */}
                        <div>
                            <FieldLabel>Layout</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {(['grid', 'slider'] as const).map((opt) => {
                                    const disabled = opt === 'slider' && !sliderAvailable;
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            disabled={disabled}
                                            title={disabled ? 'Add 4 or more services to enable the slider' : undefined}
                                            onClick={() => setLayout(opt)}
                                            className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${effectiveLayout === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'} ${disabled ? 'opacity-40 cursor-not-allowed hover:text-[#5F656D]' : ''}`}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                            {!sliderAvailable && <p className="text-[11px] text-[#8B9096] mt-1.5">Slider becomes available with 4 or more services.</p>}
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-3">
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#000000" />
                        <ColorRow label="Text Color" value={textColor} onChange={setTextColor} fallback="#FFFFFF" />
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
