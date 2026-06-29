import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';
import { ColorRow } from './TeamEditorModal';
import { PROCESS_ICONS } from './processIcons';

interface Step { title: string; description: string; icon: string; image: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}>
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

/**
 * Dedicated editor for the "How It Works" (process) block — a heading, a
 * row/vertical layout, optional numbered cards, and a repeater of steps each
 * with a title, description, and either a curated icon or an uploaded image.
 * Steps are stored as a JSON string in block.data.items.
 */
export default function ProcessEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [title, setTitle] = useState<string>(block.data.title ?? 'How It Works');
    const [description, setDescription] = useState<string>(block.data.description || '');
    const [layout, setLayout] = useState<'row' | 'vertical'>(block.data.layout === 'vertical' ? 'vertical' : 'row');
    const [align, setAlign] = useState<'left' | 'center' | 'right'>(
        (['left', 'center', 'right'] as const).includes(block.data.align as never) ? (block.data.align as 'left' | 'center' | 'right') : 'center',
    );
    const [showNumbers, setShowNumbers] = useState<boolean>((block.data.show_numbers ?? '1') === '1');
    const [mediaType, setMediaType] = useState<'icon' | 'image' | 'none'>(
        (['icon', 'image', 'none'] as const).includes(block.data.media_type as never) ? (block.data.media_type as 'icon' | 'image' | 'none') : 'icon',
    );
    const [accentColor, setAccentColor] = useState<string>(block.data.accent_color || '');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [textColor, setTextColor] = useState<string>(block.data.text_color || '');
    const [items, setItems] = useState<Step[]>(() => {
        try {
            const parsed = JSON.parse(block.data.items || '[]');
            return Array.isArray(parsed) ? parsed.map((i) => ({ title: i.title || '', description: i.description || '', icon: i.icon || '', image: i.image || '' })) : [];
        } catch {
            return [];
        }
    });
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const TABS = ['content', 'layout', 'styles'] as const;

    function update(idx: number, key: keyof Step, value: string) {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
    }
    function add() { setItems((prev) => [...prev, { title: '', description: '', icon: 'check', image: '' }]); }
    function remove(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }
    function move(idx: number, dir: -1 | 1) {
        setItems((prev) => {
            const swap = idx + dir;
            if (swap < 0 || swap >= prev.length) return prev;
            const next = [...prev];
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return next;
        });
    }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = items.filter((it) => it.title.trim() || it.description.trim() || it.image || it.icon);
            await api.updateBlock(websiteId, page, block.id, {
                title,
                description,
                layout,
                align,
                // '0', not '' — ConvertEmptyStringsToNull turns '' into null,
                // which the Blade default (?? '1') reads as "not set".
                show_numbers: showNumbers ? '1' : '0',
                media_type: mediaType,
                accent_color: accentColor,
                bg_color: bgColor,
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
        <SlideOverModal title="Edit How It Works" onClose={onClose} footer={footer} width={460}>
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
                            <FieldLabel>Section Title</FieldLabel>
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="How It Works" />
                        </div>
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional intro text" />
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Steps</FieldLabel>
                            <div className="space-y-3">
                                {items.map((it, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Step {idx + 1}</span>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="text-[#8B9096] hover:text-[#111315] disabled:opacity-20 transition-colors p-1" aria-label="Move up">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                                                </button>
                                                <button type="button" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="text-[#8B9096] hover:text-[#111315] disabled:opacity-20 transition-colors p-1" aria-label="Move down">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                                </button>
                                                <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove step">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <input type="text" className={formInputClass} value={it.title} onChange={(e) => update(idx, 'title', e.target.value)} placeholder="Step title (e.g. Consultation)" />
                                        <textarea className={`${formInputClass} resize-none`} rows={2} value={it.description} onChange={(e) => update(idx, 'description', e.target.value)} placeholder="Short description of this step" />

                                        {mediaType === 'icon' && (
                                            <div>
                                                <p className="text-[11px] font-medium text-[#5F656D] mb-1.5">Icon</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {PROCESS_ICONS.map((ic) => (
                                                        <button
                                                            key={ic.slug}
                                                            type="button"
                                                            title={ic.label}
                                                            onClick={() => update(idx, 'icon', ic.slug)}
                                                            className={`flex h-9 w-9 items-center justify-center rounded-[6px] border transition-colors ${it.icon === ic.slug ? 'border-[#1693C9] bg-[#F0F9FE] text-[#1693C9]' : 'border-[#E4E7EB] text-[#5F656D] hover:border-[#C8CCD1] hover:text-[#111315]'}`}
                                                        >
                                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} dangerouslySetInnerHTML={{ __html: ic.svg }} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {mediaType === 'image' && (
                                            <MediaField websiteId={websiteId} value={it.image} onChange={(p) => update(idx, 'image', p)} />
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={add}
                                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add Step
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
                                {([['row', 'Row'], ['vertical', 'Vertical']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setLayout(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${layout === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">{layout === 'row' ? 'Steps sit side by side across a row.' : 'Steps stack down the page, connected vertically.'}</p>
                        </div>

                        <div>
                            <FieldLabel>Step Media</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['icon', 'Icon'], ['image', 'Image'], ['none', 'None']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setMediaType(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${mediaType === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Each step shows a curated icon, an uploaded image, or just its number.</p>
                        </div>

                        <div>
                            <FieldLabel>Heading Alignment</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {(['left', 'center', 'right'] as const).map((opt) => (
                                    <button key={opt} type="button" onClick={() => setAlign(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${align === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 py-1">
                            <div>
                                <p className="text-[13px] font-medium text-[#111315]">Step Numbers</p>
                                <p className="text-[11px] text-[#8B9096] mt-0.5">Show a 1, 2, 3… badge on each step.</p>
                            </div>
                            <Toggle on={showNumbers} onChange={setShowNumbers} />
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-3">
                        <ColorRow label="Accent Color" value={accentColor} onChange={setAccentColor} fallback="#1693C9" />
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                        <ColorRow label="Text Color" value={textColor} onChange={setTextColor} fallback="#111315" />
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
