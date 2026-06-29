import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';
import { ColorRow } from './TeamEditorModal';

type BtnStyle = 'solid' | 'outline' | 'white-outline';
interface ButtonItem { label: string; link: string; style: BtnStyle }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

const BTN_STYLES: ReadonlyArray<[BtnStyle, string]> = [
    ['solid', 'Solid'],
    ['outline', 'Outline'],
    ['white-outline', 'White'],
];

/**
 * Dedicated editor for the unified Content block — two columns, one image and
 * one content side (eyebrow / heading / paragraph / up to 3 buttons), with an
 * image-position toggle and optional bg / font / text colours. Buttons are
 * stored as a JSON string in block.data.buttons (block-data API is scalar-only).
 */
export default function ContentEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [imagePosition, setImagePosition] = useState<'left' | 'right'>(block.data.image_position === 'right' ? 'right' : 'left');
    const [image, setImage] = useState<string>(block.data.image || '');
    const [eyebrow, setEyebrow] = useState<string>(block.data.eyebrow || '');
    const [heading, setHeading] = useState<string>(block.data.heading || '');
    const [body, setBody] = useState<string>(block.data.body || '');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [fontColor, setFontColor] = useState<string>(block.data.font_color || '');
    const [textColor, setTextColor] = useState<string>(block.data.text_color || '');
    const [buttons, setButtons] = useState<ButtonItem[]>(() => {
        try {
            const parsed = JSON.parse(block.data.buttons || '[]');
            return Array.isArray(parsed)
                ? parsed.slice(0, 3).map((b) => ({ label: b.label || '', link: b.link || '', style: (BTN_STYLES.some(([s]) => s === b.style) ? b.style : 'outline') as BtnStyle }))
                : [];
        } catch {
            return [];
        }
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const TABS = ['content', 'layout', 'styles'] as const;

    function update(idx: number, key: keyof ButtonItem, value: string) {
        setButtons((prev) => prev.map((b, i) => (i === idx ? { ...b, [key]: value } : b)));
    }
    function add() { setButtons((prev) => (prev.length >= 3 ? prev : [...prev, { label: '', link: '', style: 'outline' }])); }
    function remove(idx: number) { setButtons((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = buttons.filter((b) => b.label.trim());
            await api.updateBlock(websiteId, page, block.id, {
                image_position: imagePosition,
                image,
                eyebrow,
                heading,
                body,
                bg_color: bgColor,
                font_color: fontColor,
                text_color: textColor,
                buttons: JSON.stringify(clean),
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
        <SlideOverModal title="Edit Content" onClose={onClose} footer={footer} width={460}>
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
                        <div className="space-y-4">
                            <div>
                                <FieldLabel>Subtitle Heading</FieldLabel>
                                <input type="text" className={formInputClass} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="e.g. About Us" />
                            </div>
                            <div>
                                <FieldLabel>Heading</FieldLabel>
                                <input type="text" className={formInputClass} value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Section heading" />
                            </div>
                            <div>
                                <FieldLabel>Content</FieldLabel>
                                <textarea className={`${formInputClass} resize-none`} rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body text — leave a blank line between paragraphs" />
                                <p className="text-[11px] text-[#8B9096] mt-1.5">Separate paragraphs with a blank line.</p>
                            </div>
                        </div>

                        {/* Buttons (1–3) */}
                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Buttons</FieldLabel>
                            <div className="space-y-3">
                                {buttons.map((b, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Button {idx + 1}</span>
                                            <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove button">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <input type="text" className={formInputClass} value={b.label} onChange={(e) => update(idx, 'label', e.target.value)} placeholder="Button text" />
                                        <input type="text" className={formInputClass} value={b.link} onChange={(e) => update(idx, 'link', e.target.value)} placeholder="Link (URL or /path)" />
                                        <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                            {BTN_STYLES.map(([val, label]) => (
                                                <button key={val} type="button" onClick={() => update(idx, 'style', val)} className={`h-7 px-3 text-[12px] font-medium rounded-[3px] transition-colors ${b.style === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {buttons.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={add}
                                        className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                        Add Button
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <>
                        <div>
                            <FieldLabel>Image Position</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['left', 'Image Left'], ['right', 'Image Right']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setImagePosition(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${imagePosition === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Image</FieldLabel>
                            <MediaField websiteId={websiteId} value={image} onChange={setImage} size="lg" />
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-3">
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                        <ColorRow label="Heading Color" value={fontColor} onChange={setFontColor} fallback="#111315" />
                        <ColorRow label="Text Color" value={textColor} onChange={setTextColor} fallback="#5F656D" />
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
