import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';
import { ColorRow } from './TeamEditorModal';

interface Logo { image: string; link: string }

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

const SPEEDS: { label: string; value: number }[] = [
    { label: 'Slow', value: 45 },
    { label: 'Normal', value: 30 },
    { label: 'Fast', value: 18 },
];

/**
 * Dedicated editor for the Logo Marquee block — background color, monochrome
 * toggle, scroll speed, and a repeater of logos (image + optional link).
 * Logos are stored as a JSON string in block.data.logos.
 */
const TABS = ['content', 'styles'] as const;

export default function LogoMarqueeEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [title, setTitle] = useState<string>(block.data.title || '');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [monochrome, setMonochrome] = useState<boolean>((block.data.monochrome ?? '1') === '1');
    const [speed, setSpeed] = useState<number>(Number(block.data.speed) || 30);
    const [tab, setTab] = useState<'content' | 'styles'>('content');
    const [logos, setLogos] = useState<Logo[]>(() => {
        try {
            const parsed = JSON.parse(block.data.logos || '[]');
            return Array.isArray(parsed) ? parsed.map((l) => ({ image: l.image || '', link: l.link || '' })) : [];
        } catch {
            return [];
        }
    });
    const [saving, setSaving] = useState(false);

    function update(idx: number, key: keyof Logo, value: string) {
        setLogos((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
    }
    function add() { setLogos((prev) => [...prev, { image: '', link: '' }]); }
    function remove(idx: number) { setLogos((prev) => prev.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const clean = logos.filter((l) => l.image);
            await api.updateBlock(websiteId, page, block.id, {
                title,
                bg_color: bgColor,
                // '0', not '' — ConvertEmptyStringsToNull turns '' into null,
                // which the Blade default (?? '1') reads as "not set".
                monochrome: monochrome ? '1' : '0',
                speed: String(speed),
                logos: JSON.stringify(clean),
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
        <SlideOverModal title="Edit Logo Marquee" onClose={onClose} footer={footer} width={460}>
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
                            <FieldLabel>Title</FieldLabel>
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. As Seen In (optional)" />
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Logos</FieldLabel>
                            <div className="space-y-3">
                                {logos.map((l, idx) => (
                                    <div key={idx} className="border border-[#E4E7EB] rounded-[6px] p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] font-semibold text-[#111315]">Logo {idx + 1}</span>
                                            <button type="button" onClick={() => remove(idx)} className="text-[#8B9096] hover:text-[#DC2626] transition-colors p-1 rounded hover:bg-[#FEF2F2]" aria-label="Remove logo">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <MediaField websiteId={websiteId} value={l.image} onChange={(p) => update(idx, 'image', p)} />
                                        <input type="text" className={formInputClass} value={l.link} onChange={(e) => update(idx, 'link', e.target.value)} placeholder="Link (optional)" />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={add}
                                    className="w-full h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#C8CCD1] text-[13px] font-semibold text-[#1693C9] hover:border-[#1693C9] hover:bg-[#F0F9FE] transition-colors"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    Add Logo
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <>
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />

                        <div className="flex items-center justify-between gap-4 py-1">
                            <div>
                                <p className="text-[13px] font-medium text-[#111315]">Monochrome Logos</p>
                                <p className="text-[11px] text-[#8B9096] mt-0.5">Render logos in solid black; full color on hover.</p>
                            </div>
                            <Toggle on={monochrome} onChange={setMonochrome} />
                        </div>

                        <div>
                            <FieldLabel>Scroll Speed</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {SPEEDS.map((s) => (
                                    <button key={s.value} type="button" onClick={() => setSpeed(s.value)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${speed === s.value ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{s.label}</button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
