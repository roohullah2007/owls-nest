import { useEffect, useState } from 'react';
import axios from 'axios';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import { ColorRow } from './TeamEditorModal';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

const TABS = ['content', 'styles'] as const;

/**
 * Dedicated editor for the Latest Blog Posts block — heading, button label,
 * post count, and an optional category filter (none checked = all posts,
 * the default). Categories come from the site's blog posts (Blog tab).
 * Selected categories are stored as a JSON string in block.data.categories.
 */
export default function LatestBlogPostsEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [title, setTitle] = useState<string>(block.data.title || '');
    const [buttonLabel, setButtonLabel] = useState<string>(block.data.button_label || '');
    const [count, setCount] = useState<string>(block.data.count || '7');
    const [categories, setCategories] = useState<string[]>(() => {
        try {
            const parsed = JSON.parse(block.data.categories || '[]');
            return Array.isArray(parsed) ? parsed.filter((c) => typeof c === 'string' && c.trim()) : [];
        } catch {
            return [];
        }
    });
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [fontColor, setFontColor] = useState<string>(block.data.font_color || '');
    const [available, setAvailable] = useState<string[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'styles'>('content');

    useEffect(() => {
        let cancelled = false;
        axios.get(`/api/website-editor/${websiteId}/blog-posts`)
            .then(({ data }) => {
                if (cancelled) return;
                const cats = Array.from(new Set(
                    ((data.posts || []) as { category?: string | null }[])
                        .map((p) => (p.category || '').trim())
                        .filter(Boolean),
                )).sort((a, b) => a.localeCompare(b));
                setAvailable(cats);
            })
            .catch(() => { if (!cancelled) setAvailable([]); });
        return () => { cancelled = true; };
    }, [websiteId]);

    function toggleCategory(cat: string) {
        setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateBlock(websiteId, page, block.id, {
                title,
                button_label: buttonLabel,
                count,
                categories: JSON.stringify(categories),
                bg_color: bgColor,
                font_color: fontColor,
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
        <SlideOverModal title="Edit Latest Blog Posts" onClose={onClose} footer={footer} width={460}>
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
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recent Blog Posts" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>Button Text</FieldLabel>
                                <input type="text" className={formInputClass} value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} placeholder="View Blog Posts" />
                            </div>
                            <div>
                                <FieldLabel>Posts to Show (4–12)</FieldLabel>
                                <input type="number" min={4} max={12} className={formInputClass} value={count} onChange={(e) => setCount(e.target.value)} placeholder="7" />
                            </div>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Categories</FieldLabel>
                            <p className="text-[11px] text-[#8B9096] mb-2">Show posts from the checked categories only. Leave all unchecked for the default — your latest posts from every category.</p>
                            {available === null && <p className="text-[12px] text-[#8B9096]">Loading categories…</p>}
                            {available !== null && available.length === 0 && (
                                <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                                    <p className="text-[12px] text-[#111315] font-medium">No categories yet</p>
                                    <p className="text-[11px] text-[#8B9096] mt-1">Assign categories to your posts in the Blog tab and they&rsquo;ll show up here.</p>
                                </div>
                            )}
                            {available !== null && available.length > 0 && (
                                <div className="space-y-1.5">
                                    {available.map((cat) => (
                                        <label key={cat} className="flex items-center gap-2.5 py-0.5 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={categories.includes(cat)}
                                                onChange={() => toggleCategory(cat)}
                                                className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-[#1693C9]"
                                            />
                                            <span className="text-[13px] text-[#111315]">{cat}</span>
                                        </label>
                                    ))}
                                    {/* Keep selections whose category no longer exists visible so they can be unchecked. */}
                                    {categories.filter((c) => !available.includes(c)).map((cat) => (
                                        <label key={cat} className="flex items-center gap-2.5 py-0.5 cursor-pointer opacity-60">
                                            <input
                                                type="checkbox"
                                                checked
                                                onChange={() => toggleCategory(cat)}
                                                className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-[#1693C9]"
                                            />
                                            <span className="text-[13px] text-[#111315]">{cat} <span className="text-[11px] text-[#8B9096]">(no posts)</span></span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-3">
                        <p className="text-[11px] text-[#8B9096]">Colors default to your theme — override any below.</p>
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                        <ColorRow label="Font Color" value={fontColor} onChange={setFontColor} fallback="#111315" />
                    </div>
                )}

            </div>
        </SlideOverModal>
    );
}
