import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';
import { ColorRow } from './TeamEditorModal';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

// Defaults mirror the Blade fallbacks — pre-filled into the inputs so the agent
// edits the copy instead of retyping it from scratch.
const DEFAULTS = {
    headline: "WHAT'S YOUR HOME WORTH?",
    description: 'Get a free, no-obligation home valuation from a local expert. Enter your address to see your property and what it could sell for in today’s market.',
    placeholder: 'Enter your home address',
    cta_text: 'Get Valuation',
};

/**
 * Dedicated editor for the Home Valuation block — eyebrow / headline /
 * description / address placeholder / button text, plus an optional background
 * image and a Light/Dark theme (default Light). Submitting the address kicks off
 * the valuation flow page.
 */
export default function HomeValuationEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [headline, setHeadline] = useState<string>(block.data.headline || DEFAULTS.headline);
    const [description, setDescription] = useState<string>(block.data.description || DEFAULTS.description);
    const [placeholder, setPlaceholder] = useState<string>(block.data.placeholder || DEFAULTS.placeholder);
    const [ctaText, setCtaText] = useState<string>(block.data.cta_text || DEFAULTS.cta_text);
    const [bgImage, setBgImage] = useState<string>(block.data.bg_image || '');
    const [theme, setTheme] = useState<'light' | 'dark'>(block.data.theme === 'dark' ? 'dark' : 'light');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [fontColor, setFontColor] = useState<string>(block.data.font_color || '');
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'styles'>('content');
    const TABS = ['content', 'styles'] as const;

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateBlock(websiteId, page, block.id, {
                headline,
                description,
                placeholder,
                cta_text: ctaText,
                bg_image: bgImage,
                theme,
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
        <SlideOverModal title="Edit Home Valuation" onClose={onClose} footer={footer} width={460}>
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
                {tab === 'content' && (
                    <>
                        <div>
                            <FieldLabel>Headline</FieldLabel>
                            <input type="text" className={formInputClass} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="What's Your Home Worth?" />
                        </div>
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short supporting line" />
                        </div>
                        <div>
                            <FieldLabel>Address Placeholder</FieldLabel>
                            <input type="text" className={formInputClass} value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} placeholder="Enter your home address" />
                        </div>
                        <div>
                            <FieldLabel>Button Text</FieldLabel>
                            <input type="text" className={formInputClass} value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Get Valuation" />
                        </div>
                    </>
                )}

                {tab === 'styles' && (
                    <>
                        <div>
                            <FieldLabel>Theme</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['light', 'Light'], ['dark', 'Dark']] as const).map(([val, lbl]) => (
                                    <button key={val} type="button" onClick={() => setTheme(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${theme === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{lbl}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Light = dark text on a light background. Dark = light text on a dark background.</p>
                        </div>
                        {theme === 'dark' && (
                            <>
                                <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#111315" />
                                <ColorRow label="Font Color" value={fontColor} onChange={setFontColor} fallback="#FFFFFF" />
                            </>
                        )}
                        <div>
                            <FieldLabel>Background Image (optional)</FieldLabel>
                            <MediaField websiteId={websiteId} value={bgImage} onChange={setBgImage} size="lg" />
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Sits behind the content with a theme-tinted overlay for readability.</p>
                        </div>
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
