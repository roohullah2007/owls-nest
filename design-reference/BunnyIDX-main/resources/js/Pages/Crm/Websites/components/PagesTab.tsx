import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AddPageModal, { NewPagePayload } from './AddPageModal';
import PageSeoModal from './PageSeoModal';

interface CustomPage {
    slug: string;
    title: string;
    show_in_nav: boolean;
    parent?: string | null;
}

interface PagesConfig {
    disabled_pages: string[];
    nav_order: string[];
    custom_pages: CustomPage[];
}

const BUILT_IN_PAGES = [
    { slug: 'home', label: 'Home', permanent: true },
    { slug: 'about', label: 'About' },
    { slug: 'buy', label: 'Buy' },
    { slug: 'sell', label: 'Sell' },
    { slug: 'areas', label: 'Communities' },
    { slug: 'blog', label: 'Blog' },
    { slug: 'contact', label: 'Contact' },
    { slug: 'home-valuation', label: 'Home Valuation' },
    { slug: 'team', label: 'Team' },
    { slug: 'featured', label: 'Featured Properties' },
    { slug: 'sold', label: 'Past Transactions' },
];

const DEFAULT_NAV_ORDER = ['home', 'about', 'buy', 'sell', 'areas', 'blog', 'contact', 'home-valuation'];

interface Props {
    websiteId: number;
    onActionChange: (action: { label: string; onClick: () => void } | null) => void;
    onEditPage: (slug: string, label: string) => void;
}

export default function PagesTab({ websiteId, onActionChange, onEditPage }: Props) {
    const [config, setConfig] = useState<PagesConfig>({ disabled_pages: [], nav_order: [], custom_pages: [] });
    const [areasLabel, setAreasLabel] = useState('Communities');
    const [loading, setLoading] = useState(true);
    const [addingPage, setAddingPage] = useState(false);
    const [dragSlug, setDragSlug] = useState<string | null>(null);
    // Per-page SEO overrides (meta title/description in page_data[slug]).
    const [pageMeta, setPageMeta] = useState<Record<string, { title: string; description: string }>>({});
    const [seoPage, setSeoPage] = useState<{ slug: string; label: string } | null>(null);
    const loadedRef = useRef(false);

    function loadPageMeta() {
        axios.get(`/api/website-editor/${websiteId}`).then(res => {
            const pageData = (res.data.site?.page_data || {}) as Record<string, any>;
            const meta: Record<string, { title: string; description: string }> = {};
            Object.entries(pageData).forEach(([slug, fields]) => {
                if (slug.startsWith('_') || !fields || typeof fields !== 'object') return;
                meta[slug] = {
                    title: (fields.meta_title as string) || '',
                    description: (fields.meta_description as string) || '',
                };
            });
            setPageMeta(meta);
        });
    }

    useEffect(loadPageMeta, [websiteId]);

    useEffect(() => {
        axios.get(`/api/website-editor/${websiteId}/pages-config`)
            .then(res => {
                setConfig({
                    disabled_pages: res.data.disabled_pages || [],
                    nav_order: res.data.nav_order?.length ? res.data.nav_order : DEFAULT_NAV_ORDER,
                    custom_pages: res.data.custom_pages || [],
                });
                if (res.data.areas_label) setAreasLabel(res.data.areas_label);
            })
            .finally(() => setLoading(false));
    }, [websiteId]);

    // Expose the "Add Page" header action to the parent.
    useEffect(() => {
        onActionChange({ label: '+ Add Page', onClick: () => setAddingPage(true) });
        return () => onActionChange(null);
    }, [onActionChange]);

    // Page config changes (reorder / show-hide / add / remove) auto-save — no
    // manual Update button. Skip the initial load, then debounce writes.
    useEffect(() => {
        if (loading) return;
        if (!loadedRef.current) { loadedRef.current = true; return; }
        const t = setTimeout(() => {
            axios.patch(`/api/website-editor/${websiteId}/pages-config`, config);
        }, 500);
        return () => clearTimeout(t);
    }, [config, loading, websiteId]);

    function markDirty() { /* changes auto-save via the effect above */ }

    function togglePage(slug: string) {
        setConfig(prev => {
            const disabled = prev.disabled_pages.includes(slug)
                ? prev.disabled_pages.filter(p => p !== slug)
                : [...prev.disabled_pages, slug];
            return { ...prev, disabled_pages: disabled };
        });
        markDirty();
    }

    // Drag-to-reorder: rebuild nav_order live as the dragged card passes over a target.
    function reorderTo(overSlug: string) {
        if (!dragSlug || dragSlug === overSlug) return;
        setConfig(prev => {
            const navOrder = prev.nav_order.length ? prev.nav_order : DEFAULT_NAV_ORDER;
            const allSlugs = [...BUILT_IN_PAGES.map(p => p.slug), ...prev.custom_pages.map(p => p.slug)];
            const order = [
                ...navOrder.filter(s => allSlugs.includes(s)),
                ...allSlugs.filter(s => !navOrder.includes(s)),
            ];
            const from = order.indexOf(dragSlug);
            const to = order.indexOf(overSlug);
            if (from < 0 || to < 0) return prev;
            order.splice(from, 1);
            order.splice(to, 0, dragSlug);
            return { ...prev, nav_order: order };
        });
        markDirty();
    }

    function addCustomPage({ title, parent, show_in_nav, type }: NewPagePayload) {
        // The Communities page is the built-in dynamic `areas` page — "creating"
        // it names it (page heading + nav label) and ensures it's enabled + in nav.
        if (type === 'communities') {
            axios.patch(`/api/website-editor/${websiteId}/areas-label`, { areas_label: title });
            setAreasLabel(title);
            setConfig(prev => {
                const navOrder = prev.nav_order.length ? prev.nav_order : DEFAULT_NAV_ORDER;
                return {
                    ...prev,
                    disabled_pages: prev.disabled_pages.filter(s => s !== 'areas'),
                    nav_order: navOrder.includes('areas') ? navOrder : [...navOrder, 'areas'],
                };
            });
            setAddingPage(false);
            markDirty();
            return;
        }

        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (!slug) return;

        const allSlugs = [...BUILT_IN_PAGES.map(p => p.slug), ...config.custom_pages.map(p => p.slug)];
        if (allSlugs.includes(slug)) return;

        setConfig(prev => ({
            ...prev,
            custom_pages: [...prev.custom_pages, { slug, title, show_in_nav, parent }],
            nav_order: [...(prev.nav_order.length ? prev.nav_order : DEFAULT_NAV_ORDER), slug],
        }));
        setAddingPage(false);
        markDirty();
    }

    function removeCustomPage(slug: string) {
        setConfig(prev => ({
            ...prev,
            custom_pages: prev.custom_pages.filter(p => p.slug !== slug),
            nav_order: prev.nav_order.filter(s => s !== slug),
            disabled_pages: prev.disabled_pages.filter(p => p !== slug),
        }));
        markDirty();
    }

    function toggleCustomPageNav(slug: string) {
        setConfig(prev => ({
            ...prev,
            custom_pages: prev.custom_pages.map(p =>
                p.slug === slug ? { ...p, show_in_nav: !p.show_in_nav } : p
            ),
        }));
        markDirty();
    }

    // Build ordered list
    const navOrder = config.nav_order.length ? config.nav_order : DEFAULT_NAV_ORDER;
    const allPageSlugs = [
        ...BUILT_IN_PAGES.map(p => p.slug),
        ...config.custom_pages.map(p => p.slug),
    ];
    const orderedSlugs = [
        ...navOrder.filter(s => allPageSlugs.includes(s)),
        ...allPageSlugs.filter(s => !navOrder.includes(s)),
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="animate-spin h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Pages list */}
            <div className="space-y-2.5">
                {orderedSlugs.map((slug) => {
                    const builtIn = BUILT_IN_PAGES.find(p => p.slug === slug);
                    const custom = config.custom_pages.find(p => p.slug === slug);
                    const label = slug === 'areas' ? areasLabel : (builtIn?.label || custom?.title || slug);
                    const isPermanent = builtIn?.permanent;
                    const isDisabled = config.disabled_pages.includes(slug);
                    const isCustom = !!custom;
                    const open = () => onEditPage(slug, label);

                    return (
                        <div
                            key={slug}
                            draggable
                            onDragStart={() => setDragSlug(slug)}
                            onDragOver={(e) => { e.preventDefault(); reorderTo(slug); }}
                            onDragEnd={() => setDragSlug(null)}
                            onDrop={() => setDragSlug(null)}
                            className={`group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center ${isDisabled ? 'opacity-60' : ''} ${dragSlug === slug ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
                        >
                            {/* Drag handle — at the very beginning */}
                            <span className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing" aria-label="Drag to reorder" title="Drag to reorder">
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
                            </span>

                            {/* Icon */}
                            <button type="button" onClick={open} className="shrink-0 pl-3 flex items-center" aria-label={`Edit ${label}`}>
                                <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path className="fill-[#D5EEFA] text-[#1693C9]" strokeWidth={1.5} strokeLinejoin="round" d="M5.5 3.5h7.5l5 5v11a1 1 0 0 1-1 1h-11.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
                                    <path className="text-[#1693C9]" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" d="M13 3.5v5h5" />
                                    <path className="text-[#1693C9]" strokeWidth={1.5} strokeLinecap="round" d="M8.5 13h7M8.5 16h5" />
                                </svg>
                            </button>

                            {/* Content + actions */}
                            <div className="flex-1 min-w-0 flex items-center gap-4 px-5 py-4">
                                <div className="min-w-0 flex-1">
                                    <button type="button" onClick={open} className="block max-w-full text-left">
                                        <span className="block text-[15px] font-semibold text-[#111315] truncate hover:text-[#1693C9] transition-colors">{label}</span>
                                    </button>
                                    <p className="text-[11px] text-[#8B9096] truncate mt-0.5">
                                        <span className="font-mono">/{slug === 'home' ? '' : slug}</span>
                                        {slug === 'areas' && ' · Dynamic — communities grid; each community gets its own page'}
                                        {slug === 'blog' && ' · Dynamic — blog grid; each post gets its own page'}
                                        {slug === 'team' && ' · Dynamic — team grid; each member gets their own page'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSeoPage({ slug, label })}
                                    title={pageMeta[slug]?.title || pageMeta[slug]?.description ? 'Per-page SEO set' : 'Set per-page SEO'}
                                    className="h-8 px-3.5 text-[12px] font-medium text-[#1693C9] border border-[#1693C9]/40 rounded-[4px] hover:bg-[#E0F2FE] transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                                    SEO
                                    {(pageMeta[slug]?.title || pageMeta[slug]?.description) && <span className="h-1.5 w-1.5 rounded-full bg-[#63A205]" aria-label="Per-page SEO set" />}
                                </button>

                                <button
                                    type="button"
                                    onClick={open}
                                    className="h-8 px-3.5 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                    Edit
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Per-page SEO overrides (meta title/description in page_data[slug]) */}
            {seoPage && (
                <PageSeoModal
                    onClose={() => setSeoPage(null)}
                    onSaved={() => { setSeoPage(null); loadPageMeta(); }}
                    websiteId={websiteId}
                    page={seoPage.slug}
                    pageLabel={seoPage.label}
                    initialTitle={pageMeta[seoPage.slug]?.title || ''}
                    initialDescription={pageMeta[seoPage.slug]?.description || ''}
                />
            )}

            {/* Add Page slide-over (triggered by the header "Add Page" button) */}
            {addingPage && (
                <AddPageModal
                    onClose={() => setAddingPage(false)}
                    onCreate={addCustomPage}
                    parentOptions={orderedSlugs.map((s) => ({
                        slug: s,
                        label: BUILT_IN_PAGES.find(p => p.slug === s)?.label
                            || config.custom_pages.find(p => p.slug === s)?.title
                            || s,
                    }))}
                    existingSlugs={[...BUILT_IN_PAGES.map(p => p.slug), ...config.custom_pages.map(p => p.slug)]}
                />
            )}
        </div>
    );
}
