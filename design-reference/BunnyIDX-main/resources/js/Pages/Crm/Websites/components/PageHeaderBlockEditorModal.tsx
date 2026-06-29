import { useState, type ReactNode } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

/** Segmented control — same look as the hero settings toggles. */
function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <div className="inline-flex rounded-md border border-[#E4E7EB] p-0.5 bg-[#F3F4F6]">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange(o.value)}
                    className={`px-3 h-7 text-[12px] font-medium rounded transition-colors ${value === o.value ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2">
            <div>
                <div className="text-[13px] font-medium text-[#111315]">{label}</div>
                {hint && <div className="text-[11px] text-[#8B9096] mt-0.5">{hint}</div>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

/**
 * Editor for the Page Header block — a reusable page hero. Pick an image OR video
 * background (mp4 / YouTube), a scrim level, height, and heading style. Mirrors the
 * home hero's media options so inner pages get the same treatment.
 */
export default function PageHeaderBlockEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const d = block.data || {};
    const [bgType, setBgType] = useState<string>(d.bg_type === 'video' ? 'video' : 'image');
    const [image, setImage] = useState<string>(d.image || '');
    const [videoUrl, setVideoUrl] = useState<string>(d.video_url || '');
    const [overlay, setOverlay] = useState<string>(d.overlay || 'medium');
    const [height, setHeight] = useState<string>(d.height || 'tall');
    const [style, setStyle] = useState<string>(['plain', 'light'].includes(d.style as string) ? (d.style as string) : 'boxed');
    const [heading, setHeading] = useState<string>(d.heading || '');
    const [subtitle, setSubtitle] = useState<string>(d.subtitle || '');
    const [showScroll, setShowScroll] = useState<boolean>(!!d.show_scroll);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'background' | 'style'>('content');
    const TABS = ['content', 'background', 'style'] as const;

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateBlock(websiteId, page, block.id, {
                bg_type: bgType,
                image,
                video_url: videoUrl,
                overlay,
                height,
                style,
                heading,
                subtitle,
                show_scroll: showScroll ? '1' : '',
            });
            onSaved();
        } finally {
            setSaving(false);
        }
    }

    const footer = (
        <>
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
        </>
    );

    return (
        <SlideOverModal title="Edit Page Header" onClose={onClose} footer={footer} width={460}>
            <div className="flex gap-1 mb-5 border-b border-[#E4E7EB]">
                {TABS.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`px-3 pb-2 text-[12px] font-medium capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-[#1693C9] text-[#111315]' : 'border-transparent text-[#8B9096] hover:text-[#111315]'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {tab === 'content' && (
                <div className="space-y-4">
                    <div>
                        <FieldLabel help="Use line breaks for multi-line headings.">Heading</FieldLabel>
                        <textarea value={heading} onChange={(e) => setHeading(e.target.value)} rows={2} className={formInputClass} placeholder="COMPASS PRIVATE&#10;EXCLUSIVES" />
                    </div>
                    <div>
                        <FieldLabel>Subtitle</FieldLabel>
                        <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} className={formInputClass} placeholder="Optional supporting line" />
                    </div>
                </div>
            )}

            {tab === 'background' && (
                <div className="space-y-4">
                    <Row label="Background">
                        <Seg value={bgType} onChange={setBgType} options={[{ value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }]} />
                    </Row>
                    <div>
                        <FieldLabel help={bgType === 'video' ? 'Used as the video poster / fallback.' : undefined}>Background Image</FieldLabel>
                        <MediaField websiteId={websiteId} value={image} onChange={setImage} size="lg" />
                    </div>
                    {bgType === 'video' && (
                        <div>
                            <FieldLabel help="An .mp4 URL or a YouTube link (auto-detected).">Background Video URL</FieldLabel>
                            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={formInputClass} placeholder="https://… .mp4 or YouTube URL" />
                        </div>
                    )}
                    <Row label="Overlay Darkness" hint="Darkens the media so text stays legible.">
                        <Seg value={overlay} onChange={setOverlay} options={[{ value: 'none', label: 'None' }, { value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'dark', label: 'Dark' }]} />
                    </Row>
                </div>
            )}

            {tab === 'style' && (
                <div className="space-y-4">
                    <Row label="Heading Style" hint="Boxed shows a bottom card; Plain centers text.">
                        <Seg value={style} onChange={setStyle} options={[{ value: 'boxed', label: 'Boxed' }, { value: 'plain', label: 'Plain' }, { value: 'light', label: 'Light (white)' }]} />
                    </Row>
                    <Row label="Height">
                        <Seg value={height} onChange={setHeight} options={[{ value: 'full', label: 'Full' }, { value: 'tall', label: 'Tall' }, { value: 'compact', label: 'Compact' }]} />
                    </Row>
                    <Row label="Scroll-down button" hint="Shows a circular arrow that scrolls past the header.">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={showScroll}
                            onClick={() => setShowScroll(!showScroll)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${showScroll ? 'bg-[#1693C9]' : 'bg-[#D1D5DB]'}`}
                        >
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${showScroll ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>
                    </Row>
                </div>
            )}
        </SlideOverModal>
    );
}
