import { useEffect, useState } from 'react';
import axios from 'axios';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import { ColorRow } from './TeamEditorModal';
import { mediaUrl } from './MediaField';

interface Area { id: number; name: string; image: string | null; is_active?: boolean }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

/**
 * Dedicated editor for the Communities block. The cards are sourced from the
 * website's Areas/Communities (managed under the Areas tab) — either all of them
 * or a curated, re-ordered selection. Layout offers a grid (default) or slider,
 * and each card can show the community name below the image or overlaid on top.
 * Settings are stored as scalar strings on block.data (selected ids as JSON) so
 * the block-data API accepts them; the cards themselves resolve server-side.
 */
export default function CommunitiesEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [title, setTitle] = useState<string>(block.data.title ?? 'Communities');
    const [viewLabel, setViewLabel] = useState<string>(block.data.view_all_label || '');
    const [viewLink, setViewLink] = useState<string>(block.data.view_all_link || '');
    const [layout, setLayout] = useState<'grid' | 'slider'>(block.data.layout === 'slider' ? 'slider' : 'grid');
    const [theme, setTheme] = useState<'dark' | 'light'>(block.data.theme === 'light' ? 'light' : 'dark');
    const [cardStyle, setCardStyle] = useState<'below' | 'overlay'>(block.data.card_style === 'overlay' ? 'overlay' : 'below');
    const [columns, setColumns] = useState<'2' | '3' | '4'>(
        (['2', '3', '4'] as const).includes(block.data.columns as never) ? (block.data.columns as '2' | '3' | '4') : '3',
    );
    const [imageRatio, setImageRatio] = useState<'landscape' | 'square' | 'wide' | 'portrait'>(
        (['landscape', 'square', 'wide', 'portrait'] as const).includes(block.data.image_ratio as never)
            ? (block.data.image_ratio as 'landscape' | 'square' | 'wide' | 'portrait')
            : 'landscape',
    );
    const [source, setSource] = useState<'all' | 'selected'>(block.data.source === 'selected' ? 'selected' : 'all');
    const [selectedIds, setSelectedIds] = useState<number[]>(() => {
        try {
            const parsed = JSON.parse(block.data.selected || '[]');
            return Array.isArray(parsed) ? parsed.map((n) => Number(n)).filter((n) => !Number.isNaN(n)) : [];
        } catch {
            return [];
        }
    });
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [textColor, setTextColor] = useState<string>(block.data.text_color || '');

    const [areas, setAreas] = useState<Area[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const TABS = ['content', 'layout', 'styles'] as const;

    useEffect(() => {
        let alive = true;
        axios.get(`/api/website-editor/${websiteId}/areas`)
            .then((res) => { if (alive) setAreas((res.data?.areas || []) as Area[]); })
            .catch(() => { if (alive) setAreas([]); });
        return () => { alive = false; };
    }, [websiteId]);

    const byId = new Map((areas || []).map((a) => [a.id, a]));
    // Selected, in saved order, dropping ids whose area was since deleted.
    const selected = selectedIds.map((id) => byId.get(id)).filter((a): a is Area => !!a);
    const available = (areas || []).filter((a) => !selectedIds.includes(a.id));

    function addArea(id: number) { setSelectedIds((prev) => [...prev, id]); }
    function removeArea(id: number) { setSelectedIds((prev) => prev.filter((x) => x !== id)); }
    function moveArea(id: number, dir: -1 | 1) {
        setSelectedIds((prev) => {
            const idx = prev.indexOf(id);
            const swap = idx + dir;
            if (idx < 0 || swap < 0 || swap >= prev.length) return prev;
            const next = [...prev];
            [next[idx], next[swap]] = [next[swap], next[idx]];
            return next;
        });
    }

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateBlock(websiteId, page, block.id, {
                title,
                view_all_label: viewLabel,
                view_all_link: viewLink,
                layout,
                theme,
                card_style: cardStyle,
                columns,
                image_ratio: imageRatio,
                source,
                selected: JSON.stringify(selectedIds),
                bg_color: bgColor,
                text_color: textColor,
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

    const noAreas = areas !== null && areas.length === 0;

    return (
        <SlideOverModal title="Edit Communities" onClose={onClose} footer={footer} width={460}>
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
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Communities" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><FieldLabel>&ldquo;View All&rdquo; Label</FieldLabel><input type="text" className={formInputClass} value={viewLabel} onChange={(e) => setViewLabel(e.target.value)} placeholder="View All" /></div>
                            <div><FieldLabel>&ldquo;View All&rdquo; Link</FieldLabel><input type="text" className={formInputClass} value={viewLink} onChange={(e) => setViewLink(e.target.value)} placeholder="Defaults to the Communities page" /></div>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Communities</FieldLabel>
                            {noAreas ? (
                                <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                                    <p className="text-[12px] text-[#111315] font-medium">No communities yet</p>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">This block fills automatically from your Communities. Add a few and they&rsquo;ll appear here — placeholders show until then.</p>
                                    <a href={`/crm/websites/${websiteId}/areas`} className="inline-block mt-2 text-[12px] font-medium text-[#1693C9] hover:underline">Manage Communities →</a>
                                </div>
                            ) : (
                                <>
                                    <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                        {([['all', 'Show all'], ['selected', 'Choose & order']] as const).map(([val, label]) => (
                                            <button key={val} type="button" onClick={() => setSource(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${source === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                        ))}
                                    </div>

                                    {source === 'all' && (
                                        <p className="text-[11px] text-[#8B9096] mt-2">Shows every active community, ordered as in the Communities tab.</p>
                                    )}

                                    {source === 'selected' && (
                                        <div className="mt-3 space-y-3">
                                            {areas === null ? (
                                                <p className="text-[12px] text-[#8B9096]">Loading…</p>
                                            ) : (
                                                <>
                                                    <div>
                                                        <p className="text-[11px] font-semibold text-[#8B9096] uppercase tracking-wider mb-1.5">Selected</p>
                                                        {selected.length === 0 ? (
                                                            <p className="text-[12px] text-[#8B9096]">Nothing selected yet — add communities below.</p>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                {selected.map((a, idx) => (
                                                                    <div key={a.id} className="flex items-center gap-2 border border-[#E4E7EB] rounded-[6px] p-1.5">
                                                                        <span className="h-9 w-12 shrink-0 rounded bg-[#F3F4F6] bg-cover bg-center" style={a.image ? { backgroundImage: `url(${mediaUrl(a.image)})` } : undefined} />
                                                                        <span className="flex-1 min-w-0 text-[12px] font-medium text-[#111315] truncate">{a.name}</span>
                                                                        <div className="flex flex-col gap-0.5 shrink-0">
                                                                            <button type="button" onClick={() => moveArea(a.id, -1)} disabled={idx === 0} className="text-[#8B9096] hover:text-[#111315] disabled:opacity-20 transition-colors" aria-label="Move up">
                                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                                                                            </button>
                                                                            <button type="button" onClick={() => moveArea(a.id, 1)} disabled={idx === selected.length - 1} className="text-[#8B9096] hover:text-[#111315] disabled:opacity-20 transition-colors" aria-label="Move down">
                                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                                                            </button>
                                                                        </div>
                                                                        <button type="button" onClick={() => removeArea(a.id)} className="shrink-0 text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove">
                                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {available.length > 0 && (
                                                        <div>
                                                            <p className="text-[11px] font-semibold text-[#8B9096] uppercase tracking-wider mb-1.5">Add</p>
                                                            <div className="space-y-1.5">
                                                                {available.map((a) => (
                                                                    <button key={a.id} type="button" onClick={() => addArea(a.id)} className="w-full flex items-center gap-2 border border-[#E4E7EB] rounded-[6px] p-1.5 text-left hover:border-[#1693C9] hover:bg-[#F3FAFD] transition-colors">
                                                                        <span className="h-9 w-12 shrink-0 rounded bg-[#F3F4F6] bg-cover bg-center" style={a.image ? { backgroundImage: `url(${mediaUrl(a.image)})` } : undefined} />
                                                                        <span className="flex-1 min-w-0 text-[12px] font-medium text-[#111315] truncate">{a.name}</span>
                                                                        <svg className="h-4 w-4 shrink-0 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
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
                            <FieldLabel>Theme</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['dark', 'Dark'], ['light', 'Light']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setTheme(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${theme === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">{theme === 'dark' ? 'Dark section with a white outlined View All button.' : 'White section with dark text and button.'}</p>
                        </div>

                        <div>
                            <FieldLabel>Card Style</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['below', 'Name below'], ['overlay', 'Name on image']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setCardStyle(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${cardStyle === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">{cardStyle === 'overlay' ? 'Community name sits over the image on a dark overlay.' : 'Community name appears below the image.'}</p>
                        </div>

                        {layout === 'grid' && (
                            <div>
                                <FieldLabel>Columns</FieldLabel>
                                <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                    {(['2', '3', '4'] as const).map((opt) => (
                                        <button key={opt} type="button" onClick={() => setColumns(opt)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${columns === opt ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <FieldLabel>Image Ratio</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['landscape', 'Landscape'], ['square', 'Square'], ['wide', 'Wide'], ['portrait', 'Portrait']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setImageRatio(val)} className={`h-7 px-3 text-[12px] font-medium rounded-[3px] transition-colors ${imageRatio === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Shape of each community&rsquo;s photo (4:3, 1:1, 16:9 or 3:4).</p>
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-3">
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                        <ColorRow label="Text Color" value={textColor} onChange={setTextColor} fallback="#111315" />
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
