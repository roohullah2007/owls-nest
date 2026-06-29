import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { SiteData } from '@/website-editor/types';
import MediaField from './MediaField';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    site: SiteData | null;
}

const TABS = ['branding', 'content'] as const;

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
            className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}>
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

/**
 * Footer settings — brand / brokerage / MLS logos, the disclaimer text, a
 * copyright line and the Equal Housing logo toggle. Persisted to
 * page_data._config.footer via the footer-config endpoint.
 */
export default function FooterSettingsModal({ onClose, onSaved, websiteId, site }: Props) {
    const fcfg = (site?.page_data?._config as { footer?: Record<string, unknown> } | undefined)?.footer || {};
    const [logo, setLogo] = useState<string>((fcfg.logo as string) || '');
    const [brokerageLogo, setBrokerageLogo] = useState<string>((fcfg.brokerage_logo as string) || '');
    const [mlsLogo, setMlsLogo] = useState<string>((fcfg.mls_logo as string) || '');
    const [disclaimer, setDisclaimer] = useState<string>((fcfg.disclaimer as string) || '');
    const [copyrightText, setCopyrightText] = useState<string>((fcfg.copyright as string) || '');
    const [showEho, setShowEho] = useState<boolean>(fcfg.show_eho === undefined ? true : !!fcfg.show_eho);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'branding' | 'content'>('branding');

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateFooterConfig(websiteId, {
                logo,
                brokerage_logo: brokerageLogo,
                mls_logo: mlsLogo,
                disclaimer,
                copyright: copyrightText,
                show_eho: showEho,
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
        <SlideOverModal title="Footer Settings" onClose={onClose} footer={footer} width={460}>
            <div className="flex shrink-0 border-b border-[#E4E7EB] px-4 bg-white">
                {TABS.map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                        className={`relative px-3 py-2.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'text-[#1693C9]' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                        {t}
                        {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1693C9] rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5">
                {/* ── BRANDING ── */}
                {tab === 'branding' && (
                    <>
                        <div>
                            <FieldLabel>Footer Logo</FieldLabel>
                            <MediaField websiteId={websiteId} value={logo} onChange={setLogo} size="lg" />
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Shown top-left of the footer. Falls back to your brokerage name if empty.</p>
                        </div>
                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Brokerage Logo</FieldLabel>
                            <MediaField websiteId={websiteId} value={brokerageLogo} onChange={setBrokerageLogo} />
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Optional — displayed in the footer logos row.</p>
                        </div>
                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>MLS Logo</FieldLabel>
                            <MediaField websiteId={websiteId} value={mlsLogo} onChange={setMlsLogo} />
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Optional — some MLSes require their logo to be shown.</p>
                        </div>
                        <div className="border-t border-[#E4E7EB] pt-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[13px] font-medium text-[#111315]">Equal Housing logo</p>
                                <p className="text-[11px] text-[#8B9096] mt-0.5">Show the Realtor® / Equal Housing Opportunity logo.</p>
                            </div>
                            <Toggle on={showEho} onChange={setShowEho} />
                        </div>
                    </>
                )}

                {/* ── CONTENT ── */}
                {tab === 'content' && (
                    <>
                        <div>
                            <FieldLabel>Disclaimer</FieldLabel>
                            <textarea className={`${formInputClass} resize-none`} rows={9} value={disclaimer} onChange={(e) => setDisclaimer(e.target.value)} placeholder="Leave blank to auto-generate from your agent / brokerage name." />
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Brokerage / fair-housing disclaimer shown above the bottom row.</p>
                        </div>
                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Copyright Text</FieldLabel>
                            <input type="text" className={formInputClass} value={copyrightText} onChange={(e) => setCopyrightText(e.target.value)} placeholder="Copyright © (current year)" />
                            <p className="text-[11px] text-[#8B9096] mt-1.5">Leave blank to use “Copyright © (current year)”.</p>
                        </div>
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
