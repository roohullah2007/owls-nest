import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { SiteData } from '../types';
import { api } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
}

type Tab = 'fonts' | 'cards' | 'leads' | 'css';

/** Must mirror config/fonts.php — the server whitelists against that list. */
const FONTS = [
    'Plus Jakarta Sans', 'Inter', 'Manrope', 'Roboto Flex', 'DM Sans', 'Poppins',
    'Montserrat', 'Nunito Sans', 'Work Sans', 'Lora', 'Playfair Display',
    'Cormorant Garamond', 'Libre Baskerville',
];

/** Stable class hooks users (and the AI) can target with custom CSS. */
const CSS_HOOKS = [
    '.ps-card', '.ps-card-media', '.ps-card-body', '.ps-card-price', '.ps-card-status',
    '.ps-card-facts', '.ps-card-addr', '.ps-header', '.ps-header-brand', '.ps-header-cta',
    '.ps-detail-section', '.ps-detail-gallery', '.ps-detail-calculator', '.ps-comparable-card',
    '.site-footer',
];

/**
 * Design settings for the shared property-search + listing-detail pages:
 * fonts (theme / page / header / footer / cards), header logo height, card
 * border radius and custom CSS with AI generation. Saved to
 * page_data._config.search (theme font → _config.design.font).
 */
export default function SearchDesignModal({ open, onClose, site }: Props) {
    const [tab, setTab] = useState<Tab>('fonts');
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const [themeFont, setThemeFont] = useState('');
    const [font, setFont] = useState('');
    const [headerFont, setHeaderFont] = useState('');
    const [footerFont, setFooterFont] = useState('');
    const [cardFont, setCardFont] = useState('');
    const [logoHeight, setLogoHeight] = useState('');
    const [cardRadius, setCardRadius] = useState('');
    const [customCss, setCustomCss] = useState('');
    const [gateSearch, setGateSearch] = useState(false);
    const [gateDetail, setGateDetail] = useState(false);
    const [consentText, setConsentText] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiBusy, setAiBusy] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const cfg = (site.page_data?._config ?? {}) as Record<string, Record<string, unknown>>;
        const search = (cfg.search ?? {}) as Record<string, unknown>;
        setThemeFont((cfg.design?.font as string) || '');
        setFont((search.font as string) || '');
        setHeaderFont((search.header_font as string) || '');
        setFooterFont((search.footer_font as string) || '');
        setCardFont((search.card_font as string) || '');
        setLogoHeight(search.logo_height != null ? String(search.logo_height) : '');
        setCardRadius(search.card_radius != null ? String(search.card_radius) : '');
        setCustomCss((search.custom_css as string) || '');
        setGateSearch(!!search.require_login_search);
        setGateDetail(!!search.require_login_detail);
        setConsentText(((cfg.forms as Record<string, unknown> | undefined)?.consent_text as string) || '');
        setAiPrompt('');
        setAiError(null);
        setDirty(false);
        setTab('fonts');
    }, [open, site]);

    const mark = () => setDirty(true);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateSearchConfig(site.id, {
                theme_font: themeFont || null,
                font: font || null,
                header_font: headerFont || null,
                footer_font: footerFont || null,
                card_font: cardFont || null,
                logo_height: logoHeight === '' ? null : Number(logoHeight),
                card_radius: cardRadius === '' ? null : Number(cardRadius),
                custom_css: customCss,
                require_login_search: gateSearch,
                require_login_detail: gateDetail,
                consent_text: consentText,
            });
            window.location.reload();
        } catch {
            setSaving(false);
        }
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setAiBusy(true);
        setAiError(null);
        try {
            const res = await api.aiGenerateSearchCss(site.id, aiPrompt.trim(), customCss);
            if (res.value) {
                setCustomCss(res.value);
                mark();
            }
        } catch (e) {
            setAiError((e as { error?: string })?.error || 'Could not generate CSS. Try again.');
        } finally {
            setAiBusy(false);
        }
    };

    const fontSelect = (label: string, value: string, onChange: (v: string) => void, hint: string, placeholder: string) => (
        <div className="we-field">
            <label className="we-label">{label}</label>
            <p className="we-hint">{hint}</p>
            <select className="we-input" value={value} onChange={(e) => { onChange(e.target.value); mark(); }}>
                <option value="">{placeholder}</option>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
        </div>
    );

    const tabs = (
        <div className="we-tabs">
            {([
                ['fonts', 'Fonts'],
                ['cards', 'Property Cards'],
                ['leads', 'Leads'],
                ['css', 'Custom CSS'],
            ] as [Tab, string][]).map(([key, label]) => (
                <button key={key} type="button" className={`we-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
                    {label}
                </button>
            ))}
        </div>
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Search Design"
            wide
            tabs={tabs}
            footer={
                <div className="we-modal-actions">
                    <button type="button" className="we-btn we-btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="we-btn we-btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            }
        >
            {tab === 'fonts' && (
                <>
                    {fontSelect('Theme Font', themeFont, setThemeFont,
                        'Site-wide font for the published website (headers, pages, footer).', 'Template default')}
                    {fontSelect('Property Search Font', font, setFont,
                        'Base font for the property search + listing detail pages.', 'Plus Jakarta Sans (default)')}
                    {fontSelect('Search Header Font', headerFont, setHeaderFont,
                        'Font for the slim search-page header bar.', 'Theme font')}
                    {fontSelect('Footer Font', footerFont, setFooterFont,
                        'Font for the footer on search/detail pages.', 'Theme font')}
                    <div className="we-field">
                        <label className="we-label">Header Logo Height (px)</label>
                        <p className="we-hint">Logo size in the search/detail page header. 20–80px; empty = default (34px).</p>
                        <input type="number" min={20} max={80} className="we-input" value={logoHeight}
                            onChange={(e) => { setLogoHeight(e.target.value); mark(); }} placeholder="34" />
                    </div>
                </>
            )}

            {tab === 'cards' && (
                <>
                    <div className="we-field">
                        <label className="we-label">Card Border Radius (px)</label>
                        <p className="we-hint">Corner rounding for property result cards. 0–32px; empty = default (16px).</p>
                        <input type="number" min={0} max={32} className="we-input" value={cardRadius}
                            onChange={(e) => { setCardRadius(e.target.value); mark(); }} placeholder="16" />
                    </div>
                    {fontSelect('Card Font', cardFont, setCardFont,
                        'Font used inside property result cards.', 'Search page font')}
                </>
            )}

            {tab === 'leads' && (
                <>
                    <div className="we-field">
                        <label className="we-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={gateSearch} onChange={(e) => { setGateSearch(e.target.checked); mark(); }} />
                            Require login for Property Search
                        </label>
                        <p className="we-hint">Visitors must sign up or log in before browsing the search page (content blurs behind a "Sign up to continue to listings" modal). Every signup becomes a CRM lead.</p>
                    </div>
                    <div className="we-field">
                        <label className="we-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={gateDetail} onChange={(e) => { setGateDetail(e.target.checked); mark(); }} />
                            Require login for Listing Detail pages
                        </label>
                        <p className="we-hint">Lock full listing details behind signup while keeping the search page open.</p>
                    </div>
                    <div className="we-field">
                        <label className="we-label">Consent disclosure (all lead forms)</label>
                        <p className="we-hint">Shown beside the required "Agree to Privacy Policy" checkbox on signup, contact, save-search and showing-request forms. Leave empty for the default TCPA-style text personalised with your name.</p>
                        <textarea className="we-textarea" rows={7} value={consentText}
                            onChange={(e) => { setConsentText(e.target.value); mark(); }}
                            placeholder="By providing [your name] your contact information, you acknowledge and agree to our Privacy Policy and consent to receiving marketing communications…" />
                    </div>
                </>
            )}

            {tab === 'css' && (
                <>
                    <div className="we-field">
                        <label className="we-label">Describe the look you want</label>
                        <p className="we-hint">AI writes CSS targeting the property cards and detail page. Example: "give cards a subtle gold border and a serif price".</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" className="we-input" value={aiPrompt} style={{ flex: 1 }}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAiGenerate(); }}
                                placeholder="e.g. larger price, thinner borders, soft shadows" />
                            <button type="button" className="we-btn we-btn-primary" onClick={handleAiGenerate} disabled={aiBusy || !aiPrompt.trim()}>
                                {aiBusy ? 'Generating…' : 'Generate with AI'}
                            </button>
                        </div>
                        {aiError && <p className="we-hint" style={{ color: '#dc2626', marginTop: 6 }}>{aiError}</p>}
                    </div>
                    <div className="we-field">
                        <label className="we-label">Custom CSS</label>
                        <p className="we-hint">Applied on the property search + detail pages. Available hooks: {CSS_HOOKS.join(', ')}</p>
                        <textarea className="we-textarea" rows={12} value={customCss} spellCheck={false}
                            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}
                            onChange={(e) => { setCustomCss(e.target.value); mark(); }}
                            placeholder={'.ps-card { border-radius: 8px; }\n.ps-card-price { color: #B8860B; }'} />
                    </div>
                </>
            )}
        </Modal>
    );
}
