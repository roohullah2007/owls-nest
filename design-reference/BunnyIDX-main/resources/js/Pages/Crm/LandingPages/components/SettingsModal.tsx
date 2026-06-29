import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import MediaField from './MediaField';

export interface PageSettings {
    name: string;
    accent_color: string;
    agent_name: string;
    agent_email: string;
    agent_phone: string;
    meta_title: string;
    meta_description: string;
}

export interface PageConfig {
    logo: string;
    webhook_url: string;
    font: string;
}

// Keep in sync with config/landing-page-fonts.php
const FONT_OPTIONS = [
    'Roboto Flex',
    'Inter',
    'Roboto',
    'Open Sans',
    'Poppins',
    'Montserrat',
    'Lato',
    'Nunito Sans',
    'Work Sans',
    'DM Sans',
    'Playfair Display',
];
const DEFAULT_FONT = 'Roboto Flex';
// Per-template default font — keep in sync with `template_defaults` in config/landing-page-fonts.php
const TEMPLATE_DEFAULT_FONTS: Record<string, string> = {
    'video-landing': 'Open Sans',
};

interface Props {
    settings: PageSettings;
    config: PageConfig;
    pageUuid: string;
    template?: string;
    onClose: () => void;
    onSave: (settings: PageSettings, config: PageConfig) => void;
}

const TABS = ['General', 'Header', 'Contact', 'SEO', 'Webhooks'] as const;
type Tab = (typeof TABS)[number];

/** Page-level settings with tabs (header, branding, contact, SEO, webhooks). */
export default function SettingsModal({ settings, config, pageUuid, template, onClose, onSave }: Props) {
    const defaultFont = (template && TEMPLATE_DEFAULT_FONTS[template]) || DEFAULT_FONT;
    const [tab, setTab] = useState<Tab>('General');
    const [form, setForm] = useState<PageSettings>(settings);
    const [cfg, setCfg] = useState<PageConfig>(config);
    const set = (key: keyof PageSettings, value: string) => setForm((f) => ({ ...f, [key]: value }));
    const setC = (key: keyof PageConfig, value: string) => setCfg((c) => ({ ...c, [key]: value }));

    const footer = (
        <>
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315]">Cancel</button>
            <button type="button" onClick={() => onSave(form, cfg)} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF]">Save</button>
        </>
    );

    return (
        <SlideOverModal title="Page Settings" onClose={onClose} footer={footer} width={460}>
            <div className="flex shrink-0 border-b border-[#E4E7EB] px-4 bg-white">
                {TABS.map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)} className={`relative px-3 py-2.5 text-[13px] font-medium ${tab === t ? 'text-[#1693C9]' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                        {t}
                        {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1693C9] rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {tab === 'General' && (
                    <>
                        <div>
                            <FieldLabel help="Shown only in your dashboard list — not on the public page.">Internal name</FieldLabel>
                            <input value={form.name} onChange={(e) => set('name', e.target.value)} className={formInputClass} />
                        </div>
                        <div>
                            <FieldLabel>Accent color</FieldLabel>
                            <div className="flex items-center gap-2">
                                <input type="color" value={form.accent_color || '#1693C9'} onChange={(e) => set('accent_color', e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-[#C8CCD1] p-0" />
                                <input value={form.accent_color} onChange={(e) => set('accent_color', e.target.value)} className={`${formInputClass} w-32`} />
                            </div>
                        </div>
                        <div>
                            <FieldLabel help="Applied across the whole page. Recommended, web-safe fonts loaded from Google Fonts.">Font</FieldLabel>
                            <select value={cfg.font || defaultFont} onChange={(e) => setC('font', e.target.value)} className={formInputClass} style={{ fontFamily: cfg.font || defaultFont }}>
                                {FONT_OPTIONS.map((f) => (
                                    <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {tab === 'Header' && (
                    <MediaField label="Logo" value={cfg.logo} onChange={(v) => setC('logo', v)} pageUuid={pageUuid} allowUrl={false} help="Upload your logo. If no logo is set, the page header is hidden." />
                )}

                {tab === 'Contact' && (
                    <>
                        <div><FieldLabel>Agent name</FieldLabel><input value={form.agent_name} onChange={(e) => set('agent_name', e.target.value)} className={formInputClass} /></div>
                        <div><FieldLabel>Email</FieldLabel><input value={form.agent_email} onChange={(e) => set('agent_email', e.target.value)} className={formInputClass} /></div>
                        <div><FieldLabel>Phone</FieldLabel><input value={form.agent_phone} onChange={(e) => set('agent_phone', e.target.value)} className={formInputClass} /></div>
                    </>
                )}

                {tab === 'SEO' && (
                    <>
                        <div><FieldLabel>Meta title</FieldLabel><input value={form.meta_title} onChange={(e) => set('meta_title', e.target.value)} className={formInputClass} /></div>
                        <div><FieldLabel>Meta description</FieldLabel><textarea value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} rows={3} className={`${formInputClass} resize-none`} /></div>
                    </>
                )}

                {tab === 'Webhooks' && (
                    <>
                        <div>
                            <FieldLabel help="Every lead submitted on this page is POSTed as JSON to this URL (contact + UTM attribution + answers).">Webhook URL</FieldLabel>
                            <input value={cfg.webhook_url} onChange={(e) => setC('webhook_url', e.target.value)} placeholder="https://hooks.example.com/landing" className={formInputClass} />
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#8B9096]">
                            Sends a <code className="text-[#111315]">landing_page.lead</code> event with the lead's name, email, phone, address, questionnaire answers and full UTM attribution. Use it to forward leads to Zapier, Make, a CRM or a Slack relay.
                        </p>
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
