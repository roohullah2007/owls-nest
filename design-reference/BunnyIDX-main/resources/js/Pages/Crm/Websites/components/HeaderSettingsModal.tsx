import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { SiteData } from '@/website-editor/types';
import MediaField from './MediaField';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    site: SiteData | null;
}

interface DropdownLink { label: string; url: string }

interface HeaderConfig {
    social?: boolean; auth?: boolean; menu_modal?: boolean;
    show_facebook?: boolean; show_instagram?: boolean; show_linkedin?: boolean; show_youtube?: boolean; show_tiktok?: boolean;
    menu_align?: string;
    styles_enabled?: boolean; bg?: string; font_color?: string;
    dropdown_enabled?: boolean; dropdown_bg?: string; dropdown_font_color?: string;
    btn_bg?: string; btn_text?: string;
    cta_enabled?: boolean; cta_text?: string; cta_link?: string;
    nav_dropdowns?: Record<string, DropdownLink[]>;
}

const BUILT_IN_NAV_LABELS: Record<string, string> = {
    home: 'Home', about: 'About', buy: 'Buy', sell: 'Sell', areas: 'Communities', blog: 'Blog', contact: 'Contact',
};
const DEFAULT_NAV_ORDER = ['home', 'about', 'buy', 'sell', 'areas', 'blog', 'contact'];

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'} ${disabled ? 'opacity-40' : ''}`}
        >
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

/** A switch row with a dark label + optional hint. */
function SwitchRow({ label, hint, on, onChange, disabled }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2">
            <div className={disabled ? 'opacity-50' : ''}>
                <p className="text-[13px] font-medium text-[#111315]">{label}</p>
                {hint && <p className="text-[11px] text-[#8B9096] mt-0.5">{hint}</p>}
            </div>
            <Toggle on={on} onChange={onChange} disabled={disabled} />
        </div>
    );
}

function ColorField({ label, value, onChange, fallback }: { label: string; value: string; onChange: (v: string) => void; fallback: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] font-medium text-[#111315]">{label}</p>
            <div className="flex items-center gap-2 shrink-0">
                <input
                    type="color"
                    value={value || fallback}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 w-9 rounded cursor-pointer border-0 p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-[#E4E7EB]"
                />
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={`${formInputClass} w-[96px]`} placeholder={fallback} />
                {value && <button type="button" onClick={() => onChange('')} className="text-[11px] font-medium text-[#8B9096] hover:text-[#111315]">Reset</button>}
            </div>
        </div>
    );
}

function LogoUpload({ websiteId, label, hint, value, onChange }: { websiteId: number; label: string; hint: string; value: string; onChange: (path: string) => void }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[#111315]">{label}</p>
                <p className="text-[11px] text-[#8B9096] mt-0.5">{hint}</p>
            </div>
            <MediaField websiteId={websiteId} value={value} onChange={onChange} size="lg" />
        </div>
    );
}

const Divider = () => <div className="border-t border-[#E4E7EB]" />;

/** Global header settings — logos, behaviour, features, CTA and optional styles. */
export default function HeaderSettingsModal({ onClose, onSaved, site }: Props) {
    const initial = ((site?.page_data?._config as { header?: HeaderConfig } | undefined)?.header) || {};

    const [sticky, setSticky] = useState(!!site?.header_sticky);
    const [transparent, setTransparent] = useState((site?.header_style || 'solid') === 'transparent');
    const [cfg, setCfg] = useState<HeaderConfig>({
        social: initial.social ?? false,
        show_facebook: initial.show_facebook ?? true,
        show_instagram: initial.show_instagram ?? true,
        show_linkedin: initial.show_linkedin ?? false,
        show_youtube: initial.show_youtube ?? false,
        show_tiktok: initial.show_tiktok ?? false,
        auth: initial.auth ?? false,
        menu_modal: initial.menu_modal ?? true,
        menu_align: initial.menu_align || 'right',
        nav_dropdowns: initial.nav_dropdowns ?? {},
        styles_enabled: initial.styles_enabled ?? false,
        bg: initial.bg || '',
        font_color: initial.font_color || '',
        dropdown_enabled: initial.dropdown_enabled ?? false,
        dropdown_bg: initial.dropdown_bg || '',
        dropdown_font_color: initial.dropdown_font_color || '',
        btn_bg: initial.btn_bg || '',
        btn_text: initial.btn_text || '',
        cta_enabled: initial.cta_enabled ?? false,
        cta_text: initial.cta_text || '',
        cta_link: initial.cta_link || '',
    });
    const [logoLight, setLogoLight] = useState(site?.site_logo_light || '');
    const [logoDark, setLogoDark] = useState(site?.site_logo_dark || '');
    const [saving, setSaving] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const set = <K extends keyof HeaderConfig>(key: K, value: HeaderConfig[K]) => setCfg((p) => ({ ...p, [key]: value }));

    // Nav items eligible for a dropdown — the site's enabled pages, built-in + custom.
    const pagesConfig = (site?.page_data?._config as { nav_order?: string[]; disabled_pages?: string[]; custom_pages?: Array<{ slug: string; title: string }> } | undefined) || {};
    const navOrder = pagesConfig.nav_order?.length ? pagesConfig.nav_order : DEFAULT_NAV_ORDER;
    const disabledPages = pagesConfig.disabled_pages || [];
    const customPages = pagesConfig.custom_pages || [];
    const dropdownTargets = navOrder
        .filter((slug) => !disabledPages.includes(slug))
        .map((slug) => ({ slug, label: BUILT_IN_NAV_LABELS[slug] || customPages.find((p) => p.slug === slug)?.title || slug }));

    // Mutate one nav item's dropdown link list.
    function setLinks(slug: string, links: DropdownLink[]) {
        setCfg((p) => {
            const next = { ...(p.nav_dropdowns || {}) };
            if (links.length) next[slug] = links; else delete next[slug];
            return { ...p, nav_dropdowns: next };
        });
    }

    async function handleSave() {
        if (!site) return;
        setSaving(true);
        try {
            await api.updateSite(site.id, {
                header_sticky: sticky,
                header_style: transparent ? 'transparent' : 'solid',
                site_logo_light: logoLight || null,
                site_logo_dark: logoDark || null,
            });
            await api.updateHeaderConfig(site.id, {
                social: !!cfg.social, auth: !!cfg.auth, menu_modal: !!cfg.menu_modal,
                show_facebook: !!cfg.show_facebook, show_instagram: !!cfg.show_instagram, show_linkedin: !!cfg.show_linkedin, show_youtube: !!cfg.show_youtube, show_tiktok: !!cfg.show_tiktok,
                menu_align: cfg.menu_align || 'right',
                nav_dropdowns: cfg.nav_dropdowns || {},
                styles_enabled: !!cfg.styles_enabled,
                bg: cfg.styles_enabled ? (cfg.bg || null) : null,
                font_color: cfg.styles_enabled ? (cfg.font_color || null) : null,
                dropdown_enabled: !!cfg.styles_enabled && !!cfg.dropdown_enabled,
                dropdown_bg: cfg.styles_enabled ? (cfg.dropdown_bg || null) : null,
                dropdown_font_color: cfg.styles_enabled ? (cfg.dropdown_font_color || null) : null,
                btn_bg: cfg.styles_enabled ? (cfg.btn_bg || null) : null,
                btn_text: cfg.styles_enabled ? (cfg.btn_text || null) : null,
                cta_enabled: !!cfg.cta_enabled, cta_text: cfg.cta_text || null, cta_link: cfg.cta_link || null,
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
        <SlideOverModal title="Header Settings" onClose={onClose} footer={footer} width={460}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-5">
                {/* Logos — top */}
                <div className="space-y-3">
                    <LogoUpload websiteId={site?.id || 0} label="Transparent Logo" hint="Shown over the hero (usually light / white)." value={logoLight} onChange={setLogoLight} />
                    <LogoUpload websiteId={site?.id || 0} label="Solid Logo" hint="Shown on a solid / sticky header (usually dark)." value={logoDark} onChange={setLogoDark} />
                </div>

                <Divider />

                {/* Behaviour group */}
                <div className="divide-y divide-[#F1F2F4]">
                    <SwitchRow label="Sticky Header" hint="Pin the header as visitors scroll." on={sticky} onChange={setSticky} />
                    <SwitchRow label="Transparent Header" hint="Let the hero show through at the top." on={transparent} onChange={setTransparent} />
                </div>

                <Divider />

                {/* Features group */}
                <div className="divide-y divide-[#F1F2F4]">
                    <SwitchRow label="Social Links" hint="Show social icons in the top bar (solid headers)." on={!!cfg.social} onChange={(v) => set('social', v)} />
                    {cfg.social && (
                        <div className="pb-2">
                            <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3 space-y-2">
                                <p className="text-[11px] text-[#8B9096]">Pick which icons to show (no link set shows a placeholder).</p>
                                {([
                                    ['show_facebook', 'Facebook'],
                                    ['show_instagram', 'Instagram'],
                                    ['show_linkedin', 'LinkedIn'],
                                    ['show_youtube', 'YouTube'],
                                    ['show_tiktok', 'TikTok'],
                                ] as const).map(([key, label]) => (
                                    <div key={key} className="flex items-center justify-between gap-4">
                                        <span className="text-[12px] text-[#111315]">{label}</span>
                                        <Toggle on={!!cfg[key]} onChange={(v) => set(key, v)} />
                                    </div>
                                ))}
                                <p className="text-[11px] text-[#8B9096] pt-1 border-t border-[#E4E7EB]">
                                    To add or update social links,{' '}
                                    <a href={`/crm/websites/${site?.uuid}/social`} className="font-medium text-[#1693C9] hover:underline">click here</a>.
                                </p>
                            </div>
                        </div>
                    )}
                    <SwitchRow label="Login / Register" hint="Show client login & register links." on={!!cfg.auth} onChange={(v) => set('auth', v)} />
                    <SwitchRow label={'"More" Menu'} hint="Full-screen mega menu opened from the hamburger. Enabled by default." on={!!cfg.menu_modal} onChange={(v) => set('menu_modal', v)} />
                    <div className="flex items-center justify-between gap-4 py-2">
                        <div>
                            <p className="text-[13px] font-medium text-[#111315]">Menu Alignment</p>
                            <p className="text-[11px] text-[#8B9096] mt-0.5">Where the menu sits in the header.</p>
                        </div>
                        <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px] shrink-0">
                            {(['left', 'center', 'right'] as const).map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    onClick={() => set('menu_align', a)}
                                    className={`h-7 px-3 text-[12px] font-medium rounded-[3px] capitalize transition-colors ${(cfg.menu_align || 'right') === a ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <Divider />

                {/* Dropdown menus — attach child links to any nav item */}
                <div className="space-y-2">
                    <div>
                        <p className="text-[13px] font-medium text-[#111315]">Dropdown Menus</p>
                        <p className="text-[11px] text-[#8B9096] mt-0.5">Attach a dropdown of links to any menu item. Long lists fan into columns automatically.</p>
                    </div>
                    <div className="rounded-lg border border-[#E4E7EB] divide-y divide-[#F1F2F4] overflow-hidden">
                        {dropdownTargets.map(({ slug, label }) => {
                            const links = cfg.nav_dropdowns?.[slug] || [];
                            const open = openDropdown === slug;
                            return (
                                <div key={slug}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenDropdown(open ? null : slug)}
                                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#FAFBFC] transition-colors"
                                    >
                                        <span className="text-[12px] font-medium text-[#111315]">{label}</span>
                                        <span className="flex items-center gap-2 shrink-0">
                                            {links.length > 0 && <span className="text-[10px] font-semibold text-[#1693C9] bg-[#E5F4FB] rounded-full px-2 py-0.5">{links.length}</span>}
                                            <svg className={`h-3.5 w-3.5 text-[#8B9096] transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                        </span>
                                    </button>
                                    {open && (
                                        <div className="px-3 pb-3 pt-1 space-y-2 bg-[#FAFBFC]">
                                            {slug === 'areas' && (
                                                <p className="text-[11px] text-[#8B9096]">Your active areas are listed automatically — these links appear above them.</p>
                                            )}
                                            {links.map((link, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={link.label}
                                                        onChange={(e) => setLinks(slug, links.map((l, j) => j === i ? { ...l, label: e.target.value } : l))}
                                                        className={`${formInputClass} flex-1`}
                                                        placeholder="Label"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={link.url}
                                                        onChange={(e) => setLinks(slug, links.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
                                                        className={`${formInputClass} flex-1`}
                                                        placeholder="URL or /path"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setLinks(slug, links.filter((_, j) => j !== i))}
                                                        className="shrink-0 h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#DC2626] rounded transition-colors"
                                                        aria-label="Remove link"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => setLinks(slug, [...links, { label: '', url: '' }])}
                                                className="text-[12px] font-medium text-[#1693C9] hover:underline"
                                            >
                                                + Add link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <Divider />

                {/* CTA button — switch reveals its inputs right below */}
                <div className="space-y-3">
                    <SwitchRow label="CTA Button" hint="A call-to-action button on the right." on={!!cfg.cta_enabled} onChange={(v) => set('cta_enabled', v)} />
                    {cfg.cta_enabled && (
                        <div className="grid grid-cols-2 gap-3 pl-0.5">
                            <input type="text" value={cfg.cta_text || ''} onChange={(e) => set('cta_text', e.target.value)} className={formInputClass} placeholder="Button text" />
                            <input type="text" value={cfg.cta_link || ''} onChange={(e) => set('cta_link', e.target.value)} className={formInputClass} placeholder="Link (e.g. /contact)" />
                        </div>
                    )}
                </div>

                <Divider />

                {/* Custom styles — hidden behind a switch */}
                <div className="space-y-3">
                    <SwitchRow label="Custom Header Styles" hint="Override the theme colors for the header." on={!!cfg.styles_enabled} onChange={(v) => set('styles_enabled', v)} />
                    {cfg.styles_enabled && (
                        <div className="space-y-3 pl-0.5">
                            <ColorField label="Background" value={cfg.bg || ''} onChange={(v) => set('bg', v)} fallback="#FFFFFF" />
                            <ColorField label="Font Color" value={cfg.font_color || ''} onChange={(v) => set('font_color', v)} fallback="#111315" />
                            <ColorField label="Button Background" value={cfg.btn_bg || ''} onChange={(v) => set('btn_bg', v)} fallback="#1693C9" />
                            <ColorField label="Button Text" value={cfg.btn_text || ''} onChange={(v) => set('btn_text', v)} fallback="#FFFFFF" />
                            <SwitchRow label="Custom Dropdown Colors" on={!!cfg.dropdown_enabled} onChange={(v) => set('dropdown_enabled', v)} />
                            {cfg.dropdown_enabled && (
                                <div className="space-y-3 pl-0.5">
                                    <ColorField label="Dropdown Background" value={cfg.dropdown_bg || ''} onChange={(v) => set('dropdown_bg', v)} fallback="#FFFFFF" />
                                    <ColorField label="Dropdown Font" value={cfg.dropdown_font_color || ''} onChange={(v) => set('dropdown_font_color', v)} fallback="#111315" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </SlideOverModal>
    );
}
