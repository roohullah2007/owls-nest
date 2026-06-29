import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';
import { ColorRow } from './TeamEditorModal';

interface Item { quote: string; author: string; role: string; link: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

const TABS = ['content', 'layout', 'styles'] as const;

/**
 * Dedicated editor for the Testimonials block — variant (spotlight / slider /
 * grid), heading, spotlight background image, "View All" link, and a repeater
 * of testimonials (quote, author, role, read-more link). Items are stored as a
 * JSON string in block.data.items.
 */
export default function TestimonialsBlockEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [variant, setVariant] = useState<'spotlight' | 'slider' | 'grid'>(
        (['spotlight', 'slider', 'grid'] as const).includes(block.data.variant as never) ? (block.data.variant as 'spotlight' | 'slider' | 'grid') : 'grid',
    );
    const [theme, setTheme] = useState<'light' | 'dark'>(block.data.theme === 'dark' ? 'dark' : 'light');
    const [title, setTitle] = useState<string>(block.data.title ?? 'Testimonials');
    const [subtitle, setSubtitle] = useState<string>(block.data.subtitle || '');
    const [align, setAlign] = useState<'left' | 'center' | 'right'>(
        (['left', 'center', 'right'] as const).includes(block.data.align as never) ? (block.data.align as 'left' | 'center' | 'right') : 'center',
    );
    const [bgImage, setBgImage] = useState<string>(block.data.bg_image || '');
    const [viewLabel, setViewLabel] = useState<string>(block.data.view_all_label || '');
    const [viewLink, setViewLink] = useState<string>(block.data.view_all_link || '');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [cardBg, setCardBg] = useState<string>(block.data.card_bg || '');
    const [fontColor, setFontColor] = useState<string>(block.data.font_color || '');
    const [textColor, setTextColor] = useState<string>(block.data.text_color || '');
    const [source, setSource] = useState<'site' | 'manual'>(block.data.source === 'site' ? 'site' : 'manual');
    const [items, setItems] = useState<Item[]>(() => {
        try {
            const parsed = JSON.parse(block.data.items || '[]');
            return Array.isArray(parsed) ? parsed.map((i) => ({ quote: i.quote || '', author: i.author || '', role: i.role || '', link: i.link || '' })) : [];
        } catch {
            return [];
        }
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');

    function update(idx: number, key: keyof Item, value: string) {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
    }
    function add() { setItems((prev) => [...prev, { quote: '', author: '', role: '', link: '' }]); }
    function remove(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = items.filter((it) => it.quote.trim() || it.author.trim());
            await api.updateBlock(websiteId, page, block.id, {
                source,
                variant,
                theme,
                title,
                subtitle,
                align,
                bg_image: bgImage,
                view_all_label: viewLabel,
                view_all_link: viewLink,
                bg_color: bgColor,
                card_bg: cardBg,
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
        <SlideOverModal title="Edit Testimonials" onClose={onClose} footer={footer} width={460}>
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
                        <div>
                            <FieldLabel>Heading</FieldLabel>
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Testimonials" />
                        </div>
                        <div>
                            <FieldLabel>Text Below Heading (optional)</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="A short intro line under the heading" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>&ldquo;View All&rdquo; Label</FieldLabel>
                                <input type="text" className={formInputClass} value={viewLabel} onChange={(e) => setViewLabel(e.target.value)} placeholder="View All" />
                            </div>
                            <div>
                                <FieldLabel>&ldquo;View All&rdquo; Link</FieldLabel>
                                <input type="text" className={formInputClass} value={viewLink} onChange={(e) => setViewLink(e.target.value)} placeholder="/testimonials (optional)" />
                            </div>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Testimonials Source</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['site', 'From Testimonials Tab'], ['manual', 'Add Manually']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setSource(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${source === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>

                            {source === 'site' && (
                                <div className="mt-3 rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                                    <p className="text-[12px] text-[#111315] font-medium">Pulled from your Testimonials tab</p>
                                    <p className="text-[11px] text-[#8B9096] mt-1">This block shows the testimonials you manage under Website Settings → Testimonials (including Google Reviews you&rsquo;ve synced). Edit them there and this section updates automatically.</p>
                                </div>
                            )}
                        </div>

                        {source === 'manual' && (
                        <div>
                            <FieldLabel>Testimonials</FieldLabel>
                            <div className="space-y-3">
                                {items.map((it, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Testimonial {idx + 1}</span>
                                            <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove testimonial">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <textarea className={`${formInputClass} resize-none`} rows={4} value={it.quote} onChange={(e) => update(idx, 'quote', e.target.value)} placeholder="Quote" />
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" className={formInputClass} value={it.author} onChange={(e) => update(idx, 'author', e.target.value)} placeholder="Author" />
                                            <input type="text" className={formInputClass} value={it.role} onChange={(e) => update(idx, 'role', e.target.value)} placeholder="Role (optional)" />
                                        </div>
                                        <input type="text" className={formInputClass} value={it.link} onChange={(e) => update(idx, 'link', e.target.value)} placeholder="Read More link (optional)" />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={add}
                                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add Testimonial
                                </button>
                            </div>
                        </div>
                        )}
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <>
                        <div>
                            <FieldLabel>Style</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['spotlight', 'Spotlight'], ['slider', 'Slider'], ['grid', 'Grid']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setVariant(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${variant === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Grid is centered (default). Slider is two-column. Spotlight is a full-width carousel.</p>
                        </div>

                        {variant === 'grid' && (
                            <div>
                                <FieldLabel>Heading Alignment</FieldLabel>
                                <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                    {(['left', 'center', 'right'] as const).map((opt) => (
                                        <button key={opt} type="button" onClick={() => setAlign(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${align === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-[#8B9096] mt-1.5">Aligns the heading and the text below it.</p>
                            </div>
                        )}
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <>
                        <div>
                            <FieldLabel>Theme</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {(['light', 'dark'] as const).map((opt) => (
                                    <button key={opt} type="button" onClick={() => setTheme(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${theme === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Light = black text on white. Dark = white text on a dark background.</p>
                        </div>

                        <div>
                            <FieldLabel>Background Image (optional){variant === 'spotlight' ? '' : ''}</FieldLabel>
                            <MediaField websiteId={websiteId} value={bgImage} onChange={setBgImage} size="lg" />
                            {variant === 'spotlight' && <p className="text-[11px] text-[#8B9096] mt-1.5">With an image, the spotlight text is white automatically.</p>}
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4 space-y-3">
                            <p className="text-[11px] text-[#8B9096]">Colors default to your theme — override any below.</p>
                            <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback={theme === 'dark' ? '#111315' : '#FFFFFF'} />
                            {variant !== 'spotlight' && <ColorRow label="Card Background" value={cardBg} onChange={setCardBg} fallback={theme === 'dark' ? '#1F1F1F' : '#F5F5F5'} />}
                            <ColorRow label="Font Color" value={fontColor} onChange={setFontColor} fallback={theme === 'dark' ? '#FFFFFF' : '#111315'} />
                            {variant !== 'spotlight' && <ColorRow label="Testimonial Text Color" value={textColor} onChange={setTextColor} fallback={theme === 'dark' ? '#AAAAAA' : '#5F656D'} />}
                        </div>
                    </>
                )}

            </div>
        </SlideOverModal>
    );
}
