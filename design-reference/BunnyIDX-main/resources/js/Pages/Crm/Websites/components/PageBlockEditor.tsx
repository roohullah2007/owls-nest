import { useEffect, useState, useCallback } from 'react';
import { api } from '@/website-editor/api';
import { BlockData, SiteData, SectionConfig, EditorCapabilities } from '@/website-editor/types';
import { BLOCK_DEFINITIONS } from '@/website-editor/block-definitions';
import { TEMPLATE_CONFIGS } from '@/website-editor/template-config';
import { getPageLayout, LayoutItem } from './pageBlockLayouts';
import RowActionMenu from './RowActionMenu';
import BlockEditorModal from './BlockEditorModal';
import ServicesEditorModal from './ServicesEditorModal';
import TeamEditorModal from './TeamEditorModal';
import LogoMarqueeEditorModal from './LogoMarqueeEditorModal';
import TestimonialsBlockEditorModal from './TestimonialsBlockEditorModal';
import FeaturedEditorModal from './FeaturedEditorModal';
import CommunitiesEditorModal from './CommunitiesEditorModal';
import ProcessEditorModal from './ProcessEditorModal';
import NewsletterEditorModal from './NewsletterEditorModal';
import ContentEditorModal from './ContentEditorModal';
import FaqEditorModal from './FaqEditorModal';
import LatestBlogPostsEditorModal from './LatestBlogPostsEditorModal';
import HomeValuationEditorModal from './HomeValuationEditorModal';
import VideosEditorModal from './VideosEditorModal';
import PageHeaderBlockEditorModal from './PageHeaderBlockEditorModal';
import SectionEditorModal from './SectionEditorModal';
import PageSeoModal from './PageSeoModal';
import BlockPaletteModal from './BlockPaletteModal';
import TestimonialsEditorModal from './TestimonialsEditorModal';
import HeaderSettingsModal from './HeaderSettingsModal';
import FooterSettingsModal from './FooterSettingsModal';
import HeroSettingsModal from './HeroSettingsModal';

interface Props {
    websiteId: number;
    page: string;
    pageLabel: string;
    onBack: () => void;
}

// Editor field sets for sections that aren't in TEMPLATE_CONFIGS (or have no
// fields there). Keyed by `${page}:${id}` or bare `id`. Same field semantics as
// the template config: `storage: 'column'` saves to the site, others to page_data.
const CUSTOM_SECTION_CONFIGS: Record<string, SectionConfig> = {
    'home:hero': {
        id: 'hero',
        label: 'Hero',
        fields: [
            { key: 'hero_headline', label: 'Headline', type: 'text', storage: 'column' },
            { key: 'hero_subtitle', label: 'Subtitle', type: 'textarea', rows: 2, storage: 'column' },
            { key: 'hero_image', label: 'Hero Image', type: 'image', uploadKey: 'hero', siteKey: 'hero_image' },
            { key: 'hero_video_url', label: 'Background Video URL (optional)', type: 'text' },
        ],
    },
};

function generateBlockId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'b_';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

function blockPreview(block: BlockData): string {
    const def = BLOCK_DEFINITIONS.find((d) => d.type === block.type);
    if (!def) return '';
    for (const f of def.fields) {
        if (f.type === 'image') continue;
        const v = block.data[f.key];
        if (v && v.trim()) return v.trim();
    }
    return '';
}

export default function PageBlockEditor({ websiteId, page, pageLabel, onBack }: Props) {
    const [site, setSite] = useState<SiteData | null>(null);
    const [capabilities, setCapabilities] = useState<EditorCapabilities>({});
    const [loading, setLoading] = useState(true);
    const [armedSlot, setArmedSlot] = useState<string | null>(null); // insertion point chosen via the "+"; opens the palette slide-over
    const [editingBlock, setEditingBlock] = useState<BlockData | null>(null);
    const [editingSection, setEditingSection] = useState<SectionConfig | null>(null);
    const [editingTestimonials, setEditingTestimonials] = useState(false);
    const [editingHero, setEditingHero] = useState(false);
    const [seoOpen, setSeoOpen] = useState(false);
    const [headerOpen, setHeaderOpen] = useState(false);
    const [footerOpen, setFooterOpen] = useState(false);
    const [dragSection, setDragSection] = useState<string | null>(null);
    const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
    const [dragBlockId, setDragBlockId] = useState<string | null>(null);
    const [blockOrderOverride, setBlockOrderOverride] = useState<string[] | null>(null);
    // Live slot reassignment while dragging a block across slot groups; persisted
    // on drop. Without this, a dragged block always snaps back into its own slot
    // (e.g. one added via "Add Section" stays pinned to the bottom of the page).
    const [slotOverride, setSlotOverride] = useState<{ id: string; slot: string } | null>(null);

    const refetch = useCallback(async () => {
        const res = await api.getSite(websiteId);
        if (res.site) setSite(res.site);
    }, [websiteId]);

    useEffect(() => {
        let alive = true;
        api.getSite(websiteId)
            .then((res) => { if (alive) { if (res.site) setSite(res.site); if (res.capabilities) setCapabilities(res.capabilities); } })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [websiteId]);


    const blocks: BlockData[] = (site?.page_data?.[page]?.blocks as BlockData[]) || [];
    const layout = getPageLayout(site?.template || '', page);
    const slug = site?.slug || '';
    const pagePath = page === 'home' ? '' : `/${page}`;
    const siteUrl = `${window.location.origin}/site/${slug}${pagePath}`;

    // Refine the page title from fetched data (custom-page titles aren't known up front).
    const builtinLabels: Record<string, string> = { home: 'Home', about: 'About', buy: 'Buy', sell: 'Sell', areas: 'Communities', blog: 'Blog', contact: 'Contact', 'home-valuation': 'Home Valuation', team: 'Team' };
    const customPages = (site?.page_data?._config as { custom_pages?: { slug: string; title: string }[] } | undefined)?.custom_pages || [];
    const displayLabel = builtinLabels[page] || customPages.find((c) => c.slug === page)?.title || pageLabel || page;
    const pageMetaTitle = (site?.page_data?.[page]?.meta_title as string) || '';
    const pageMetaDescription = (site?.page_data?.[page]?.meta_description as string) || '';

    // Per-section visibility (stored at page_data._config.disabled_sections[page]).
    const disabledSections: string[] =
        (site?.page_data?._config as { disabled_sections?: Record<string, string[]> } | undefined)
            ?.disabled_sections?.[page] || [];
    const hiddenLayoutSections = layout.filter(
        (i) => i.kind === 'section' && disabledSections.includes(i.id),
    ) as Extract<typeof layout[number], { kind: 'section' }>[];

    const tmplSections = TEMPLATE_CONFIGS[site?.template || '']?.[page]?.sections || [];
    function sectionConfig(id: string): SectionConfig | undefined {
        return tmplSections.find((s) => s.id === id);
    }

    // Custom section order: reorder the layout's sections (each keeps its trailing
    // slots), driven by page_data._config.section_order[page].
    const defaultSectionIds = layout.filter((i) => i.kind === 'section').map((i) => i.id);
    const savedOrder = (site?.page_data?._config as { section_order?: Record<string, string[]> } | undefined)
        ?.section_order?.[page] || [];
    const normalizedSaved = [
        ...savedOrder.filter((id) => defaultSectionIds.includes(id)),
        ...defaultSectionIds.filter((id) => !savedOrder.includes(id)),
    ];
    const sectionOrder = orderOverride || normalizedSaved;

    const orderedLayout = (() => {
        // Group each section with the slots that immediately follow it.
        const units: { section: Extract<LayoutItem, { kind: 'section' }> | null; items: LayoutItem[] }[] = [];
        let cur: { section: Extract<LayoutItem, { kind: 'section' }> | null; items: LayoutItem[] } | null = null;
        for (const item of layout) {
            if (item.kind === 'section') { cur = { section: item, items: [item] }; units.push(cur); }
            else { if (!cur) { cur = { section: null, items: [] }; units.push(cur); } cur.items.push(item); }
        }
        const leading = units.filter((u) => !u.section);
        const sectionUnits = units.filter((u) => u.section);
        sectionUnits.sort((a, b) => sectionOrder.indexOf(a.section!.id) - sectionOrder.indexOf(b.section!.id));
        return [...leading, ...sectionUnits].flatMap((u) => u.items);
    })();

    // The "Add Section" button (top right) inserts at the bottom of the page —
    // i.e. the last slot in the ordered layout (fallback to 'default').
    const bottomSlot =
        [...orderedLayout].reverse().find((i): i is Extract<LayoutItem, { kind: 'slot' }> => i.kind === 'slot')?.slot
        ?? 'default';

    // An empty insertion slot only earns its "+" when it sits directly after a
    // visible section. This drops the stray "+" left behind by a hidden/removed
    // section and collapses runs of adjacent empty slots into a single one.
    // Pages with no sections at all (custom pages) always allow adding.
    const anySectionInLayout = orderedLayout.some((i) => i.kind === 'section');
    function emptySlotHasAnchor(idx: number): boolean {
        if (!anySectionInLayout) return true;
        const prev = orderedLayout[idx - 1];
        if (!prev) return true;
        return prev.kind === 'section' && !disabledSections.includes(prev.id);
    }

    async function reorderSectionTo(overId: string) {
        if (!dragSection || dragSection === overId) return;
        const next = [...sectionOrder];
        const from = next.indexOf(dragSection);
        const to = next.indexOf(overId);
        if (from < 0 || to < 0) return;
        next.splice(from, 1);
        next.splice(to, 0, dragSection);
        setOrderOverride(next);
    }

    async function persistSectionOrder() {
        setDragSection(null);
        if (!orderOverride) return;
        await api.updateSectionOrder(websiteId, page, orderOverride);
        await refetch();
    }

    function effectiveSlot(b: BlockData): string {
        return slotOverride && slotOverride.id === b.id ? slotOverride.slot : (b.slot || 'default');
    }

    function blocksInSlot(slot: string): BlockData[] {
        return blocks.filter((b) => effectiveSlot(b) === slot);
    }

    async function setSectionHidden(id: string, hidden: boolean) {
        const next = hidden
            ? Array.from(new Set([...disabledSections, id]))
            : disabledSections.filter((s) => s !== id);
        await api.updateSectionVisibility(websiteId, page, next);
        await refetch();
    }

    async function doInsert(slot: string, type: string) {
        setArmedSlot(null);
        const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
        if (!def) return;
        const data: Record<string, string> = {};
        def.fields.forEach((f) => { if (f.type !== 'image') data[f.key] = ''; });
        // Seed the Page Header with sensible hero defaults (boxed heading, tall,
        // medium scrim) so it looks designed before the agent sets an image.
        if (type === 'page-header') {
            data.bg_type = 'image';
            data.overlay = 'medium';
            data.height = 'tall';
            data.style = 'boxed';
            data.heading = 'PAGE HEADING';
            data.show_scroll = '1';
        }
        // Seed the Services block with the three standard cards + "Learn More".
        // Links are root-relative so they keep working once the site is published
        // to its own domain (a /site/{slug} prefix would break there).
        if (type === 'services') {
            data.button_label = 'Learn More';
            data.layout = 'grid';
            data.items = JSON.stringify([
                { image: '/images/backgrounds/bg-3.jpg', title: 'Home Search', link: '/buy' },
                { image: '/images/backgrounds/bg-4.jpg', title: 'Home Valuation', link: '/sell' },
                { image: '/images/backgrounds/bg-6.jpg', title: 'Contact Us', link: '/contact' },
            ]);
        }
        // Seed the Team block with example members so the layout is visible.
        if (type === 'team') {
            data.title = 'Meet Our Team';
            data.layout = 'slider';
            data.align = 'left';
            data.show_social = '1';
            data.view_all_label = 'View All';
            data.view_all_link = '/about';
            data.members = JSON.stringify([
                { image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=720&h=900&q=80', first_name: 'Diana', last_name: 'Lucivero', role: 'Team Principal' },
                { image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=720&h=900&q=80', first_name: 'Shauna', last_name: 'Callinan', role: 'Realtor®' },
                { image: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=720&h=900&q=80', first_name: 'Becky', last_name: 'Kanaley', role: 'Realtor®' },
                { image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=720&h=900&q=80', first_name: 'Jim', last_name: 'Lucivero', role: 'Realtor®' },
            ]);
        }
        // Seed the Testimonials block with example quotes.
        if (type === 'testimonials') {
            data.variant = 'grid';
            data.theme = 'light';
            data.title = 'Testimonials';
            data.view_all_label = 'View All';
            data.view_all_link = '';
            data.items = JSON.stringify([
                { quote: 'From the moment we engaged them to the closing of the sale, the entire process was smooth and stress-free. Truly exceptional service from start to finish.', author: 'Bob', role: 'Home Seller', link: '' },
                { quote: 'We were very fortunate to have their experience and knowledge guiding us. They stuck with us with patience until the right home came along — and it did.', author: 'Mark & Sandra', role: 'Buyers', link: '' },
                { quote: 'Incredibly thorough, organized, and prepared. They negotiated aggressively on our behalf and handled every detail through to closing.', author: 'Jennifer', role: 'Home Buyer', link: '' },
            ]);
        }
        // Featured Listings — default to own listings; placeholders show until added.
        if (type === 'featured') {
            data.variant = 'showcase';
            data.title = 'Featured Properties';
            data.source = 'auto'; // MLS when connected, else the agent's own Properties
            data.mls_mode = 'datasets'; // Whole MLS (all connected) by default
            data.view_all_label = 'View All';
            data.limit = '12';
        }
        // Communities — auto-populates from the website's Areas/Communities.
        // Defaults to a grid showing all communities with the name below each card;
        // placeholders render until the agent adds some.
        if (type === 'communities') {
            data.title = 'Communities';
            data.layout = 'grid';
            data.card_style = 'below';
            data.columns = '3';
            data.source = 'all';
            data.view_all_label = 'View All';
            data.view_all_link = ''; // empty → Blade defaults to the communities page route
        }
        // Seed the Content block with an example image-left layout + copy + one button.
        if (type === 'content') {
            data.image_position = 'left';
            data.image = '/images/backgrounds/bg-7.jpg';
            data.eyebrow = 'About Us';
            data.heading = 'Local Expertise, Personalized Service';
            data.body = 'With deep roots in the community and years of market experience, we guide buyers and sellers through every step with clarity and confidence.';
            data.buttons = JSON.stringify([
                { label: 'Learn More', link: '/about', style: 'outline' },
            ]);
        }
        // How It Works — ships with a 3-step real-estate process (icons) so it's
        // useful the moment it's dropped in; the agent just tweaks the copy.
        if (type === 'process') {
            data.title = 'How It Works';
            data.layout = 'row';
            data.align = 'center';
            data.show_numbers = '1';
            data.media_type = 'icon';
            data.items = JSON.stringify([
                { title: 'Consultation', description: 'We start with a conversation about your goals, budget, and timeline.', icon: 'chat', image: '' },
                { title: 'Find Your Home', description: 'I curate listings and tour properties with you until we find the one.', icon: 'search', image: '' },
                { title: 'Close With Confidence', description: 'I negotiate the best terms and guide you through to closing day.', icon: 'key', image: '' },
            ]);
        }
        // Seed the FAQ block with a few example questions so the accordion is visible.
        if (type === 'faqs') {
            data.layout = 'split';
            data.eyebrow = 'FAQs';
            data.heading = 'Frequently Asked Questions';
            data.items = JSON.stringify([
                { question: 'How do I get started with buying a home?', answer: 'Reach out for a quick consultation. We’ll discuss your goals, budget, and timeline, then get you connected with trusted lenders to understand your buying power.' },
                { question: 'What is my home worth in today’s market?', answer: 'A proper valuation considers recent comparable sales, your home’s condition, and current demand. Request a free, no-obligation home valuation and I’ll prepare a detailed report.' },
                { question: 'How long does the selling process usually take?', answer: 'It varies by market and price point, but from listing to closing most sales complete within 30–60 days once an offer is accepted.' },
            ]);
        }
        // Seed the Videos block with a couple of example clips so the layout shows.
        if (type === 'videos') {
            data.layout = 'grid';
            data.align = 'center';
            data.title = 'Watch';
            data.items = JSON.stringify([
                { url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4', title: 'Featured Property Tour', thumb: '' },
                { url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', title: 'Meet the Team', thumb: '' },
                { url: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs', title: 'Client Story', thumb: '' },
            ]);
        }
        // Home Valuation — default to the Light theme (no background image).
        if (type === 'home-valuation') {
            data.theme = 'light';
        }
        // Calculators — seed heading/subtitle/theme so the block renders complete.
        // The numeric assumptions fall back to sensible defaults in the Blade
        // partial, so they only need filling when an agent wants to localise them.
        if (type === 'mortgage-calculator') {
            data.theme = 'light';
            data.heading = 'Mortgage Calculator';
            data.subtitle = 'Estimate your monthly payment in seconds.';
        }
        if (type === 'affordability-calculator') {
            data.theme = 'light';
            data.heading = 'Home Affordability Calculator';
            data.subtitle = 'Find out how much home you can comfortably afford.';
        }
        if (type === 'refinance-calculator') {
            data.theme = 'light';
            data.heading = 'Refinance Calculator';
            data.subtitle = 'See if refinancing could lower your payment.';
        }
        if (type === 'rent-vs-buy-calculator') {
            data.theme = 'light';
            data.mls_lookup = 'on';
            data.heading = 'Rent vs. Buy Calculator';
            data.subtitle = 'See whether buying or renting costs less over time.';
        }
        if (type === 'closing-cost-calculator') {
            data.theme = 'light';
            data.mls_lookup = 'on';
            data.heading = 'Closing Cost Estimator';
            data.subtitle = 'Estimate the cash you’ll need to close.';
        }
        if (type === 'property-tax-calculator') {
            data.theme = 'light';
            data.default_state = 'FL';
            data.heading = 'Property Tax Calculator';
            data.subtitle = 'Estimate your annual property tax by state.';
        }
        if (type === 'home-value-estimator') {
            data.theme = 'light';
            data.heading = 'Home Value Estimator';
            data.subtitle = 'Get an instant estimate from recent sold comparables.';
        }
        // Seed the CTA with a background image + generic copy (uses the generic
        // block editor — no dedicated modal needed).
        if (type === 'cta') {
            data.image = '/images/backgrounds/bg-5.jpg';
            data.eyebrow = 'Work With Us';
            data.heading = 'Let’s Find Your Next Home';
            data.description = 'Whether you’re buying or selling, our team brings local expertise and a client-first approach to every step of your real estate journey.';
            data.button_label = 'Contact Us';
            data.button_link = '/contact';
        }
        // Seed the Newsletter with a sensible heading + description.
        if (type === 'newsletter') {
            data.variant = 'split';
            data.theme = 'light';
            data.form_layout = 'stacked';
            data.collect_name = '1';
            data.heading = 'Stay Updated With Exclusive Listings';
            data.description = 'Be the first to know about new listings, market updates, and exclusive opportunities.';
            data.button_text = 'Subscribe';
            // Image / logo is optional and off by default — the agent adds one if wanted.
        }
        // Seed the Logo Marquee with empty slots so the editor opens ready to fill.
        if (type === 'logo-marquee') {
            data.monochrome = '1';
            data.speed = '30';
            data.logos = JSON.stringify([
                { image: '', link: '' },
                { image: '', link: '' },
                { image: '', link: '' },
                { image: '', link: '' },
            ]);
        }
        const id = generateBlockId();
        await api.addBlock(websiteId, page, id, type, blocksInSlot(slot).length, data, slot);
        await refetch();
        const fresh = await api.getSite(websiteId);
        const added = ((fresh.site?.page_data?.[page]?.blocks as BlockData[]) || []).find((b) => b.id === id);
        if (added) setEditingBlock(added);
    }

    // Clicking a "+" arms that slot and opens the block palette slide-over.
    function onPlus(slot: string) {
        setArmedSlot((cur) => (cur === slot ? null : slot));
    }

    // Resolve the editor config for a section. Hero gets a custom field set;
    // template sections come from TEMPLATE_CONFIGS; everything else is a stub.
    function resolveSection(id: string, label: string): SectionConfig {
        const custom = CUSTOM_SECTION_CONFIGS[`${page}:${id}`] || CUSTOM_SECTION_CONFIGS[id];
        if (custom) return custom;
        const cfg = sectionConfig(id);
        if (cfg) return cfg;
        return { id, label, fields: [] };
    }

    function editSection(id: string, label: string) {
        if (id === 'hero') { setEditingHero(true); return; }
        if (id === 'testimonials') { setEditingTestimonials(true); return; }
        setEditingSection(resolveSection(id, label));
    }

    async function handleDelete(block: BlockData) {
        if (!confirm('Delete this block?')) return;
        await api.deleteBlock(websiteId, page, block.id);
        await refetch();
    }

    // Drag-reorder for block cards, mirroring the section reorder: live local
    // override while dragging, persist on drop. Dragging over a block in another
    // slot group also retargets the dragged block's slot.
    function reorderBlockTo(overId: string) {
        if (!dragBlockId || dragBlockId === overId) return;
        const over = blocks.find((b) => b.id === overId);
        if (over) {
            const overSlot = over.slot || 'default';
            const dragged = blocks.find((b) => b.id === dragBlockId);
            if (dragged && (dragged.slot || 'default') !== overSlot) {
                setSlotOverride({ id: dragBlockId, slot: overSlot });
            } else if (slotOverride?.id === dragBlockId && slotOverride.slot !== overSlot) {
                setSlotOverride(overSlot === (dragged?.slot || 'default') ? null : { id: dragBlockId, slot: overSlot });
            }
        }
        const base = blockOrderOverride || blocks.map((b) => b.id);
        const next = [...base];
        const from = next.indexOf(dragBlockId);
        const to = next.indexOf(overId);
        if (from < 0 || to < 0) return;
        next.splice(from, 1);
        next.splice(to, 0, dragBlockId);
        setBlockOrderOverride(next);
    }
    // Dragging onto a slot's "+" line drops the block at the end of that slot —
    // this is how a block lands in an otherwise-empty slot.
    function retargetToSlot(slot: string) {
        if (!dragBlockId) return;
        const dragged = blocks.find((b) => b.id === dragBlockId);
        setSlotOverride(dragged && (dragged.slot || 'default') === slot ? null : { id: dragBlockId, slot });
        const base = blockOrderOverride || blocks.map((b) => b.id);
        setBlockOrderOverride([...base.filter((x) => x !== dragBlockId), dragBlockId]);
    }
    async function persistBlockOrder() {
        if (!dragBlockId) return; // onDrop + onDragEnd both fire — run once
        const draggedId = dragBlockId;
        setDragBlockId(null);
        const order = blockOrderOverride;
        const so = slotOverride;
        if (!order && !so) return;
        const slots = so && so.id === draggedId ? { [draggedId]: so.slot } : undefined;
        await api.reorderBlocks(websiteId, page, order || blocks.map((b) => b.id), slots);
        await refetch();
        setBlockOrderOverride(null);
        setSlotOverride(null);
    }

    async function moveBlock(slot: string, blockId: string, dir: -1 | 1) {
        const slotBlocks = blocksInSlot(slot);
        const idx = slotBlocks.findIndex((b) => b.id === blockId);
        const swapWith = idx + dir;
        if (swapWith < 0 || swapWith >= slotBlocks.length) return;
        const ids = blocks.map((b) => b.id);
        const ai = ids.indexOf(slotBlocks[idx].id);
        const bi = ids.indexOf(slotBlocks[swapWith].id);
        [ids[ai], ids[bi]] = [ids[bi], ids[ai]];
        await api.reorderBlocks(websiteId, page, ids);
        await refetch();
    }

    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
            {/* Top bar */}
            <div className="flex items-center gap-3 h-14 px-5 border-b border-[#E4E7EB] bg-white shrink-0">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315] transition-colors"
                    aria-label="Back to pages"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                </button>
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-[#111315] truncate">{displayLabel}</h2>
                </div>
                <div className="flex-1" />

                {/* Per-page SEO */}
                <button
                    type="button"
                    onClick={() => setSeoOpen(true)}
                    className="h-8 px-3 text-[12px] font-medium text-[#5F656D] border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] hover:text-[#111315] transition-colors flex items-center gap-1.5"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    SEO
                </button>

                {/* Add a block / re-show a hidden section — opens the block palette. */}
                <button
                    type="button"
                    onClick={() => setArmedSlot(bottomSlot)}
                    className="h-8 px-3 text-[12px] font-medium text-[#5F656D] border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] hover:text-[#111315] transition-colors flex items-center gap-1.5"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    Add Section
                </button>

                <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] font-semibold text-[#1693C9] hover:text-[#1380AF] transition-colors flex items-center gap-1.5"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                    View page
                </a>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* Canvas */}
                <div className="flex-1 min-w-0 overflow-y-auto bg-[#F7F8FB]">
                    <div className="max-w-[760px] mx-auto p-6 space-y-2.5">
                        {/* Header Settings — global, top */}
                        <button
                            type="button"
                            onClick={() => setHeaderOpen(true)}
                            className="w-full group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center text-left"
                        >
                            <span className="shrink-0 pl-4 flex items-center">
                                <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="4" width="18" height="16" rx="2" className="fill-[#EAF6FD] text-[#1693C9]" strokeWidth={1.5} />
                                    <rect x="3" y="4" width="18" height="5" rx="2" className="fill-[#D5EEFA] text-[#1693C9]" strokeWidth={1.5} />
                                </svg>
                            </span>
                            <div className="flex-1 min-w-0 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-semibold text-[#111315]">Header Settings</p>
                                    <span className="text-[10px] font-medium text-[#8B9096] bg-[#ECEEF1] px-1.5 py-0.5 rounded">Global</span>
                                </div>
                                <p className="text-[11px] text-[#8B9096] mt-0.5">Logo, sticky &amp; transparent — applies to every page</p>
                            </div>
                            <span className="shrink-0 pr-4 text-[#8B9096] group-hover:text-[#1693C9] transition-colors">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                            </span>
                        </button>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <svg className="animate-spin h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : layout.length === 0 ? (
                            <div className="text-center py-20 text-[#8B9096]">
                                <p className="text-[13px] font-medium text-[#374151]">Nothing to edit on this page yet</p>
                            </div>
                        ) : (
                            orderedLayout.map((item, idx) => {
                                if (item.kind === 'section') {
                                    // Hidden sections drop out of the flow (re-added via "Add Section").
                                    if (disabledSections.includes(item.id)) return null;
                                    return (
                                        <div
                                            key={`section-${item.id}`}
                                            draggable
                                            onDragStart={() => setDragSection(item.id)}
                                            onDragOver={(e) => { e.preventDefault(); reorderSectionTo(item.id); }}
                                            onDragEnd={persistSectionOrder}
                                            onDrop={persistSectionOrder}
                                            className={`group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center ${dragSection === item.id ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
                                        >
                                            <span className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing" aria-label="Drag to reorder" title="Drag to reorder">
                                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
                                            </span>
                                            <span className="shrink-0 pl-2 flex items-center">
                                                <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <rect x="3" y="4" width="18" height="16" rx="2" className="fill-[#D5EEFA] text-[#1693C9]" strokeWidth={1.5} />
                                                    <path className="text-[#1693C9]" strokeWidth={1.5} strokeLinecap="round" d="M3 9h18" />
                                                    <path className="text-[#1693C9]" strokeWidth={1.5} strokeLinecap="round" d="M7.5 13h6" />
                                                </svg>
                                            </span>
                                            <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-semibold text-[#111315] truncate">{item.label}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => editSection(item.id, item.label)}
                                                    className="h-8 px-3 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors flex items-center gap-1.5 shrink-0"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSectionHidden(item.id, true)}
                                                    className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#F0C2C2] rounded-[4px] hover:bg-[#FEF2F2] transition-colors flex items-center gap-1.5 shrink-0"
                                                >
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                const rawSlotBlocks = blocksInSlot(item.slot);
                                const slotBlocks = blockOrderOverride
                                    ? [...rawSlotBlocks].sort((a, b) => blockOrderOverride.indexOf(a.id) - blockOrderOverride.indexOf(b.id))
                                    : rawSlotBlocks;
                                // Hide empty, unanchored slots (no stray "+" without an adjacent section).
                                if (slotBlocks.length === 0 && !emptySlotHasAnchor(idx)) return null;
                                return (
                                    <div key={`slot-${item.slot}`} className="space-y-2.5">
                                        {slotBlocks.map((block, bi) => {
                                            const def = BLOCK_DEFINITIONS.find((d) => d.type === block.type);

                                            // Single, unified block card — identical chrome for every block type.
                                            return (
                                                <div
                                                    key={block.id}
                                                    draggable
                                                    onDragStart={() => setDragBlockId(block.id)}
                                                    onDragOver={(e) => { e.preventDefault(); reorderBlockTo(block.id); }}
                                                    onDragEnd={persistBlockOrder}
                                                    onDrop={persistBlockOrder}
                                                    className={`group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center ${dragBlockId === block.id ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
                                                >
                                                    <span className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing" aria-label="Drag to reorder" title="Drag to reorder">
                                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
                                                    </span>
                                                    <span className="shrink-0 pl-2 flex items-center">
                                                        <span
                                                            className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]"
                                                            dangerouslySetInnerHTML={{ __html: def?.icon || '' }}
                                                        />
                                                    </span>
                                                    <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[13px] font-semibold text-[#111315] truncate">{def?.label || block.type}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingBlock(block)}
                                                            className="h-8 px-3 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors flex items-center gap-1.5 shrink-0"
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(block)}
                                                            className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#F0C2C2] rounded-[4px] hover:bg-[#FEF2F2] transition-colors flex items-center gap-1.5 shrink-0"
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Insertion point: dotted line with a centered primary "+".
                                            Also a drop target — dragging a block here moves it to
                                            the end of this slot. */}
                                        <div
                                            className="relative flex items-center justify-center py-1.5"
                                            onDragOver={(e) => { if (dragBlockId) { e.preventDefault(); retargetToSlot(item.slot); } }}
                                            onDrop={persistBlockOrder}
                                        >
                                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-[#D1D5DB]" />
                                            <button
                                                type="button"
                                                onClick={() => onPlus(item.slot)}
                                                aria-label="Add a block here"
                                                title="Add a block here"
                                                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm transition-all ${
                                                    armedSlot === item.slot
                                                        ? 'bg-[#1380AF] ring-2 ring-[#1693C9]/40 scale-110'
                                                        : 'bg-[#1693C9] hover:bg-[#1380AF] hover:scale-110'
                                                }`}
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        {/* Footer Settings — global, bottom */}
                        <button
                            type="button"
                            onClick={() => setFooterOpen(true)}
                            className="w-full group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center text-left"
                        >
                            <span className="shrink-0 pl-4 flex items-center">
                                <svg className="h-9 w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <rect x="3" y="4" width="18" height="16" rx="2" className="fill-[#EAF6FD] text-[#1693C9]" strokeWidth={1.5} />
                                    <rect x="3" y="15" width="18" height="5" rx="2" className="fill-[#D5EEFA] text-[#1693C9]" strokeWidth={1.5} />
                                </svg>
                            </span>
                            <div className="flex-1 min-w-0 px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-semibold text-[#111315]">Footer Settings</p>
                                    <span className="text-[10px] font-medium text-[#8B9096] bg-[#ECEEF1] px-1.5 py-0.5 rounded">Global</span>
                                </div>
                                <p className="text-[11px] text-[#8B9096] mt-0.5">Footer content &amp; layout — applies to every page</p>
                            </div>
                            <span className="shrink-0 pr-4 text-[#8B9096] group-hover:text-[#1693C9] transition-colors">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {editingBlock && editingBlock.type === 'services' && (
                <ServicesEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'team' && (
                <TeamEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'logo-marquee' && (
                <LogoMarqueeEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'testimonials' && (
                <TestimonialsBlockEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'featured' && (
                <FeaturedEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'communities' && (
                <CommunitiesEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'newsletter' && (
                <NewsletterEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'content' && (
                <ContentEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'videos' && (
                <VideosEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'home-valuation' && (
                <HomeValuationEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'process' && (
                <ProcessEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'faqs' && (
                <FaqEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'page-header' && (
                <PageHeaderBlockEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && editingBlock.type === 'latest-blog-posts' && (
                <LatestBlogPostsEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingBlock && !['services', 'team', 'logo-marquee', 'testimonials', 'featured', 'communities', 'newsletter', 'content', 'faqs', 'process', 'home-valuation', 'videos', 'page-header', 'latest-blog-posts'].includes(editingBlock.type) && (
                <BlockEditorModal
                    onClose={() => setEditingBlock(null)}
                    onSaved={() => { setEditingBlock(null); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    block={editingBlock}
                />
            )}
            {editingSection && (
                <SectionEditorModal
                    onClose={() => setEditingSection(null)}
                    onSaved={() => { setEditingSection(null); refetch(); }}
                    site={site}
                    section={editingSection}
                    page={page}
                />
            )}
            {seoOpen && (
                <PageSeoModal
                    onClose={() => setSeoOpen(false)}
                    onSaved={() => { setSeoOpen(false); refetch(); }}
                    websiteId={websiteId}
                    page={page}
                    pageLabel={displayLabel}
                    initialTitle={pageMetaTitle}
                    initialDescription={pageMetaDescription}
                />
            )}
            {armedSlot && (
                <BlockPaletteModal
                    onClose={() => setArmedSlot(null)}
                    onSelect={(type) => doInsert(armedSlot, type)}
                    hiddenSections={hiddenLayoutSections.map((s) => ({ id: s.id, label: s.label }))}
                    onRestoreSection={(id) => { setArmedSlot(null); setSectionHidden(id, false); }}
                    capabilities={capabilities}
                />
            )}
            {editingTestimonials && (
                <TestimonialsEditorModal
                    onClose={() => setEditingTestimonials(false)}
                    onSaved={() => { setEditingTestimonials(false); refetch(); }}
                    site={site}
                />
            )}
            {editingHero && (
                <HeroSettingsModal
                    onClose={() => setEditingHero(false)}
                    onSaved={() => { setEditingHero(false); refetch(); }}
                    site={site}
                    page={page}
                />
            )}
            {headerOpen && (
                <HeaderSettingsModal
                    onClose={() => setHeaderOpen(false)}
                    onSaved={() => { setHeaderOpen(false); refetch(); }}
                    site={site}
                />
            )}
            {footerOpen && (
                <FooterSettingsModal
                    onClose={() => setFooterOpen(false)}
                    onSaved={() => { setFooterOpen(false); refetch(); }}
                    websiteId={websiteId}
                    site={site}
                />
            )}
        </div>
    );
}
