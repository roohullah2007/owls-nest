import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AgentWebsite } from '../../../types';
import { inputClass } from '../../../constants';
import { SettingsCard } from '@/Components/Crm/SettingsPane';
import { FieldLabel } from '@/Components/Crm/FormField';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import EditorBlockCard, { Badge } from './EditorBlockCard';
import PaletteSlideOver from './PaletteSlideOver';
import DetailBlockEditorModal from './DetailBlockEditorModal';
import MarketingCardEditorModal from './MarketingCardEditorModal';
import { DetailBlock, DETAIL_BLOCK_PRESETS, positionLabel, newId } from './detailBlocks';
import { GridCard, MARKETING_CARD_PRESETS, newCardId } from './marketingCards';

export type IdxTab = 'design' | 'restrictions' | 'detail' | 'marketing' | 'leads' | 'css';

interface Props {
    website: AgentWebsite;
    tab: IdxTab;
    /** Registers the Save button into the section header (top right). */
    onActionChange?: (action: { label: string; onClick: () => void } | null) => void;
}

/** Built-in listing-detail page section — reorder / rename / toggle. */
interface DetailSection {
    key: string;
    label?: string;
    enabled?: boolean;
}

/** The 10 built-in detail-page sections, in default page order. Keys must
 *  mirror the ConfigController whitelist + ListingDetail's section registry. */
const DETAIL_SECTION_DEFAULTS: Array<{ key: string; label: string }> = [
    { key: 'description', label: 'Property Description' },
    { key: 'building', label: 'About the Building' },
    { key: 'details', label: 'Property Details' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'bathrooms', label: 'Bathroom Details' },
    { key: 'amenities', label: 'Amenities & Features' },
    { key: 'history', label: 'Property History' },
    { key: 'location', label: 'Location' },
    { key: 'calculator', label: 'Mortgage Calculator' },
    { key: 'comparables', label: 'Comparable Sales' },
];

/**
 * Saved config merged over the default list: configured entries first (in
 * their saved order), then any keys the config doesn't know about yet (new
 * sections shipped after the user last saved) in default order.
 */
function mergeDetailSections(saved: unknown): DetailSection[] {
    const raw = Array.isArray(saved) ? (saved as DetailSection[]) : [];
    const seen = new Set<string>();
    const configured: DetailSection[] = [];
    for (const s of raw) {
        if (!s || typeof s.key !== 'string' || seen.has(s.key)) continue;
        if (!DETAIL_SECTION_DEFAULTS.some((d) => d.key === s.key)) continue;
        seen.add(s.key);
        configured.push({ key: s.key, label: s.label ?? '', enabled: s.enabled !== false });
    }
    const missing = DETAIL_SECTION_DEFAULTS
        .filter((d) => !seen.has(d.key))
        .map((d) => ({ key: d.key, label: '', enabled: true }));
    return [...configured, ...missing];
}

/** CRM-side preview URL for a stored image (relative paths live on the public disk). */
const imagePreviewUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : `/storage/${v.replace(/^\/+/, '')}`);

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
    '.ps-custom-block', '.ps-marketing-card', '.site-footer',
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={onClick}
            className={`relative inline-flex h-[20px] w-[36px] shrink-0 items-center rounded-full transition-colors ${on ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}
        >
            <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
        </button>
    );
}

/**
 * IDX Settings — sub-tabbed configuration for the property search + listing
 * detail pages. Each tab saves ONLY its own keys (key-sparse PATCH to the
 * website-editor search-config endpoint), so tabs never clobber each other.
 */
export default function PropertySearchSection({ website, tab, onActionChange }: Props) {
    const cfg = useMemo(() => {
        const pd = (website as unknown as { page_data?: Record<string, unknown> }).page_data ?? {};
        const config = (pd._config ?? {}) as Record<string, Record<string, unknown>>;
        return { search: (config.search ?? {}) as Record<string, unknown>, design: (config.design ?? {}) as Record<string, unknown>, forms: (config.forms ?? {}) as Record<string, unknown> };
    }, [website]);

    // Design & fonts
    const [headerTheme, setHeaderTheme] = useState<string>((cfg.search.header_theme as string) || 'dark');
    const [themeFont, setThemeFont] = useState<string>((cfg.design.font as string) || '');
    const [font, setFont] = useState<string>((cfg.search.font as string) || '');
    const [headerFont, setHeaderFont] = useState<string>((cfg.search.header_font as string) || '');
    const [footerFont, setFooterFont] = useState<string>((cfg.search.footer_font as string) || '');
    const [cardFont, setCardFont] = useState<string>((cfg.search.card_font as string) || '');
    const [logoHeight, setLogoHeight] = useState<string>(cfg.search.logo_height != null ? String(cfg.search.logo_height) : '');
    const [cardRadius, setCardRadius] = useState<string>(cfg.search.card_radius != null ? String(cfg.search.card_radius) : '');
    // Detail page
    const [agentCardBg, setAgentCardBg] = useState<string>((cfg.search.agent_card_bg as string) || '');
    const [detailSections, setDetailSections] = useState<DetailSection[]>(() => mergeDetailSections(cfg.search.detail_sections));
    const [dragSectionKey, setDragSectionKey] = useState<string | null>(null);
    const [detailBlocks, setDetailBlocks] = useState<DetailBlock[]>(Array.isArray(cfg.search.detail_blocks) ? cfg.search.detail_blocks as DetailBlock[] : []);
    const [blockPaletteOpen, setBlockPaletteOpen] = useState(false);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [dragBlockId, setDragBlockId] = useState<string | null>(null);
    // Marketing cards
    const [gridCards, setGridCards] = useState<GridCard[]>(Array.isArray(cfg.search.grid_cards) ? cfg.search.grid_cards as GridCard[] : []);
    const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
    const [cardPaletteOpen, setCardPaletteOpen] = useState(false);
    const [editingCardId, setEditingCardId] = useState<string | null>(null);
    const [dragCardId, setDragCardId] = useState<string | null>(null);
    // Lead capture
    const [gateSearch, setGateSearch] = useState<boolean>(!!cfg.search.require_login_search);
    const [gateDetail, setGateDetail] = useState<boolean>(!!cfg.search.require_login_detail);
    const [consentText, setConsentText] = useState<string>((cfg.forms.consent_text as string) || '');
    // Listing restrictions (what the public search may show)
    const [allowedTxn, setAllowedTxn] = useState<string[]>(
        Array.isArray(cfg.search.allowed_transactions) && (cfg.search.allowed_transactions as string[]).length
            ? (cfg.search.allowed_transactions as string[])
            : ['sale', 'rent'],
    );
    const [excludedTypes, setExcludedTypes] = useState<string[]>(Array.isArray(cfg.search.excluded_property_types) ? cfg.search.excluded_property_types as string[] : []);
    const [excludedSubs, setExcludedSubs] = useState<string[]>(Array.isArray(cfg.search.excluded_property_subtypes) ? cfg.search.excluded_property_subtypes as string[] : []);
    const [taxonomy, setTaxonomy] = useState<{ property_types: { value: string; label: string }[]; property_subtypes: { value: string; label: string; parent_value?: string }[] } | null>(null);

    useEffect(() => {
        if (tab !== 'restrictions' || taxonomy !== null) return;
        // The owner's merged MLS taxonomy drives the restriction checkboxes —
        // values are the feeds' enums verbatim (never hardcoded).
        axios.get('/api/v1/mls/taxonomy')
            .then(({ data }) => setTaxonomy({
                property_types: data.property_types || [],
                property_subtypes: data.property_subtypes || [],
            }))
            .catch(() => setTaxonomy({ property_types: [], property_subtypes: [] }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    // Custom CSS
    const [customCss, setCustomCss] = useState<string>((cfg.search.custom_css as string) || '');
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiBusy, setAiBusy] = useState(false);

    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

    /** Only the active tab's keys — tabs must never clobber each other. */
    const payloadFor = (t: IdxTab): Record<string, unknown> => {
        switch (t) {
            case 'design':
                return {
                    header_theme: headerTheme || null,
                    theme_font: themeFont || null,
                    font: font || null,
                    header_font: headerFont || null,
                    footer_font: footerFont || null,
                    card_font: cardFont || null,
                    logo_height: logoHeight === '' ? null : Number(logoHeight),
                    card_radius: cardRadius === '' ? null : Number(cardRadius),
                };
            case 'restrictions':
                return {
                    // Both transactions allowed = no restriction (store []).
                    allowed_transactions: allowedTxn.length === 1 ? allowedTxn : [],
                    excluded_property_types: excludedTypes,
                    excluded_property_subtypes: excludedSubs,
                };
            case 'detail':
                return {
                    agent_card_bg: agentCardBg || null,
                    detail_sections: detailSections.map((s) => ({
                        key: s.key,
                        label: (s.label ?? '').trim() || null,
                        enabled: s.enabled !== false,
                    })),
                    detail_blocks: detailBlocks,
                };
            case 'marketing':
                return { grid_cards: gridCards };
            case 'leads':
                return { require_login_search: gateSearch, require_login_detail: gateDetail, consent_text: consentText };
            case 'css':
                return { custom_css: customCss };
        }
    };

    const saveRef = useRef<() => void>(() => {});
    useEffect(() => {
        onActionChange?.({ label: 'Save changes', onClick: () => saveRef.current() });
        return () => onActionChange?.(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const save = async () => {
        setSaving(true);
        setMsg(null);
        try {
            await axios.patch(`/api/website-editor/${website.id}/search-config`, payloadFor(tab));
            setMsg({ text: 'Saved — your IDX pages are updated.', error: false });
        } catch (e) {
            const err = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setMsg({ text: err || 'Could not save. Please try again.', error: true });
        } finally {
            setSaving(false);
        }
    };

    saveRef.current = save;

    const aiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setAiBusy(true);
        setMsg(null);
        try {
            const res = await axios.post(`/api/website-editor/${website.id}/ai/generate-search-css`, {
                prompt: aiPrompt.trim(),
                current_css: customCss,
            });
            if (res.data?.value) setCustomCss(res.data.value);
        } catch (e) {
            const err = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
            setMsg({ text: err || 'Could not generate CSS. Check that the AI key is configured.', error: true });
        } finally {
            setAiBusy(false);
        }
    };

    const setBlock = (id: string, patch: Partial<DetailBlock>) =>
        setDetailBlocks((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    const setCard = (id: string, patch: Partial<GridCard>) =>
        setGridCards((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const setSection = (key: string, patch: Partial<DetailSection>) =>
        setDetailSections((list) => list.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    /** Live reorder while dragging a built-in section row (HTML5 dnd, like PageBlockEditor). */
    const reorderSectionTo = (overKey: string) => {
        if (!dragSectionKey || dragSectionKey === overKey) return;
        setDetailSections((list) => {
            const from = list.findIndex((s) => s.key === dragSectionKey);
            const to = list.findIndex((s) => s.key === overKey);
            if (from < 0 || to < 0) return list;
            const next = [...list];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };
    /** Upload a marketing-card background via the shared block-image endpoint. */
    const uploadCardImage = async (id: string, file: File) => {
        setUploadingCardId(id);
        setMsg(null);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await axios.post(`/api/website-editor/${website.id}/block-image`, fd);
            if (res.data?.path) setCard(id, { image: res.data.path as string });
        } catch {
            setMsg({ text: 'Could not upload the image. Use a JPG/PNG/WebP under 10 MB.', error: true });
        } finally {
            setUploadingCardId(null);
        }
    };
    /** Live reorder while dragging a custom content block (matches PageBlockEditor). */
    const reorderBlockTo = (overId: string) => {
        if (!dragBlockId || dragBlockId === overId) return;
        setDetailBlocks((list) => {
            const from = list.findIndex((b) => b.id === dragBlockId);
            const to = list.findIndex((b) => b.id === overId);
            if (from < 0 || to < 0) return list;
            const next = [...list];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };
    const reorderCardTo = (overId: string) => {
        if (!dragCardId || dragCardId === overId) return;
        setGridCards((list) => {
            const from = list.findIndex((c) => c.id === dragCardId);
            const to = list.findIndex((c) => c.id === overId);
            if (from < 0 || to < 0) return list;
            const next = [...list];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };
    /** Palette pick → append the chosen preset and jump straight into its editor. */
    const addBlockFromPalette = (key: string) => {
        const preset = DETAIL_BLOCK_PRESETS.find((p) => p.key === key) ?? DETAIL_BLOCK_PRESETS[0];
        const id = newId();
        setDetailBlocks((list) => [...list, { id, ...preset.make(website.slug) }]);
        setBlockPaletteOpen(false);
        setEditingBlockId(id);
    };
    const addCardFromPalette = (key: string) => {
        const preset = MARKETING_CARD_PRESETS.find((p) => p.key === key) ?? MARKETING_CARD_PRESETS[0];
        const id = newCardId();
        setGridCards((list) => [...list, { id, ...preset.make(website.slug) }]);
        setCardPaletteOpen(false);
        setEditingCardId(id);
    };
    const editingBlock = detailBlocks.find((b) => b.id === editingBlockId) ?? null;
    const editingCard = gridCards.find((c) => c.id === editingCardId) ?? null;

    const fontSelect = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
                <option value="">{placeholder}</option>
                {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
        </div>
    );

    // Save lives in the section header (top right) — this strip only reports status.
    const saveBar = (saving || msg) ? (
        <div className="flex items-center gap-3">
            {saving && <p className="text-[13px] font-medium text-[#5F656D]">Saving…</p>}
            {!saving && msg && <p className={`text-[13px] font-medium ${msg.error ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>{msg.text}</p>}
        </div>
    ) : null;

    /* ── Design & Fonts ─────────────────────────────────────────────────── */
    if (tab === 'design') {
        return (
            <div className="space-y-6">
                <SettingsCard>
                    <div>
                        <p className="text-[14px] font-semibold text-[#111315]">Fonts &amp; Search Header</p>
                        <p className="mt-0.5 text-[13px] text-[#5F656D]">Typography for the property search and listing detail pages, plus the slim search header.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {fontSelect('Theme font (site-wide)', themeFont, setThemeFont, 'Template default')}
                        {fontSelect('Property search font', font, setFont, 'Plus Jakarta Sans (default)')}
                        {fontSelect('Search header font', headerFont, setHeaderFont, 'Theme font')}
                        {fontSelect('Footer font', footerFont, setFooterFont, 'Theme font')}
                        <div>
                            <FieldLabel>Header style</FieldLabel>
                            <select value={headerTheme} onChange={(e) => setHeaderTheme(e.target.value)} className={inputClass}>
                                <option value="dark">Dark bar</option>
                                <option value="light">Light bar</option>
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Header logo height (px)</FieldLabel>
                            <input type="number" min={20} max={80} value={logoHeight} onChange={(e) => setLogoHeight(e.target.value)} className={inputClass} placeholder="34" />
                        </div>
                    </div>
                </SettingsCard>

                <SettingsCard>
                    <div>
                        <p className="text-[14px] font-semibold text-[#111315]">Property Cards</p>
                        <p className="mt-0.5 text-[13px] text-[#5F656D]">Styling for the listing result cards.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <FieldLabel>Card border radius (px)</FieldLabel>
                            <input type="number" min={0} max={32} value={cardRadius} onChange={(e) => setCardRadius(e.target.value)} className={inputClass} placeholder="16" />
                        </div>
                        {fontSelect('Card font', cardFont, setCardFont, 'Search page font')}
                    </div>
                </SettingsCard>

                {saveBar}
            </div>
        );
    }

    /* ── Listing Restrictions ───────────────────────────────────────────── */
    if (tab === 'restrictions') {
        return (
            <div className="space-y-6">
                <SettingsCard>
                    <div>
                        <p className="text-[14px] font-semibold text-[#111315]">Listing Restrictions</p>
                        <p className="mt-0.5 text-[13px] text-[#5F656D]">
                            Control what your public property search can show. Unchecked types are excluded from
                            results and hidden from the visitor filters. New types your MLS adds appear automatically.
                        </p>
                    </div>

                    <div>
                        <FieldLabel>Transaction types</FieldLabel>
                        <div className="mt-1 flex flex-wrap gap-4">
                            {(['sale', 'rent'] as const).map((t) => (
                                <label key={t} className="flex items-center gap-2 text-[13px] text-[#111315]">
                                    <input
                                        type="checkbox"
                                        checked={allowedTxn.includes(t)}
                                        onChange={() => setAllowedTxn((prev) => {
                                            const next = prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t];
                                            return next.length ? next : prev; // at least one stays on
                                        })}
                                        className="rounded border-[#C8CCD1]"
                                    />
                                    {t === 'sale' ? 'For Sale' : 'For Rent'}
                                </label>
                            ))}
                        </div>
                    </div>

                    {taxonomy === null && <p className="text-[13px] text-[#8B9096]">Loading your MLS taxonomy…</p>}
                    {taxonomy !== null && taxonomy.property_types.length === 0 && (
                        <p className="text-[13px] italic text-[#9AA1A9]">Connect an MLS to manage property-type restrictions.</p>
                    )}

                    {taxonomy !== null && taxonomy.property_types.length > 0 && (
                        <div>
                            <FieldLabel>Property types</FieldLabel>
                            <div className="mt-1 grid grid-cols-1 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                {taxonomy.property_types.map((t) => (
                                    <label key={t.value} className="flex items-center gap-2 text-[13px] text-[#111315]">
                                        <input
                                            type="checkbox"
                                            checked={!excludedTypes.includes(t.value)}
                                            onChange={() => setExcludedTypes((prev) => prev.includes(t.value) ? prev.filter((v) => v !== t.value) : [...prev, t.value])}
                                            className="rounded border-[#C8CCD1]"
                                        />
                                        {t.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {taxonomy !== null && taxonomy.property_subtypes.length > 0 && (
                        <div>
                            <FieldLabel>Property sub-types</FieldLabel>
                            <div className="mt-1 grid max-h-64 grid-cols-1 gap-y-1.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                                {Array.from(new Map(taxonomy.property_subtypes.map((t) => [t.value, t])).values()).map((t) => (
                                    <label key={t.value} className="flex items-center gap-2 text-[13px] text-[#111315]">
                                        <input
                                            type="checkbox"
                                            checked={!excludedSubs.includes(t.value)}
                                            onChange={() => setExcludedSubs((prev) => prev.includes(t.value) ? prev.filter((v) => v !== t.value) : [...prev, t.value])}
                                            className="rounded border-[#C8CCD1]"
                                        />
                                        {t.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </SettingsCard>

                {saveBar}
            </div>
        );
    }

    /* ── Listing Detail Page ────────────────────────────────────────────── */
    if (tab === 'detail') {
        return (
            <div className="space-y-6">
                <SettingsCard>
                    <div>
                        <p className="text-[14px] font-semibold text-[#111315]">Page Sections</p>
                        <p className="mt-0.5 text-[13px] text-[#5F656D]">The built-in sections of the listing detail page. Drag to reorder, rename any heading, or switch a section off.</p>
                    </div>
                    <div className="space-y-2.5">
                        {detailSections.map((s) => {
                            const def = DETAIL_SECTION_DEFAULTS.find((d) => d.key === s.key);
                            return (
                                <div
                                    key={s.key}
                                    onDragOver={(e) => { if (dragSectionKey) { e.preventDefault(); reorderSectionTo(s.key); } }}
                                    onDrop={() => setDragSectionKey(null)}
                                    className={`group flex items-center bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all ${dragSectionKey === s.key ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
                                >
                                    {/* Only the handle is draggable so the rename input keeps normal text selection. */}
                                    <span
                                        draggable
                                        onDragStart={() => setDragSectionKey(s.key)}
                                        onDragEnd={() => setDragSectionKey(null)}
                                        className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing"
                                        aria-label="Drag to reorder"
                                        title="Drag to reorder"
                                    >
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
                                    </span>
                                    <span className="shrink-0 pl-2 flex items-center">
                                        <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={1.5} />
                                                <path strokeWidth={1.5} strokeLinecap="round" d="M7 9h10M7 13h6" />
                                            </svg>
                                        </span>
                                    </span>
                                    <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
                                        <input
                                            type="text"
                                            value={s.label ?? ''}
                                            onChange={(e) => setSection(s.key, { label: e.target.value })}
                                            className="flex-1 min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13px] font-semibold text-[#111315] placeholder:font-semibold placeholder:text-[#111315] hover:border-[#E4E7EB] focus:border-[#1693C9] focus:ring-0"
                                            placeholder={def?.label || s.key}
                                            title="Rename this section (empty = default name)"
                                        />
                                        <Toggle on={s.enabled !== false} onClick={() => setSection(s.key, { enabled: s.enabled === false })} />
                                    </div>
                                </div>
                            );
                        })}
                        <p className="text-[11px] text-[#8B9096]">Sections only render when the listing has matching data — an enabled section with nothing to show stays hidden.</p>
                    </div>
                </SettingsCard>

                <SettingsCard>
                    <div>
                        <p className="text-[14px] font-semibold text-[#111315]">Agent Card</p>
                        <p className="mt-0.5 text-[13px] text-[#5F656D]">The agent card uses your profile photo, name, title and phone (edit those in General → Basic Info). Adjust its background here.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <FieldLabel>Card background color</FieldLabel>
                            <div className="flex items-center gap-2">
                                <input type="color" value={agentCardBg || '#1a1816'} onChange={(e) => setAgentCardBg(e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-[#E4E7EB] bg-white p-1" />
                                <input type="text" value={agentCardBg} onChange={(e) => setAgentCardBg(e.target.value)} className={inputClass} placeholder="#1a1816 (default)" />
                            </div>
                        </div>
                    </div>
                </SettingsCard>

                <SettingsCard>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[14px] font-semibold text-[#111315]">Custom Content Blocks</p>
                            <p className="mt-0.5 text-[13px] text-[#5F656D]">
                                Owner-authored blocks dropped into the listing page flow — added and edited just like blocks in the page editor.
                                Merge fields fill in from each listing, and status rules can limit a block to active, pending or sold homes.
                            </p>
                        </div>
                        <PrimaryButton type="button" onClick={() => setBlockPaletteOpen(true)} className="shrink-0" label="Add Block" />
                    </div>

                    <div className="space-y-2.5">
                        {detailBlocks.map((b) => {
                            const statuses = b.statuses ?? [];
                            const allStatuses = statuses.length === 0 || statuses.length === 3;
                            return (
                                <EditorBlockCard
                                    key={b.id}
                                    icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h6" /></svg>}
                                    title={b.title?.trim() || 'Untitled block'}
                                    subtitle={<>
                                        <Badge>{positionLabel(b.position)}</Badge>
                                        {allStatuses ? <Badge>All statuses</Badge> : statuses.map((st) => <Badge key={st}>{st}</Badge>)}
                                    </>}
                                    enabled={b.enabled !== false}
                                    onToggle={() => setBlock(b.id, { enabled: b.enabled === false })}
                                    onEdit={() => setEditingBlockId(b.id)}
                                    onRemove={() => setDetailBlocks((list) => list.filter((x) => x.id !== b.id))}
                                    dragging={dragBlockId === b.id}
                                    onDragStart={() => setDragBlockId(b.id)}
                                    onDragEnd={() => setDragBlockId(null)}
                                    onDragOver={(e) => { if (dragBlockId) { e.preventDefault(); reorderBlockTo(b.id); } }}
                                    onDrop={() => setDragBlockId(null)}
                                />
                            );
                        })}
                        {detailBlocks.length === 0 && (
                            <button
                                type="button"
                                onClick={() => setBlockPaletteOpen(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#C8CCD1] px-4 py-6 text-[13px] font-medium text-[#5F656D] hover:border-[#1693C9] hover:text-[#1693C9]"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                Add your first content block
                            </button>
                        )}
                        <p className="text-[11px] text-[#8B9096]">
                            Special CTA links: <code>#tour</code> opens the tour-request modal, <code>#register</code> opens the visitor signup modal.
                        </p>
                    </div>
                </SettingsCard>

                {saveBar}

                {blockPaletteOpen && (
                    <PaletteSlideOver
                        title="Add a Content Block"
                        intro="Pick a starting point — every block stays fully editable."
                        items={DETAIL_BLOCK_PRESETS.map((p) => ({ key: p.key, label: p.label, description: p.description, icon: p.icon }))}
                        onSelect={addBlockFromPalette}
                        onClose={() => setBlockPaletteOpen(false)}
                    />
                )}
                {editingBlock && (
                    <DetailBlockEditorModal
                        block={editingBlock}
                        onChange={(patch) => setBlock(editingBlock.id, patch)}
                        onClose={() => setEditingBlockId(null)}
                    />
                )}
            </div>
        );
    }

    /* ── Marketing Cards ────────────────────────────────────────────────── */
    if (tab === 'marketing') {
        return (
            <div className="space-y-6">
                <SettingsCard>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[14px] font-semibold text-[#111315]">Marketing Cards in Search Results</p>
                            <p className="mt-0.5 text-[13px] text-[#5F656D]">CTA tiles mixed into the listings grid — same footprint as a property card, but they drive a funnel (valuation, contact, buyer guide…). Shown on page 1 at the grid position you pick.</p>
                        </div>
                        <PrimaryButton type="button" onClick={() => setCardPaletteOpen(true)} className="shrink-0" label="Add Card" />
                    </div>
                    <div className="space-y-2.5">
                        {gridCards.map((c) => (
                            <EditorBlockCard
                                key={c.id}
                                icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></svg>}
                                title={c.title?.trim() || 'Untitled card'}
                                subtitle={<>
                                    <Badge>Grid position {c.slot ?? 3}</Badge>
                                    {c.image && <Badge>Has image</Badge>}
                                </>}
                                enabled={c.enabled !== false}
                                onToggle={() => setCard(c.id, { enabled: c.enabled === false })}
                                onEdit={() => setEditingCardId(c.id)}
                                onRemove={() => setGridCards((list) => list.filter((x) => x.id !== c.id))}
                                dragging={dragCardId === c.id}
                                onDragStart={() => setDragCardId(c.id)}
                                onDragEnd={() => setDragCardId(null)}
                                onDragOver={(e) => { if (dragCardId) { e.preventDefault(); reorderCardTo(c.id); } }}
                                onDrop={() => setDragCardId(null)}
                            />
                        ))}
                        {gridCards.length === 0 && (
                            <button
                                type="button"
                                onClick={() => setCardPaletteOpen(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#C8CCD1] px-4 py-6 text-[13px] font-medium text-[#5F656D] hover:border-[#1693C9] hover:text-[#1693C9]"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                Add your first marketing card
                            </button>
                        )}
                    </div>
                </SettingsCard>

                {saveBar}

                {cardPaletteOpen && (
                    <PaletteSlideOver
                        title="Add a Marketing Card"
                        intro="Pick a starting point — every card stays fully editable."
                        items={MARKETING_CARD_PRESETS.map((p) => ({ key: p.key, label: p.label, description: p.description, icon: p.icon }))}
                        onSelect={addCardFromPalette}
                        onClose={() => setCardPaletteOpen(false)}
                    />
                )}
                {editingCard && (
                    <MarketingCardEditorModal
                        card={editingCard}
                        onChange={(patch) => setCard(editingCard.id, patch)}
                        onClose={() => setEditingCardId(null)}
                        onUploadImage={(file) => uploadCardImage(editingCard.id, file)}
                        uploading={uploadingCardId === editingCard.id}
                        imagePreviewUrl={imagePreviewUrl}
                    />
                )}
            </div>
        );
    }

    /* ── Lead Capture ───────────────────────────────────────────────────── */
    if (tab === 'leads') {
        return (
            <div className="space-y-6">
                <SettingsCard>
                    <div>
                        <p className="text-[14px] font-semibold text-[#111315]">Lead Capture</p>
                        <p className="mt-0.5 text-[13px] text-[#5F656D]">Lock pages behind the visitor signup modal, and control the consent disclosure on every lead form.</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[13px] font-medium text-[#111315]">Require login for Property Search</p>
                            <p className="text-[12px] text-[#8B9096]">Visitors must sign up before browsing listings — every signup becomes a CRM lead.</p>
                        </div>
                        <Toggle on={gateSearch} onClick={() => setGateSearch(!gateSearch)} />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[13px] font-medium text-[#111315]">Require login for Listing Detail pages</p>
                            <p className="text-[12px] text-[#8B9096]">Keep search open but lock full listing details behind signup.</p>
                        </div>
                        <Toggle on={gateDetail} onClick={() => setGateDetail(!gateDetail)} />
                    </div>
                    <div>
                        <FieldLabel>Consent disclosure (all lead forms)</FieldLabel>
                        <p className="mb-1.5 text-[12px] text-[#8B9096]">Shown beside the required "Agree to Privacy Policy" checkbox on signup, contact, save-search and tour-request forms. Leave empty for the default text personalised with your name.</p>
                        <textarea rows={6} value={consentText} onChange={(e) => setConsentText(e.target.value)} className={inputClass} placeholder="By providing [your name] your contact information, you acknowledge and agree to our Privacy Policy…" />
                    </div>
                </SettingsCard>

                {saveBar}
            </div>
        );
    }

    /* ── Custom CSS ─────────────────────────────────────────────────────── */
    return (
        <div className="space-y-6">
            <SettingsCard>
                <div>
                    <p className="text-[14px] font-semibold text-[#111315]">Custom CSS (AI-assisted)</p>
                    <p className="mt-0.5 text-[13px] text-[#5F656D]">Fine-tune the search and detail pages. Describe the look and let AI write the CSS, or edit it directly.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') aiGenerate(); }}
                        className={inputClass}
                        placeholder="e.g. larger card prices, thinner borders, soft shadows"
                    />
                    <PrimaryButton type="button" onClick={aiGenerate} disabled={aiBusy || !aiPrompt.trim()} className="shrink-0" icon={null} label={aiBusy ? 'Generating…' : 'Generate with AI'} />
                </div>
                <div>
                    <textarea
                        rows={12}
                        value={customCss}
                        onChange={(e) => setCustomCss(e.target.value)}
                        spellCheck={false}
                        className={`${inputClass} font-mono text-[12px]`}
                        placeholder={'.ps-card { border-radius: 8px; }\n.ps-card-price { color: #B8860B; }'}
                    />
                    <p className="mt-1.5 text-[11px] text-[#8B9096]">Available hooks: {CSS_HOOKS.join(', ')}</p>
                </div>
            </SettingsCard>

            {saveBar}
        </div>
    );
}
