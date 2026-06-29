import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';
import { ColorRow } from './TeamEditorModal';

interface VideoItem { url: string; title: string; thumb: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

const TABS = ['content', 'layout', 'styles'] as const;

/**
 * Dedicated editor for the Videos block — section title/subtitle, a grid/slider
 * toggle + heading alignment, optional bg/font colours, and a repeater of videos
 * (YouTube / Vimeo / mp4 URL, optional caption, optional custom thumbnail).
 * Items are JSON-encoded into block.data.items (block-data API is scalar-only).
 */
export default function VideosEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [title, setTitle] = useState<string>(block.data.title || '');
    const [subtitle, setSubtitle] = useState<string>(block.data.subtitle || '');
    const [align, setAlign] = useState<'left' | 'center' | 'right'>(
        (['left', 'center', 'right'] as const).includes(block.data.align as never) ? (block.data.align as 'left' | 'center' | 'right') : 'center',
    );
    const [layout, setLayout] = useState<'grid' | 'slider'>(block.data.layout === 'slider' ? 'slider' : 'grid');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [fontColor, setFontColor] = useState<string>(block.data.font_color || '');
    const [items, setItems] = useState<VideoItem[]>(() => {
        try {
            const parsed = JSON.parse(block.data.items || '[]');
            return Array.isArray(parsed) ? parsed.map((i) => ({ url: i.url || '', title: i.title || '', thumb: i.thumb || '' })) : [];
        } catch {
            return [];
        }
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');

    function update(idx: number, key: keyof VideoItem, value: string) {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
    }
    function add() { setItems((prev) => [...prev, { url: '', title: '', thumb: '' }]); }
    function remove(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = items.filter((it) => it.url.trim());
            await api.updateBlock(websiteId, page, block.id, {
                title,
                subtitle,
                align,
                layout,
                bg_color: bgColor,
                font_color: fontColor,
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
        <SlideOverModal title="Edit Videos" onClose={onClose} footer={footer} width={460}>
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
                            <FieldLabel>Section Title</FieldLabel>
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Watch" />
                        </div>
                        <div>
                            <FieldLabel>Subtitle</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Optional intro text" />
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Videos</FieldLabel>
                            <div className="space-y-3">
                                {items.map((it, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Video {idx + 1}</span>
                                            <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove video">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <input type="text" className={formInputClass} value={it.url} onChange={(e) => update(idx, 'url', e.target.value)} placeholder="YouTube, Vimeo, or .mp4 URL" />
                                        <input type="text" className={formInputClass} value={it.title} onChange={(e) => update(idx, 'title', e.target.value)} placeholder="Caption (optional)" />
                                        <div>
                                            <p className="text-[11px] text-[#8B9096] mb-1.5">Custom thumbnail (optional — YouTube auto-detects one)</p>
                                            <MediaField websiteId={websiteId} value={it.thumb} onChange={(p) => update(idx, 'thumb', p)} />
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={add}
                                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add Video
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
                                {(['grid', 'slider'] as const).map((opt) => (
                                    <button key={opt} type="button" onClick={() => setLayout(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${layout === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <FieldLabel>Heading Alignment</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {(['left', 'center', 'right'] as const).map((opt) => (
                                    <button key={opt} type="button" onClick={() => setAlign(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${align === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-3">
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                        <ColorRow label="Font Color" value={fontColor} onChange={setFontColor} fallback="#111315" />
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
