import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { SiteData } from '@/website-editor/types';
import MediaField from './MediaField';
import HeroTabSettingsModal, { HeroTabCfg } from './HeroTabSettingsModal';

const TAB_KEYS = ['buy', 'rent', 'sell', 'value'] as const;
const TAB_DEFAULT_LABEL: Record<string, string> = { buy: 'Buy', rent: 'Rent', sell: 'Sell', value: 'Home Value' };

interface Props {
    onClose: () => void;
    onSaved: () => void;
    site: SiteData | null;
    page: string;
}

const HERO_FORM_DEFAULTS: Record<string, { heading: string; text: string }> = {
    buyer: { heading: 'Find Your Dream Home', text: "Tell us what you're looking for and we'll send matching listings." },
    seller: { heading: "What's Your Home Worth?", text: 'Get a free, no-obligation valuation of your property.' },
    contact: { heading: 'Get In Touch', text: "Have a question? Send a message and we'll get right back to you." },
};

interface HeroData {
    hero_layout?: string; hero_align?: string; hero_height?: string; hero_overlay?: string;
    hero_eyebrow?: string; hero_headline?: string; hero_subtitle?: string;
    hero_search?: string; hero_tab_align?: string;
    hero_tab_buy?: string; hero_tab_rent?: string; hero_tab_sell?: string; hero_tab_value?: string;
    hero_tab_buy_label?: string; hero_tab_rent_label?: string; hero_tab_sell_label?: string; hero_tab_value_label?: string;
    hero_cta_search?: string; hero_cta_buy?: string; hero_cta_sell?: string;
    hero_cta_search_label?: string; hero_cta_buy_label?: string; hero_cta_sell_label?: string;
    hero_right_type?: string; hero_form_type?: string; hero_form_heading?: string; hero_form_text?: string;
    hero_image?: string; hero_video_url?: string;
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
    return (
        <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange(o.value)}
                    className={`h-7 px-3 text-[12px] font-medium rounded-[3px] transition-colors ${value === o.value ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
            className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}>
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 py-1">
        <div><p className="text-[13px] font-medium text-[#111315]">{label}</p>{hint && <p className="text-[11px] text-[#8B9096] mt-0.5">{hint}</p>}</div>
        {children}
    </div>
);
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[12px] font-semibold text-[#111315]">{children}</p>
);

/** Hero section editor — layout, alignment, content, CTAs and the optional right column. */
export default function HeroSettingsModal({ onClose, onSaved, site, page }: Props) {
    const init = (site?.page_data?.[page] as HeroData | undefined) || {};
    // A toggle saved as "off" is stored as null but the key still exists (array_merge keeps it).
    // For toggles that default ON we must check key PRESENCE — `?? '1'` would wrongly flip a
    // saved-off (null) value back to on, so the off state wasn't preserved on reopen.
    const onByDefault = (k: keyof HeroData): string =>
        k in init ? ((init[k] as string | undefined) || '') : '1';
    const [d, setD] = useState<HeroData>({
        hero_layout: init.hero_layout || 'single',
        hero_align: init.hero_align || 'center',
        hero_height: init.hero_height || 'full',
        hero_overlay: init.hero_overlay || 'medium',
        hero_eyebrow: init.hero_eyebrow || '',
        hero_headline: init.hero_headline || (site?.hero_headline || ''),
        // Once hero_subtitle exists in page_data (even cleared to empty) respect it; only fall back to the column the first time.
        hero_subtitle: 'hero_subtitle' in init ? (init.hero_subtitle || '') : (site?.hero_subtitle || ''),
        // Default a fresh hero to the Tabbed (search) CTA so the search is enabled out of the box.
        hero_search: onByDefault('hero_search'),
        hero_tab_align: init.hero_tab_align || 'auto',
        hero_tab_buy: onByDefault('hero_tab_buy'),
        hero_tab_rent: onByDefault('hero_tab_rent'),
        hero_tab_sell: onByDefault('hero_tab_sell'),
        hero_tab_value: onByDefault('hero_tab_value'),
        hero_tab_buy_label: init.hero_tab_buy_label || '',
        hero_tab_rent_label: init.hero_tab_rent_label || '',
        hero_tab_sell_label: init.hero_tab_sell_label || '',
        hero_tab_value_label: init.hero_tab_value_label || '',
        hero_cta_search: init.hero_cta_search || '', // default OFF — unset and saved-off both read as off
        hero_cta_buy: onByDefault('hero_cta_buy'),
        hero_cta_sell: onByDefault('hero_cta_sell'),
        hero_cta_search_label: init.hero_cta_search_label || '',
        hero_cta_buy_label: init.hero_cta_buy_label || '',
        hero_cta_sell_label: init.hero_cta_sell_label || '',
        hero_right_type: init.hero_right_type || 'form',
        hero_form_type: init.hero_form_type || 'contact',
        hero_form_heading: init.hero_form_heading || '',
        hero_form_text: init.hero_form_text || '',
        hero_image: init.hero_image || (site?.hero_image || ''),
        hero_video_url: init.hero_video_url || '',
    });
    // Per-tab search settings (gear sub-modal). Stored as flat hero_tab_{key}_* page_data keys.
    const initRaw = init as Record<string, string | undefined>;
    const readTabCfg = (k: string): HeroTabCfg => ({
        ai: !!initRaw[`hero_tab_${k}_ai`],
        ptype: initRaw[`hero_tab_${k}_ptype`] || '',
        subtypes: (() => { try { return JSON.parse(initRaw[`hero_tab_${k}_subtypes`] || '[]'); } catch { return []; } })(),
        status: initRaw[`hero_tab_${k}_status`] || '',
        loc: initRaw[`hero_tab_${k}_loc`] || '',
        minPrice: initRaw[`hero_tab_${k}_min_price`] || '',
        maxPrice: initRaw[`hero_tab_${k}_max_price`] || '',
    });
    const [tabCfg, setTabCfg] = useState<Record<string, HeroTabCfg>>(() =>
        Object.fromEntries(TAB_KEYS.map((k) => [k, readTabCfg(k)])));
    const [gearTab, setGearTab] = useState<string | null>(null);

    // Global IDX search config (Property Search → Restrictions). The per-tab hero
    // defaults must stay inside these limits — never offer a type/sub-type the
    // global settings hide, and flag a tab whose transaction is globally disabled.
    const searchCfg = ((site?.page_data as Record<string, unknown> | null)?._config as { search?: Record<string, unknown> } | undefined)?.search ?? {};
    const asStrArr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
    const globalExcludedTypes = asStrArr(searchCfg.excluded_property_types);
    const globalExcludedSubtypes = asStrArr(searchCfg.excluded_property_subtypes);
    const globalAllowedTxn = asStrArr(searchCfg.allowed_transactions).length
        ? asStrArr(searchCfg.allowed_transactions) : ['sale', 'rent'];

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const set = <K extends keyof HeroData>(k: K, v: HeroData[K]) => setD((p) => ({ ...p, [k]: v }));
    const twoCol = d.hero_layout === 'two-column';

    async function handleSave() {
        if (!site) return;
        setSaving(true);
        setError(null);
        try {
            // Flatten the per-tab search settings into hero_tab_{key}_* keys.
            const tabSettingFields: Record<string, string | null> = {};
            for (const k of TAB_KEYS) {
                const c = tabCfg[k];
                tabSettingFields[`hero_tab_${k}_ai`] = c.ai ? '1' : null;
                tabSettingFields[`hero_tab_${k}_ptype`] = c.ptype || null;
                tabSettingFields[`hero_tab_${k}_subtypes`] = c.subtypes.length ? JSON.stringify(c.subtypes) : null;
                tabSettingFields[`hero_tab_${k}_status`] = c.status || null;
                tabSettingFields[`hero_tab_${k}_loc`] = c.loc || null;
                tabSettingFields[`hero_tab_${k}_min_price`] = c.minPrice || null;
                tabSettingFields[`hero_tab_${k}_max_price`] = c.maxPrice || null;
            }

            // Persist the hero settings (search toggle, CTAs, content) FIRST so a
            // failure on the secondary image-column update can never silently
            // discard them.
            await api.updatePageData(site.id, page, {
                ...tabSettingFields,
                hero_layout: d.hero_layout || 'single',
                hero_align: d.hero_align || 'center',
                hero_height: d.hero_height || 'full',
                hero_overlay: d.hero_overlay || 'medium',
                hero_eyebrow: d.hero_eyebrow || null,
                hero_headline: d.hero_headline || null,
                hero_subtitle: d.hero_subtitle || null,
                hero_search: d.hero_search ? '1' : null,
                hero_tab_align: d.hero_tab_align || 'auto',
                hero_tab_buy: d.hero_tab_buy ? '1' : null,
                hero_tab_rent: d.hero_tab_rent ? '1' : null,
                hero_tab_sell: d.hero_tab_sell ? '1' : null,
                hero_tab_value: d.hero_tab_value ? '1' : null,
                hero_tab_buy_label: d.hero_tab_buy_label || null,
                hero_tab_rent_label: d.hero_tab_rent_label || null,
                hero_tab_sell_label: d.hero_tab_sell_label || null,
                hero_tab_value_label: d.hero_tab_value_label || null,
                hero_cta_search: d.hero_cta_search ? '1' : null,
                hero_cta_buy: d.hero_cta_buy ? '1' : null,
                hero_cta_sell: d.hero_cta_sell ? '1' : null,
                hero_cta_search_label: d.hero_cta_search_label || null,
                hero_cta_buy_label: d.hero_cta_buy_label || null,
                hero_cta_sell_label: d.hero_cta_sell_label || null,
                hero_right_type: twoCol ? (d.hero_right_type || 'form') : null,
                hero_form_type: d.hero_form_type || 'contact',
                hero_form_heading: d.hero_form_heading || null,
                hero_form_text: d.hero_form_text || null,
                hero_video_url: d.hero_video_url || null,
            });
            await api.updateSite(site.id, { hero_image: d.hero_image || null });
            onSaved();
        } catch (e) {
            const msg = (e as { message?: string })?.message
                || 'Could not save hero settings. Please try again.';
            setError(msg);
        } finally {
            setSaving(false);
        }
    }

    const footer = (
        <>
            {error && <span className="mr-auto text-[12px] text-[#D14343]">{error}</span>}
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors">{saving ? 'Saving…' : 'Save'}</button>
        </>
    );

    return (
        <SlideOverModal title="Hero Settings" onClose={onClose} footer={footer} width={480}>
            {/* Tabs */}
            <div className="flex shrink-0 border-b border-[#E4E7EB] px-4 bg-white">
                {(['content', 'layout', 'styles'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className={`relative px-3 py-2.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'text-[#1693C9]' : 'text-[#5F656D] hover:text-[#111315]'}`}
                    >
                        {t}
                        {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1693C9] rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
                {/* ── CONTENT ── */}
                {tab === 'content' && (
                    <>
                        <div className="space-y-4">
                            <div><FieldLabel>Text Above Heading</FieldLabel><input type="text" value={d.hero_eyebrow || ''} onChange={(e) => set('hero_eyebrow', e.target.value)} className={formInputClass} placeholder="e.g. Luxury Real Estate" /></div>
                            <div><FieldLabel>Heading</FieldLabel><textarea value={d.hero_headline || ''} onChange={(e) => set('hero_headline', e.target.value)} className={`${formInputClass} resize-none`} rows={2} placeholder="Your hero headline" /></div>
                            <div><FieldLabel>Paragraph</FieldLabel><textarea value={d.hero_subtitle || ''} onChange={(e) => set('hero_subtitle', e.target.value)} className={`${formInputClass} resize-none`} rows={3} placeholder="Supporting text" /></div>
                        </div>

                        {/* Call to Action — Tabbed search (default) or simple link buttons */}
                        <div className="space-y-3 border-t border-[#E4E7EB] pt-5">
                            <SectionLabel>Call to Action</SectionLabel>
                            <p className="text-[11px] text-[#8B9096] -mt-1.5">How visitors start from the hero.</p>
                            <Seg
                                value={d.hero_search ? 'tabbed' : 'buttons'}
                                onChange={(v) => set('hero_search', v === 'tabbed' ? '1' : '')}
                                options={[{ value: 'tabbed', label: 'Search Tabs' }, { value: 'buttons', label: 'Link Buttons' }]}
                            />
                            <p className="text-[11px] text-[#8B9096] leading-relaxed">
                                {d.hero_search
                                    ? 'A live search bar with tabs — visitors search listings right from the hero.'
                                    : 'Simple buttons that link to your Buy, Sell or Search pages — no search bar.'}
                            </p>

                            {!!d.hero_search && (
                                <Row label="Tab Alignment" hint="Auto follows the hero alignment.">
                                    <Seg value={d.hero_tab_align || 'auto'} onChange={(v) => set('hero_tab_align', v)} options={[{ value: 'auto', label: 'Auto' }, { value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} />
                                </Row>
                            )}

                            <div className="space-y-2 pt-1.5">
                                <div className="flex items-center justify-between">
                                    <p className="text-[12px] font-medium text-[#111315]">{d.hero_search ? 'Search Tabs' : 'Buttons'}</p>
                                    <p className="text-[11px] text-[#8B9096]">Toggle off to hide · type to rename</p>
                                </div>
                                {(d.hero_search
                                    ? [
                                        ['hero_tab_buy', 'hero_tab_buy_label', 'Buy'],
                                        ['hero_tab_rent', 'hero_tab_rent_label', 'Rent'],
                                        ['hero_tab_sell', 'hero_tab_sell_label', 'Sell'],
                                        ['hero_tab_value', 'hero_tab_value_label', 'Home Value'],
                                    ]
                                    : [
                                        ['hero_cta_search', 'hero_cta_search_label', 'Search'],
                                        ['hero_cta_buy', 'hero_cta_buy_label', 'I Want to Buy'],
                                        ['hero_cta_sell', 'hero_cta_sell_label', 'I Want to Sell'],
                                    ]
                                ).map(([toggleKey, labelKey, def]) => {
                                    const on = !!d[toggleKey as keyof HeroData];
                                    // Only the Tabbed (search) rows get a gear → per-tab search settings.
                                    const tabK = d.hero_search ? toggleKey.replace('hero_tab_', '') : null;
                                    return (
                                        <div key={toggleKey} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={d[labelKey as keyof HeroData] || ''}
                                                onChange={(e) => set(labelKey as keyof HeroData, e.target.value)}
                                                className={`${formInputClass} flex-1 ${on ? '' : 'opacity-40'}`}
                                                placeholder={`${def} (default)`}
                                                disabled={!on}
                                            />
                                            {tabK && (
                                                <button
                                                    type="button"
                                                    onClick={() => setGearTab(tabK)}
                                                    disabled={!on}
                                                    title="Search settings"
                                                    aria-label={`${def} search settings`}
                                                    className={`shrink-0 grid place-items-center h-8 w-8 rounded border border-[#E4E7EB] text-[#5F656D] hover:text-[#1693C9] hover:border-[#1693C9] transition-colors ${on ? '' : 'opacity-40 pointer-events-none'}`}
                                                >
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.11v1.093c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.384-.93.78-.164.398-.142.855.108 1.205l.527.737c.32.448.27 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.448.32-1.06.27-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.148c.424-.071.765-.384.93-.781.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                                    </svg>
                                                </button>
                                            )}
                                            <Toggle on={on} onChange={(v) => set(toggleKey as keyof HeroData, v ? '1' : '')} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right column (two-column only) */}
                        {twoCol && (
                            <div className="space-y-4 border-t border-[#E4E7EB] pt-5">
                                <SectionLabel>Right Column</SectionLabel>
                                <Row label="Content"><Seg value={d.hero_right_type || 'form'} onChange={(v) => set('hero_right_type', v)} options={[{ value: 'form', label: 'Lead Form' }, { value: 'listings', label: 'Listings' }]} /></Row>
                                {d.hero_right_type === 'form' && (
                                    <>
                                        <div><FieldLabel>Form Type</FieldLabel><Seg value={d.hero_form_type || 'contact'} onChange={(v) => set('hero_form_type', v)} options={[{ value: 'buyer', label: 'Buyer' }, { value: 'seller', label: 'Seller' }, { value: 'contact', label: 'Contact' }]} /></div>
                                        <div><FieldLabel>Form Heading</FieldLabel><input type="text" value={d.hero_form_heading || ''} onChange={(e) => set('hero_form_heading', e.target.value)} className={formInputClass} placeholder={HERO_FORM_DEFAULTS[d.hero_form_type || 'contact'].heading} /></div>
                                        <div><FieldLabel help="Leave blank to use the default for this form type.">Form Text</FieldLabel><textarea value={d.hero_form_text || ''} onChange={(e) => set('hero_form_text', e.target.value)} className={`${formInputClass} resize-none`} rows={2} placeholder={HERO_FORM_DEFAULTS[d.hero_form_type || 'contact'].text} /></div>
                                    </>
                                )}
                                {d.hero_right_type === 'listings' && (
                                    <p className="text-[12px] text-[#8B9096]">Shows your latest active listings as a slider.</p>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <div className="space-y-3">
                        <Row label="Layout"><Seg value={d.hero_layout || 'single'} onChange={(v) => set('hero_layout', v)} options={[{ value: 'single', label: 'Single' }, { value: 'two-column', label: 'Two Column' }]} /></Row>
                        <Row label="Height" hint="Full viewport, or a compact band."><Seg value={d.hero_height || 'full'} onChange={(v) => set('hero_height', v)} options={[{ value: 'full', label: 'Full' }, { value: 'compact', label: 'Compact' }]} /></Row>
                        {!twoCol && (
                            <Row label="Content Alignment"><Seg value={d.hero_align || 'center'} onChange={(v) => set('hero_align', v)} options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]} /></Row>
                        )}
                        {twoCol && <p className="text-[12px] text-[#8B9096]">Configure the right column under the Content tab.</p>}
                    </div>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <div className="space-y-4">
                        <div>
                            <FieldLabel>Hero Image</FieldLabel>
                            <MediaField websiteId={site?.id || 0} value={d.hero_image || ''} onChange={(p) => set('hero_image', p)} size="lg" />
                        </div>
                        <div><FieldLabel help="Used when no hero image is set.">Background Video URL</FieldLabel><input type="text" value={d.hero_video_url || ''} onChange={(e) => set('hero_video_url', e.target.value)} className={formInputClass} placeholder="https://… .mp4 or YouTube URL" /></div>
                        <Row label="Overlay Darkness" hint="Darkens the image so text stays legible.">
                            <Seg value={d.hero_overlay || 'medium'} onChange={(v) => set('hero_overlay', v)} options={[{ value: 'none', label: 'None' }, { value: 'light', label: 'Light' }, { value: 'medium', label: 'Medium' }, { value: 'dark', label: 'Dark' }]} />
                        </Row>
                    </div>
                )}
            </div>

            {gearTab && (
                <HeroTabSettingsModal
                    tabKey={gearTab}
                    label={(d[`hero_tab_${gearTab}_label` as keyof HeroData] as string) || TAB_DEFAULT_LABEL[gearTab] || gearTab}
                    cfg={tabCfg[gearTab]}
                    excludedTypes={globalExcludedTypes}
                    excludedSubtypes={globalExcludedSubtypes}
                    allowedTransactions={globalAllowedTxn}
                    onChange={(c) => setTabCfg((p) => ({ ...p, [gearTab]: c }))}
                    onClose={() => setGearTab(null)}
                />
            )}
        </SlideOverModal>
    );
}
