import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { LpPageData } from '@/landing-pages/public/types';
import { blockIcon, blockLabel, seedBlock } from './blockSchema';
import BlockEditorModal from './components/BlockEditorModal';
import BlockPaletteModal from './components/BlockPaletteModal';
import SettingsModal, { PageSettings, PageConfig } from './components/SettingsModal';
import MediaPickerModal from './components/MediaPickerModal';
import DomainModal from './components/DomainModal';

interface Block {
    id: string;
    type: string;
    hidden?: boolean;
    data: Record<string, any>;
}

interface LandingPage {
    uuid: string;
    slug: string;
    name: string;
    type: string;
    template: string;
    accent_color: string;
    agent_name: string | null;
    agent_email: string | null;
    agent_phone: string | null;
    meta_title: string | null;
    meta_description: string | null;
    is_published: boolean;
    custom_domain: string | null;
    page_data: { blocks: Block[]; _config?: Record<string, any> };
}

interface Props {
    page: LandingPage;
    publicUrl: string;
}

export default function LandingPageEdit({ page, publicUrl }: Props) {
    const [blocks, setBlocks] = useState<Block[]>(page.page_data?.blocks ?? []);
    const [settings, setSettings] = useState<PageSettings>({
        name: page.name,
        accent_color: page.accent_color || '#1693C9',
        agent_name: page.agent_name ?? '',
        agent_email: page.agent_email ?? '',
        agent_phone: page.agent_phone ?? '',
        meta_title: page.meta_title ?? '',
        meta_description: page.meta_description ?? '',
    });
    const [config, setConfig] = useState<Record<string, any>>(page.page_data?._config ?? {});
    const [isPublished, setIsPublished] = useState(page.is_published);
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [mediaOpen, setMediaOpen] = useState(false);
    const [domainOpen, setDomainOpen] = useState(false);
    const [dragId, setDragId] = useState<string | null>(null);

    const editingBlock = blocks.find((b) => b.id === editingId) ?? null;

    // Minimal page context so the editor's image previews resolve through the same
    // shared resolver (img + imageCandidates) the public landing page uses — the
    // category drives which stock fallback an empty/broken image previews.
    const pageContext = useMemo(
        () =>
            ({
                assetBase: '/storage/',
                config,
                blocks,
                page: { name: settings.name, type: page.type, slug: page.slug },
            }) as unknown as LpPageData,
        [config, blocks, settings.name, page.type, page.slug],
    );

    /** Persist the whole page (blocks + settings + header config + publish state) in one PATCH. */
    const persist = (next: { blocks?: Block[]; settings?: PageSettings; config?: Record<string, any>; isPublished?: boolean }) => {
        const b = next.blocks ?? blocks;
        const s = next.settings ?? settings;
        const c = next.config ?? config;
        const pub = next.isPublished ?? isPublished;
        setStatus('saving');
        router.patch(
            route('crm.landing-pages.update', page.uuid),
            { ...s, is_published: pub, page_data: { blocks: b, _config: c } } as any,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setStatus('saved'),
                onError: () => setStatus('idle'),
            },
        );
    };

    const saveBlock = (data: Record<string, any>) => {
        const next = blocks.map((b) => (b.id === editingId ? { ...b, data } : b));
        setBlocks(next);
        setEditingId(null);
        persist({ blocks: next });
    };

    const addBlock = (type: string) => {
        const nb = seedBlock(type);
        const next = [...blocks, nb];
        setBlocks(next);
        setPaletteOpen(false);
        persist({ blocks: next });
        setEditingId(nb.id);
    };

    const deleteBlock = (id: string) => {
        const block = blocks.find((b) => b.id === id);
        if (!confirm(`Remove the "${blockLabel(block?.type ?? '')}" block?`)) return;
        const next = blocks.filter((b) => b.id !== id);
        setBlocks(next);
        persist({ blocks: next });
    };

    const toggleHidden = (id: string) => {
        const next = blocks.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b));
        setBlocks(next);
        persist({ blocks: next });
    };

    const reorderTo = (targetId: string) => {
        if (!dragId || dragId === targetId) return;
        const from = blocks.findIndex((b) => b.id === dragId);
        const to = blocks.findIndex((b) => b.id === targetId);
        if (from < 0 || to < 0) return;
        const next = [...blocks];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setBlocks(next);
    };

    /** Touch-friendly reorder (HTML5 drag doesn't fire on touch) — swap with the adjacent block. */
    const moveBlock = (index: number, dir: -1 | 1) => {
        const to = index + dir;
        if (to < 0 || to >= blocks.length) return;
        const next = [...blocks];
        [next[index], next[to]] = [next[to], next[index]];
        setBlocks(next);
        persist({ blocks: next });
    };

    const saveSettings = (s: PageSettings, c: PageConfig) => {
        const nextConfig = { ...config, logo: c.logo, webhook_url: c.webhook_url, font: c.font };
        setSettings(s);
        setConfig(nextConfig);
        setSettingsOpen(false);
        persist({ settings: s, config: nextConfig });
    };

    const togglePublish = () => {
        const np = !isPublished;
        setIsPublished(np);
        persist({ isPublished: np });
    };

    return (
        <CrmLayout>
            <Head title={`Edit — ${settings.name}`} />
            <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
                {/* Toolbar — compact on mobile (icon-only actions), scrolls rather than clipping. */}
                <div className="flex items-center gap-1.5 sm:gap-3 h-14 px-3 sm:px-5 border-b border-[#E4E7EB] bg-white shrink-0 overflow-x-auto">
                    <Link href={route('crm.landing-pages.index')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315]" title="Back to landing pages">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    </Link>
                    <div className="min-w-0 hidden sm:block">
                        <h1 className="text-[14px] font-semibold text-[#111315] truncate leading-tight">{settings.name || 'Untitled'}</h1>
                        <span className={`text-[11px] font-medium ${isPublished ? 'text-[#3f6d05]' : 'text-[#8B9096]'}`}>{isPublished ? 'Published' : 'Draft'}</span>
                    </div>

                    <div className="flex-1" />

                    <span className="shrink-0 text-[11px] text-[#8B9096] w-10 sm:w-16 text-right">
                        {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : ''}
                    </span>

                    <button type="button" onClick={() => setSettingsOpen(true)} title="Settings" className="h-8 px-2 sm:px-3 shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#111315] border border-[#C8CCD1] rounded-[4px] hover:bg-[#F3F4F6]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.241.437-.613.43-.992a7.723 7.723 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                    <button type="button" onClick={() => setMediaOpen(true)} title="Media" className="h-8 px-2 sm:px-3 shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#111315] border border-[#C8CCD1] rounded-[4px] hover:bg-[#F3F4F6]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
                        <span className="hidden sm:inline">Media</span>
                    </button>
                    <button type="button" onClick={() => setDomainOpen(true)} title="Domain" className="h-8 px-2 sm:px-3 shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#111315] border border-[#C8CCD1] rounded-[4px] hover:bg-[#F3F4F6]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a14.5 14.5 0 0 0 0-18m0 18a14.5 14.5 0 0 1 0-18M3 12h18" /></svg>
                        <span className="hidden sm:inline">Domain</span>
                    </button>
                    <button type="button" onClick={() => setPaletteOpen(true)} title="Add Block" className="h-8 px-2 sm:px-3 shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        <span className="hidden sm:inline">Add Block</span>
                    </button>
                    <button type="button" onClick={togglePublish} className="h-8 px-2 sm:px-3 shrink-0 text-[12px] font-medium text-[#111315] border border-[#C8CCD1] rounded-[4px] hover:bg-[#F3F4F6]">
                        {isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <a href={publicUrl} target="_blank" rel="noreferrer" title="View Page" className="shrink-0 text-[13px] font-semibold text-[#1693C9] hover:text-[#1380AF] inline-flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                        <span className="hidden sm:inline">View Page</span>
                    </a>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-y-auto bg-[#F7F8FB]">
                    <div className="max-w-[820px] mx-auto p-3 sm:p-6 space-y-2.5">
                        {blocks.length === 0 && (
                            <div className="text-center py-20 bg-white border border-dashed border-[#D5D9DE] rounded-[4px]">
                                <p className="text-[14px] font-semibold text-[#111315]">No blocks yet</p>
                                <p className="text-[13px] text-[#5F656D] mt-1">Add your first block to start building this page.</p>
                                <button type="button" onClick={() => setPaletteOpen(true)} className="mt-4 h-9 px-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF]">
                                    Add a Block
                                </button>
                            </div>
                        )}

                        {blocks.map((block, i) => (
                            <div
                                key={block.id}
                                draggable
                                onDragStart={() => setDragId(block.id)}
                                onDragOver={(e) => { e.preventDefault(); reorderTo(block.id); }}
                                onDragEnd={() => { setDragId(null); persist({ blocks }); }}
                                onDrop={() => { setDragId(null); persist({ blocks }); }}
                                className={`group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center ${dragId === block.id ? 'opacity-40 ring-1 ring-[#1693C9]' : ''} ${block.hidden ? 'opacity-60' : ''}`}
                            >
                                <span className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing" title="Drag to reorder">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm9-14a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
                                </span>
                                <span className="shrink-0 pl-2 flex items-center">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]" dangerouslySetInnerHTML={{ __html: blockIcon(block.type) }} />
                                </span>
                                <div className="flex-1 min-w-0 flex items-center gap-1 sm:gap-3 px-2 sm:px-4 py-3">
                                    <div className="min-w-0 flex-1 flex items-center gap-2">
                                        <p className="text-[13px] font-semibold text-[#111315] truncate">{blockLabel(block.type)}</p>
                                        <span className="text-[11px] text-[#C4C9D1]">#{i + 1}</span>
                                        {block.hidden && <span className="rounded bg-[#F1F3F5] px-1.5 py-0.5 text-[10px] font-medium text-[#8B9096]">Hidden</span>}
                                    </div>
                                    <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} title="Move up" className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:bg-[#F3F4F6] hover:text-[#111315] disabled:opacity-30 disabled:hover:bg-transparent">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                                    </button>
                                    <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} title="Move down" className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:bg-[#F3F4F6] hover:text-[#111315] disabled:opacity-30 disabled:hover:bg-transparent">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                                    </button>
                                    <button type="button" onClick={() => toggleHidden(block.id)} title={block.hidden ? 'Show block' : 'Hide block'} className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:bg-[#F3F4F6] hover:text-[#111315]">
                                        {block.hidden ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        ) : (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                        )}
                                    </button>
                                    <button type="button" onClick={() => setEditingId(block.id)} title="Edit" className="h-8 w-8 sm:w-auto px-0 sm:px-3 shrink-0 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF]">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                                        <span className="hidden sm:inline">Edit</span>
                                    </button>
                                    <button type="button" onClick={() => deleteBlock(block.id)} title="Delete" className="h-8 w-8 sm:w-auto px-0 sm:px-3 shrink-0 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-[#DC2626] border border-[#F0C2C2] rounded-[4px] hover:bg-[#FEF2F2]">
                                        <svg className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9M18.16 5.79 17.5 19.7a2.25 2.25 0 0 1-2.244 2.05H8.744A2.25 2.25 0 0 1 6.5 19.7L5.84 5.79M9.75 5.79V4.5A1.5 1.5 0 0 1 11.25 3h1.5a1.5 1.5 0 0 1 1.5 1.5v1.29" /></svg>
                                        <span className="hidden sm:inline">Delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {editingBlock && <BlockEditorModal block={editingBlock} pageUuid={page.uuid} pageContext={pageContext} onClose={() => setEditingId(null)} onSave={saveBlock} />}
            {paletteOpen && <BlockPaletteModal existingTypes={blocks.map((b) => b.type)} design={page.template} onSelect={addBlock} onClose={() => setPaletteOpen(false)} />}
            {settingsOpen && <SettingsModal settings={settings} config={{ logo: config.logo ?? '', webhook_url: config.webhook_url ?? '', font: config.font ?? '' }} pageUuid={page.uuid} template={page.template} onClose={() => setSettingsOpen(false)} onSave={saveSettings} />}
            {mediaOpen && <MediaPickerModal pageUuid={page.uuid} onClose={() => setMediaOpen(false)} />}
            {domainOpen && <DomainModal uuid={page.uuid} slug={page.slug} customDomain={page.custom_domain} onClose={() => setDomainOpen(false)} />}
        </CrmLayout>
    );
}
