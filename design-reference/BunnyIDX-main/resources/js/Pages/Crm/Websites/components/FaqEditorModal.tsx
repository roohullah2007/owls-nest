import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import { ColorRow } from './TeamEditorModal';

interface FaqItem { question: string; answer: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

/**
 * Dedicated editor for the FAQ block — split (heading aside) or centered layout,
 * eyebrow/heading/subtitle, optional bg/heading/text colours, and a repeater of
 * question/answer items. Items are stored as a JSON string in block.data.items.
 * The block emits FAQPage JSON-LD schema on the public site.
 */
export default function FaqEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [layout, setLayout] = useState<'split' | 'centered'>(block.data.layout === 'centered' ? 'centered' : 'split');
    const [eyebrow, setEyebrow] = useState<string>(block.data.eyebrow || '');
    const [heading, setHeading] = useState<string>(block.data.heading ?? 'Frequently Asked Questions');
    const [subtitle, setSubtitle] = useState<string>(block.data.subtitle || '');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [fontColor, setFontColor] = useState<string>(block.data.font_color || '');
    const [textColor, setTextColor] = useState<string>(block.data.text_color || '');
    const [items, setItems] = useState<FaqItem[]>(() => {
        try {
            const parsed = JSON.parse(block.data.items || '[]');
            return Array.isArray(parsed) ? parsed.map((i) => ({ question: i.question || '', answer: i.answer || '' })) : [];
        } catch {
            return [];
        }
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const TABS = ['content', 'layout', 'styles'] as const;

    function update(idx: number, key: keyof FaqItem, value: string) {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
    }
    function add() { setItems((prev) => [...prev, { question: '', answer: '' }]); }
    function remove(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = items.filter((it) => it.question.trim());
            await api.updateBlock(websiteId, page, block.id, {
                layout,
                eyebrow,
                heading,
                subtitle,
                bg_color: bgColor,
                font_color: fontColor,
                text_color: textColor,
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
        <SlideOverModal title="Edit FAQs" onClose={onClose} footer={footer} width={460}>
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
                        <div>
                            <FieldLabel>Subtitle Heading</FieldLabel>
                            <input type="text" className={formInputClass} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="e.g. Got Questions?" />
                        </div>
                        <div>
                            <FieldLabel>Heading</FieldLabel>
                            <input type="text" className={formInputClass} value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Frequently Asked Questions" />
                        </div>
                        <div>
                            <FieldLabel>Subtitle</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Optional supporting line" />
                        </div>

                        {/* Q&A items */}
                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Questions</FieldLabel>
                            <div className="space-y-3">
                                {items.map((it, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Question {idx + 1}</span>
                                            <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove question">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <input type="text" className={formInputClass} value={it.question} onChange={(e) => update(idx, 'question', e.target.value)} placeholder="Question" />
                                        <textarea className={`${formInputClass} resize-none`} rows={3} value={it.answer} onChange={(e) => update(idx, 'answer', e.target.value)} placeholder="Answer — blank line separates paragraphs" />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={add}
                                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add Question
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <>
                        <div>
                            <FieldLabel>Layout</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['split', 'Split'], ['centered', 'Centered']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setLayout(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${layout === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <>
                        <div className="space-y-3">
                            <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                            <ColorRow label="Heading Color" value={fontColor} onChange={setFontColor} fallback="#111315" />
                            <ColorRow label="Text Color" value={textColor} onChange={setTextColor} fallback="#5F656D" />
                        </div>
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
