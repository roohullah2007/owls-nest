import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

interface DropdownLink { label: string; url: string }
interface CustomPage { slug: string; title: string; show_in_nav?: boolean; parent?: string | null }

interface Props {
    websiteId: number;
    onActionChange: (action: { label: string; onClick: () => void } | null) => void;
}

/**
 * Navigation Menus — manages the theme's two menu locations from one place:
 *   Header: drag-and-drop order + nesting of every page on the site. Drop an
 *           item ONTO another to nest it as a dropdown child, or use the row's
 *           "Add to dropdown" picker (system pages persist via
 *           header.nav_parents, custom pages via their `parent` field — both
 *           feed navTree()'s nesting pass). Per-item custom dropdown links
 *           (header.nav_dropdowns) render as the same card rows as nested
 *           pages so the menu reads exactly like the public dropdown.
 *   Footer: which pages appear in the footer menu (footer.menu; empty = mirror
 *           the header navigation).
 * All of it feeds navTree(), the single source for every public nav surface.
 */

// System pages navTree() can surface, in default order. Conditional ones note
// when they auto-appear so hiding/showing them here isn't confusing.
const SYSTEM_PAGES: { key: string; label: string; note?: string }[] = [
    { key: 'home', label: 'Home' },
    { key: 'properties', label: 'Property Search' },
    { key: 'about', label: 'About' },
    { key: 'team', label: 'Meet the Team', note: 'shows once Team members exist' },
    { key: 'buy', label: 'Buy' },
    { key: 'sell', label: 'Sell' },
    { key: 'areas', label: 'Communities', note: 'shows once Communities exist; lists them as a dropdown' },
    { key: 'condos', label: 'Condos', note: 'shows when the Condo Directory is enabled' },
    { key: 'new-developments', label: 'New Developments', note: 'shows when New Developments is enabled' },
    { key: 'blog', label: 'Blog', note: 'shows once posts are published' },
    { key: 'contact', label: 'Contact' },
];

const SYSTEM_KEYS = new Set(SYSTEM_PAGES.map((p) => p.key));

/** Items that always carry auto-generated children — they can be parents but never nest under something else. */
const AUTO_PARENT_KEYS = new Set(['buy', 'areas']);

/** Auto-children rendered for context (not draggable; featured/sold can be hidden). */
const AUTO_CHILDREN: Record<string, { key: string; label: string; toggleable: boolean; note: string }[]> = {
    buy: [
        { key: 'featured', label: 'Featured Properties', toggleable: true, note: 'auto — shows when curated featured listings exist' },
        { key: 'sold', label: 'Past Transactions', toggleable: true, note: 'auto — shows when past transactions exist' },
        { key: 'market-trends', label: 'Market Trends', toggleable: true, note: 'live MLS market dashboard — its own /market-trends page' },
    ],
    areas: [],
};

type DropPos = 'before' | 'after' | 'into';
interface DropTarget { key: string; pos: DropPos }

/** Shared row chrome — page cards, nested pages and dropdown links all look the same. */
const rowCard = 'relative flex items-center gap-2 rounded-[4px] border border-[#E4E7EB] bg-white px-3 py-2.5 shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)]';

function PageIcon({ className }: { className: string }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>;
}

function LinkIcon({ className }: { className: string }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>;
}

function NestArrow() {
    return (
        <span className="text-[#A6ACB3]" aria-hidden>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5v8a4 4 0 0 0 4 4h6m0 0-3-3m3 3-3 3" /></svg>
        </span>
    );
}

export default function MenusSection({ websiteId, onActionChange }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [navOrder, setNavOrder] = useState<string[]>([]);
    const [parents, setParents] = useState<Record<string, string>>({});
    const [disabled, setDisabled] = useState<string[]>([]);
    const [customPages, setCustomPages] = useState<CustomPage[]>([]);
    const [areasLabel, setAreasLabel] = useState('Communities');
    const [dropdowns, setDropdowns] = useState<Record<string, DropdownLink[]>>({});
    const [footerMenu, setFooterMenu] = useState<string[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);

    // Drag state. dragKey lives in a ref too so dragover handlers (which fire
    // before React re-renders) always see the current value.
    const [dragKey, setDragKey] = useState<string | null>(null);
    const dragKeyRef = useRef<string | null>(null);
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    // Footer menu drag-to-reorder (independent of the header list).
    const [dragFooter, setDragFooter] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([
            axios.get(`/api/website-editor/${websiteId}/pages-config`),
            axios.get(`/api/website-editor/${websiteId}`),
        ]).then(([pagesRes, siteRes]) => {
            if (cancelled) return;
            const cfg = pagesRes.data;
            const custom: CustomPage[] = cfg.custom_pages || [];
            // Full candidate list: saved order first, then any system/custom keys
            // it doesn't know about yet — EVERY page shows here, nested ones too.
            const order = [...(cfg.nav_order?.length ? cfg.nav_order : SYSTEM_PAGES.map((p) => p.key))];
            SYSTEM_PAGES.forEach((p) => { if (!order.includes(p.key)) order.push(p.key); });
            custom.forEach((c) => { if (!order.includes(c.slug)) order.push(c.slug); });

            const siteCfg = (siteRes.data.site?.page_data?._config ?? {}) as {
                header?: { nav_dropdowns?: Record<string, DropdownLink[]>; nav_parents?: Record<string, string> };
                footer?: { menu?: string[] };
            };

            // Nesting map: saved nav_parents + custom pages' parent field.
            const par: Record<string, string> = { ...(siteCfg.header?.nav_parents || {}) };
            custom.forEach((c) => { if (c.parent && !par[c.slug]) par[c.slug] = c.parent; });

            setNavOrder(order);
            setParents(par);
            setDisabled(cfg.disabled_pages || []);
            setCustomPages(custom);
            setAreasLabel(cfg.areas_label || 'Communities');
            setDropdowns(siteCfg.header?.nav_dropdowns || {});
            setFooterMenu(siteCfg.footer?.menu || []);
        }).catch(() => {
            if (!cancelled) setError('Could not load the menu configuration.');
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [websiteId]);

    /** Effective parent — only counts when the parent exists and is itself top-level. */
    function parentOf(key: string, par: Record<string, string> = parents, order: string[] = navOrder): string | null {
        const p = par[key];
        if (!p || p === key || key === 'home' || !order.includes(p)) return null;
        if (par[p]) return null; // parent is itself nested — one level only
        return p;
    }

    /** Display rows: top-level items each followed by their nested children. */
    const rows = useMemo(() => {
        const out: { key: string; parent: string | null }[] = [];
        navOrder.forEach((key) => {
            if (parentOf(key)) return;
            out.push({ key, parent: null });
            navOrder.forEach((child) => { if (parentOf(child) === key) out.push({ key: child, parent: key }); });
        });
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navOrder, parents]);

    function labelFor(key: string): string {
        if (key === 'areas') return areasLabel;
        const sys = SYSTEM_PAGES.find((p) => p.key === key);
        if (sys) return sys.label;
        return customPages.find((c) => c.slug === key)?.title || key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function noteFor(key: string): string | undefined {
        return SYSTEM_PAGES.find((p) => p.key === key)?.note;
    }

    /** Can `key` be nested under something? */
    function canNest(key: string): boolean {
        if (key === 'home' || AUTO_PARENT_KEYS.has(key)) return false;
        if ((dropdowns[key] || []).some((l) => l.label.trim() && l.url.trim())) return false; // would orphan its dropdown links
        return !rows.some((r) => r.parent === key); // has nested children of its own
    }

    /** Can `key` receive nested children? */
    function canParent(key: string): boolean {
        return key !== 'home' && !parentOf(key);
    }

    /** Pages that could be added to `parentKey`'s dropdown right now. */
    function nestablePagesFor(parentKey: string): { key: string; label: string }[] {
        return rows
            .filter((r) => !r.parent && r.key !== parentKey && canNest(r.key))
            .map((r) => ({ key: r.key, label: labelFor(r.key) }));
    }

    /** Nest `childKey` under `parentKey` (the picker path — same result as drag-into). */
    function nestPage(parentKey: string, childKey: string) {
        if (!canParent(parentKey) || !canNest(childKey)) return;
        setParents((prev) => ({ ...prev, [childKey]: parentKey }));
        setNavOrder((prev) => {
            const next = prev.filter((k) => k !== childKey);
            // After the parent's last existing child (or the parent itself).
            let idx = next.indexOf(parentKey);
            while (idx + 1 < next.length && parentOf(next[idx + 1], { ...parents, [childKey]: parentKey }, next) === parentKey) idx++;
            next.splice(idx + 1, 0, childKey);
            return next;
        });
    }

    // ── Drag & drop ─────────────────────────────────────────────

    function onDragStart(e: DragEvent, key: string) {
        dragKeyRef.current = key;
        setDragKey(key);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
    }

    function onDragOver(e: DragEvent, targetKey: string) {
        const drag = dragKeyRef.current;
        if (!drag || drag === targetKey) return;
        // Can't drop on your own nested child.
        if (parentOf(targetKey) === drag) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        let pos: DropPos = ratio < 0.3 ? 'before' : ratio > 0.7 ? 'after' : 'into';
        // The middle band nests — only when the combination is allowed;
        // otherwise fall back to the nearest reorder position.
        if (pos === 'into' && (!canNest(drag) || !canParent(targetKey))) {
            pos = ratio < 0.5 ? 'before' : 'after';
        }
        setDropTarget((cur) => (cur?.key === targetKey && cur.pos === pos ? cur : { key: targetKey, pos }));
    }

    function onDrop(e: DragEvent, targetKey: string) {
        e.preventDefault();
        const drag = dragKeyRef.current;
        const target = dropTarget;
        endDrag();
        if (!drag || !target || target.key !== targetKey || drag === targetKey) return;

        // Move the dragged item — WITH its nested children — as a block.
        const blockKeys = [drag, ...rows.filter((r) => r.parent === drag).map((r) => r.key)];
        const rest = rows.filter((r) => !blockKeys.includes(r.key));
        const nextParents = { ...parents };

        let insertAt: number;
        if (target.pos === 'into') {
            nextParents[drag] = targetKey;
            // Insert after the target's last existing child (or the target itself).
            let idx = rest.findIndex((r) => r.key === targetKey);
            while (idx + 1 < rest.length && rest[idx + 1].parent === targetKey) idx++;
            insertAt = idx + 1;
        } else {
            // Same level as the target: inherit its parent (null at top level).
            const targetParent = parentOf(targetKey);
            if (targetParent) nextParents[drag] = targetParent;
            else delete nextParents[drag];
            let idx = rest.findIndex((r) => r.key === targetKey);
            if (target.pos === 'after') {
                // After a top-level item means after its whole child block.
                if (!targetParent) while (idx + 1 < rest.length && rest[idx + 1].parent === targetKey) idx++;
                insertAt = idx + 1;
            } else {
                insertAt = idx;
            }
        }

        const blockRows = blockKeys.map((k) => ({ key: k, parent: nextParents[k] ?? null }));
        const nextRows = [...rest.slice(0, insertAt), ...blockRows, ...rest.slice(insertAt)];
        setNavOrder(nextRows.map((r) => r.key));
        setParents(nextParents);
    }

    function endDrag() {
        dragKeyRef.current = null;
        setDragKey(null);
        setDropTarget(null);
    }

    /** "Move to top level" affordance for nested rows (keyboard/no-mouse path). */
    function unnest(key: string) {
        setParents((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }

    function toggleVisible(key: string) {
        if (key === 'home') return; // home can't be hidden (server enforces too)
        setDisabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    }

    function toggleFooter(key: string) {
        setFooterMenu((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    }

    /** Footer drag-to-reorder — rebuild the order live as the card passes over a target. */
    function footerReorderTo(overKey: string) {
        if (!dragFooter || dragFooter === overKey) return;
        setFooterMenu((prev) => {
            const from = prev.indexOf(dragFooter);
            const to = prev.indexOf(overKey);
            if (from < 0 || to < 0) return prev;
            const next = [...prev];
            next.splice(from, 1);
            next.splice(to, 0, dragFooter);
            return next;
        });
    }

    function updateLink(key: string, idx: number, field: keyof DropdownLink, value: string) {
        setDropdowns((prev) => {
            const links = [...(prev[key] || [])];
            links[idx] = { ...links[idx], [field]: value };
            return { ...prev, [key]: links };
        });
    }

    function addLink(key: string) {
        setDropdowns((prev) => ({ ...prev, [key]: [...(prev[key] || []), { label: '', url: '' }] }));
        setExpanded(key);
    }

    function removeLink(key: string, idx: number) {
        setDropdowns((prev) => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== idx) }));
    }

    const saveRef = useRef<() => void>(() => {});
    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            // Drop blank dropdown rows before persisting.
            const cleanDropdowns: Record<string, DropdownLink[]> = {};
            Object.entries(dropdowns).forEach(([k, links]) => {
                const clean = (links || []).filter((l) => l.label.trim() && l.url.trim());
                if (clean.length) cleanDropdowns[k] = clean;
            });

            // Nesting persists through two channels navTree() understands:
            // custom pages via their `parent` field, system pages via
            // header.nav_parents. Ordered by the visual list either way.
            const navParents: Record<string, string> = {};
            rows.forEach((r) => {
                if (r.parent && SYSTEM_KEYS.has(r.key)) navParents[r.key] = r.parent;
            });
            const orderedCustom = [...customPages]
                .sort((a, b) => navOrder.indexOf(a.slug) - navOrder.indexOf(b.slug))
                .map((c) => ({ ...c, parent: rows.find((r) => r.key === c.slug)?.parent ?? null }));

            await Promise.all([
                axios.patch(`/api/website-editor/${websiteId}/pages-config`, {
                    disabled_pages: disabled,
                    nav_order: navOrder,
                    custom_pages: orderedCustom,
                }),
                axios.patch(`/api/website-editor/${websiteId}/header-config`, { nav_dropdowns: cleanDropdowns, nav_parents: navParents }),
                // Footer keeps its OWN order (drag-arrangeable) — the public
                // footer renders fcfg['menu'] in saved sequence.
                axios.patch(`/api/website-editor/${websiteId}/footer-config`, { menu: footerMenu }),
            ]);
            setCustomPages(orderedCustom);
            setSavedAt(Date.now());
        } catch {
            setError('Could not save the menus. Please try again.');
        } finally {
            setSaving(false);
        }
    }
    saveRef.current = handleSave;

    // Auto-save (like the Pages tab): any menu adjustment persists after a
    // short debounce — no reliance on the Save button. The button remains as
    // an instant-save affordance. loadedRef gates out the initial state set.
    const loadedRef = useRef(false);
    useEffect(() => {
        if (loading) return;
        if (!loadedRef.current) {
            loadedRef.current = true;
            return;
        }
        const t = window.setTimeout(() => saveRef.current(), 900);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, navOrder, parents, disabled, dropdowns, footerMenu]);

    useEffect(() => {
        onActionChange({ label: 'Save Menus', onClick: () => saveRef.current() });
        return () => onActionChange(null);
    }, [onActionChange]);

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
        <div className="space-y-4">
            {error && <p className="text-[12px] font-medium text-red-600">{error}</p>}
            {savedAt !== null && !error && !saving && <p className="text-[12px] font-medium text-[#63A205]">Menus saved.</p>}
            {saving && <p className="text-[12px] font-medium text-[#8B9096]">Saving…</p>}

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">

            {/* ── Header menu ── */}
            <div>
                <div className="mb-3">
                    <h4 className="text-sm font-semibold text-[#111315]">Header Menu</h4>
                    <p className="text-[11px] text-[#8B9096] mt-0.5">
                        Drag to reorder. Drop a page onto another (or use its <b>Dropdown</b> panel) to nest it as a
                        dropdown item — drag it between items or use &ldquo;Move to top level&rdquo; to pull it back out.
                        Dropdowns can mix pages and custom links.
                    </p>
                </div>
                <div className="space-y-1.5">
                    {rows.map(({ key, parent }) => {
                        const hidden = disabled.includes(key);
                        const links = dropdowns[key] || [];
                        const open = expanded === key;
                        const isDragging = dragKey === key;
                        const dt = dropTarget?.key === key ? dropTarget.pos : null;
                        const autoKids = parent ? [] : (AUTO_CHILDREN[key] || []);
                        const nestable = parent ? [] : nestablePagesFor(key);
                        return (
                            <div key={key} className={`${isDragging ? 'opacity-40' : ''} ${parent ? 'pl-9' : ''}`}>
                                <div
                                    draggable
                                    onDragStart={(e) => onDragStart(e, key)}
                                    onDragEnd={endDrag}
                                    onDragOver={(e) => onDragOver(e, key)}
                                    onDragLeave={() => setDropTarget((cur) => (cur?.key === key ? null : cur))}
                                    onDrop={(e) => onDrop(e, key)}
                                    className={[
                                        rowCard,
                                        'cursor-grab active:cursor-grabbing transition-colors',
                                        hidden ? 'opacity-50' : '',
                                        dt === 'into' ? 'ring-2 ring-inset ring-[#1693C9] bg-[#EBF5FF]' : 'hover:border-[#D1D5DB]',
                                    ].join(' ')}
                                >
                                    {/* Drop position indicators */}
                                    {dt === 'before' && <div className="pointer-events-none absolute -top-1 left-2 right-2 h-0.5 rounded-full bg-[#1693C9]" />}
                                    {dt === 'after' && <div className="pointer-events-none absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-[#1693C9]" />}
                                    {dt === 'into' && (
                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[#1693C9] px-2 py-0.5 text-[10px] font-semibold text-white">
                                            Drop to add to dropdown
                                        </span>
                                    )}

                                    {/* Drag handle */}
                                    <span className="text-[#C8CCD1]" aria-hidden>
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                            <circle cx="7" cy="5" r="1.3" /><circle cx="13" cy="5" r="1.3" />
                                            <circle cx="7" cy="10" r="1.3" /><circle cx="13" cy="10" r="1.3" />
                                            <circle cx="7" cy="15" r="1.3" /><circle cx="13" cy="15" r="1.3" />
                                        </svg>
                                    </span>

                                    {parent && <NestArrow />}

                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] ${parent ? 'bg-[#F3F4F6]' : 'bg-[#E0F2FE]'}`}>
                                        <PageIcon className={`h-4 w-4 ${parent ? 'text-[#8B9096]' : 'text-[#1693C9]'}`} />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <span className="text-[13px] font-medium text-[#111315]">{labelFor(key)}</span>
                                        {!SYSTEM_KEYS.has(key) && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F3F4F6] text-[#5F656D]">page</span>}
                                        {noteFor(key) && <span className="ml-2 text-[11px] text-[#8B9096]">{noteFor(key)}</span>}
                                    </div>

                                    {parent && (
                                        <button type="button" onClick={() => unnest(key)} className="h-7 px-2.5 text-[11px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">
                                            Move to top level
                                        </button>
                                    )}
                                    {!parent && (
                                        <button type="button" onClick={() => setExpanded(open ? null : key)} className={`h-7 px-2.5 text-[11px] font-medium rounded transition-colors ${open ? 'bg-[#F3F4F6] text-[#111315]' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                                            Dropdown {open ? '▴' : '▾'}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => toggleVisible(key)}
                                        disabled={key === 'home'}
                                        className={`h-7 px-2.5 text-[11px] font-medium rounded transition-colors disabled:opacity-40 ${hidden ? 'text-[#8B9096] hover:text-[#111315]' : 'text-[#1693C9] hover:text-[#1380AF]'}`}
                                    >
                                        {hidden ? 'Hidden' : 'Visible'}
                                    </button>
                                </div>

                                {/* Auto children (Featured/Past Transactions under Property Search) — informational, hideable. */}
                                {autoKids.map((kid) => (
                                    <div key={kid.key} className={`mt-1.5 pl-9 ${disabled.includes(kid.key) ? 'opacity-50' : ''}`}>
                                        <div className={rowCard}>
                                            <span className="w-4" aria-hidden />
                                            <NestArrow />
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#F3F4F6]">
                                                <PageIcon className="h-4 w-4 text-[#8B9096]" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[13px] font-medium text-[#5F656D]">{kid.label}</span>
                                                <span className="ml-2 text-[10px] text-[#A6ACB3]">{kid.note}</span>
                                            </div>
                                            {kid.toggleable && (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleVisible(kid.key)}
                                                    className={`h-7 px-2.5 text-[11px] font-medium rounded transition-colors ${disabled.includes(kid.key) ? 'text-[#8B9096] hover:text-[#111315]' : 'text-[#1693C9] hover:text-[#1380AF]'}`}
                                                >
                                                    {disabled.includes(kid.key) ? 'Hidden' : 'Visible'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Custom dropdown links — same card rows as nested pages. */}
                                {!parent && links.map((l, i) => (
                                    <div key={i} className="mt-1.5 pl-9">
                                        <div className={rowCard}>
                                            <span className="w-4" aria-hidden />
                                            <NestArrow />
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#EDE5FB]">
                                                <LinkIcon className="h-4 w-4 text-[#7C36EE]" />
                                            </span>
                                            <input type="text" value={l.label} onChange={(e) => updateLink(key, i, 'label', e.target.value)} placeholder="Label" className="h-8 w-44 rounded-[4px] border border-[#E4E7EB] px-2.5 text-[12px] font-medium text-[#111315] focus:border-[#1693C9] focus:ring-0" />
                                            <input type="text" value={l.url} onChange={(e) => updateLink(key, i, 'url', e.target.value)} placeholder="/page or https://…" className="h-8 flex-1 rounded-[4px] border border-[#E4E7EB] px-2.5 text-[12px] text-[#5F656D] focus:border-[#1693C9] focus:ring-0" />
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EDE5FB] text-[#7C36EE]">link</span>
                                            <button type="button" onClick={() => removeLink(key, i)} className="text-[#8B9096] hover:text-[#DC2626] p-1" aria-label="Remove link">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Dropdown builder — add a PAGE or a custom link under this item. */}
                                {open && !parent && (
                                    <div className="mt-1.5 pl-9">
                                        <div className="flex flex-wrap items-center gap-2 rounded-[4px] border border-dashed border-[#C8CCD1] bg-[#FAFBFC] px-3 py-2.5">
                                            {canParent(key) && nestable.length > 0 && (
                                                <select
                                                    value=""
                                                    onChange={(e) => { if (e.target.value) nestPage(key, e.target.value); }}
                                                    className="h-8 rounded-[4px] border border-[#C8CCD1] bg-white px-2 text-[12px] text-[#111315] focus:border-[#1693C9] focus:ring-0"
                                                >
                                                    <option value="">Add a page to this dropdown…</option>
                                                    {nestable.map((p) => (
                                                        <option key={p.key} value={p.key}>{p.label}</option>
                                                    ))}
                                                </select>
                                            )}
                                            <button type="button" onClick={() => addLink(key)} className="h-8 rounded-[4px] border border-[#C8CCD1] bg-white px-3 text-[12px] font-medium text-[#111315] hover:bg-[#F7F8F9] transition-colors">
                                                + Custom link
                                            </button>
                                            <span className="text-[11px] text-[#8B9096]">…or drag any page card onto this one.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Footer menu — its own drag-arrangeable list ── */}
            <div>
                <div className="mb-3">
                    <h4 className="text-sm font-semibold text-[#111315]">Footer Menu</h4>
                    <p className="text-[11px] text-[#8B9096] mt-0.5">
                        Add the pages shown in the footer and drag to arrange them — the footer keeps
                        this exact order. With no pages added the footer mirrors the header navigation.
                    </p>
                </div>
                <div className="space-y-1.5">
                    {footerMenu.map((key) => (
                        <div
                            key={key}
                            draggable
                            onDragStart={(e) => { setDragFooter(key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); }}
                            onDragOver={(e) => { e.preventDefault(); footerReorderTo(key); }}
                            onDragEnd={() => setDragFooter(null)}
                            onDrop={() => setDragFooter(null)}
                            className={`${rowCard} cursor-grab active:cursor-grabbing transition-colors hover:border-[#D1D5DB] ${dragFooter === key ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
                        >
                            <span className="text-[#C8CCD1]" aria-hidden>
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <circle cx="7" cy="5" r="1.3" /><circle cx="13" cy="5" r="1.3" />
                                    <circle cx="7" cy="10" r="1.3" /><circle cx="13" cy="10" r="1.3" />
                                    <circle cx="7" cy="15" r="1.3" /><circle cx="13" cy="15" r="1.3" />
                                </svg>
                            </span>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#E0F2FE]">
                                <PageIcon className="h-4 w-4 text-[#1693C9]" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#111315]">{labelFor(key)}</span>
                            <button type="button" onClick={() => toggleFooter(key)} className="p-1 text-[#8B9096] hover:text-[#DC2626]" aria-label={`Remove ${labelFor(key)} from footer`}>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}

                    {footerMenu.length === 0 && (
                        <div className="rounded-[4px] border border-dashed border-[#C8CCD1] bg-[#FAFBFC] px-3 py-3 text-[12px] text-[#8B9096]">
                            Mirroring the header navigation. Add pages to curate a custom footer menu.
                        </div>
                    )}

                    {rows.some(({ key }) => !footerMenu.includes(key)) && (
                        <select
                            value=""
                            onChange={(e) => { if (e.target.value) toggleFooter(e.target.value); }}
                            className="h-9 w-full rounded-[4px] border border-dashed border-[#C8CCD1] bg-[#FAFBFC] px-2 text-[12px] text-[#5F656D] focus:border-[#1693C9] focus:ring-0"
                        >
                            <option value="">+ Add a page to the footer…</option>
                            {rows.filter(({ key }) => !footerMenu.includes(key)).map(({ key }) => (
                                <option key={key} value={key}>{labelFor(key)}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            </div>
        </div>
    );
}
