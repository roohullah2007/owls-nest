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

const TABS = ['content', 'layout', 'styles'] as const;

/**
 * Dedicated editor for the Newsletter block — split (content + image) or
 * centered (logo on top) layout, heading/description, button text, which
 * fields to capture (email always; name/phone optional), stacked vs inline
 * inputs, a light/dark theme, an optional consent-text override, and a
 * background color. The live consent line is built from the site's own agent
 * name, so it isn't edited here unless overriding.
 */
export default function NewsletterEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [variant, setVariant] = useState<'split' | 'centered'>(block.data.variant === 'centered' ? 'centered' : 'split');
    const [theme, setTheme] = useState<'light' | 'dark'>(block.data.theme === 'dark' ? 'dark' : 'light');
    const [formLayout, setFormLayout] = useState<'stacked' | 'inline'>(block.data.form_layout === 'inline' ? 'inline' : 'stacked');
    const [collectName, setCollectName] = useState<boolean>((block.data.collect_name ?? '1') === '1');
    const [collectPhone, setCollectPhone] = useState<boolean>(block.data.collect_phone === '1');
    const [heading, setHeading] = useState<string>(block.data.heading ?? 'Stay Updated With Exclusive Listings');
    const [description, setDescription] = useState<string>(block.data.description ?? '');
    const [image, setImage] = useState<string>(block.data.image || '');
    const [buttonText, setButtonText] = useState<string>(block.data.button_text || '');
    const [consentText, setConsentText] = useState<string>(block.data.consent_text || '');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateBlock(websiteId, page, block.id, {
                variant,
                theme,
                form_layout: formLayout,
                // '0', not '' — Laravel's ConvertEmptyStringsToNull turns '' into
                // null, which the Blade default (?? '1') reads as "not set".
                collect_name: collectName ? '1' : '0',
                collect_phone: collectPhone ? '1' : '0',
                heading,
                description,
                image,
                button_text: buttonText,
                consent_text: consentText,
                bg_color: bgColor,
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
        <SlideOverModal title="Edit Newsletter" onClose={onClose} footer={footer} width={460}>
            {/* Tab bar */}
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
                            <input type="text" className={formInputClass} value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Stay Updated With Exclusive Listings" />
                        </div>
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short supporting line" />
                        </div>

                        <div>
                            <FieldLabel>Button Text</FieldLabel>
                            <input type="text" className={formInputClass} value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Subscribe" />
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Information to Capture</FieldLabel>
                            <div className="space-y-1.5">
                                <label className="flex items-center gap-2.5 py-0.5 opacity-60">
                                    <input type="checkbox" checked disabled className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9]" />
                                    <span className="text-[13px] text-[#111315]">Email <span className="text-[11px] text-[#8B9096]">(always collected)</span></span>
                                </label>
                                <label className="flex items-center gap-2.5 py-0.5 cursor-pointer">
                                    <input type="checkbox" checked={collectName} onChange={(e) => setCollectName(e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-[#1693C9]" />
                                    <span className="text-[13px] text-[#111315]">Name</span>
                                </label>
                                <label className="flex items-center gap-2.5 py-0.5 cursor-pointer">
                                    <input type="checkbox" checked={collectPhone} onChange={(e) => setCollectPhone(e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-[#1693C9]" />
                                    <span className="text-[13px] text-[#111315]">Phone</span>
                                </label>
                            </div>
                        </div>

                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Consent Text (optional)</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={5} value={consentText} onChange={(e) => setConsentText(e.target.value)} placeholder="Leave blank to auto-generate from your agent name. A Privacy Policy link is appended automatically." />
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Leave blank to use the default consent line built from your name + Privacy Policy.</p>
                        </div>
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <>
                        <div>
                            <FieldLabel>Layout</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['split', 'Image Right'], ['centered', 'Centered']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setVariant(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${variant === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <FieldLabel>Form Inputs</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['stacked', 'Stacked'], ['inline', 'Inline']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setFormLayout(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${formLayout === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Stacked puts each field on its own row. Inline puts the fields and button in a single row.</p>
                        </div>
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
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Light = black text and an outlined button on light grey. Dark = white text on black.</p>
                        </div>

                        <div>
                            <FieldLabel>{variant === 'centered' ? 'Logo / Image (top)' : 'Image (right)'}</FieldLabel>
                            <MediaField websiteId={websiteId} value={image} onChange={setImage} size="lg" />
                        </div>

                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback={theme === 'dark' ? '#000000' : '#F3F4F6'} />
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
