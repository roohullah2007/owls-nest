import React, { useState, useEffect, useRef } from 'react';
import { SiteData, SectionConfig, BlockData } from './types';
import { TEMPLATE_CONFIGS } from './template-config';
import { BLOCK_DEFINITIONS } from './block-definitions';
import { api } from './api';
import SeoModal from './modals/SeoModal';
import SectionModal from './modals/SectionModal';
import BlockPickerModal from './modals/BlockPickerModal';
import BlockModal from './modals/BlockModal';
import TrackingModal from './modals/TrackingModal';
import CrawlersModal from './modals/CrawlersModal';
import SearchDesignModal from './modals/SearchDesignModal';
import HeroModal from './modals/HeroModal';
import TestimonialsModal from './modals/TestimonialsModal';

interface Props {
    site: SiteData;
    currentPage: string;
}

type ModalName = 'seo' | 'tracking' | 'crawlers' | 'search-design' | 'hero' | 'testimonials' | 'section' | 'block-picker' | 'block-edit' | null;

function generateBlockId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'b_';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

export default function EditorBar({ site, currentPage }: Props) {
    const [activeModal, setActiveModal] = useState<ModalName>(null);
    const [activeSection, setActiveSection] = useState<SectionConfig | null>(null);
    const [activeBlock, setActiveBlock] = useState<BlockData | null>(null);
    const [insertPosition, setInsertPosition] = useState(0);
    const [insertSlot, setInsertSlot] = useState('default');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const pageData = site.page_data?.[currentPage];
    const blocks: BlockData[] = (pageData?.blocks as BlockData[]) || [];

    // Restore scroll position after reload
    useEffect(() => {
        const savedScroll = sessionStorage.getItem('we-scroll');
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll));
            sessionStorage.removeItem('we-scroll');
        }
    }, []);

    // Close menu on outside click
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    // Listen for section/block edit events from blade overlays
    useEffect(() => {
        const sectionHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail?.section) return;

            // Route hero to dedicated modal
            if (detail.section === 'hero') {
                setActiveModal('hero');
                return;
            }

            // Route testimonials to dedicated modal
            if (detail.section === 'testimonials') {
                setActiveModal('testimonials');
                return;
            }

            const templateConfig = TEMPLATE_CONFIGS[site.template];
            if (!templateConfig) return;

            const pageConfig = templateConfig[currentPage];
            if (!pageConfig) return;

            const section = pageConfig.sections.find(s => s.id === detail.section);
            if (section) {
                setActiveSection(section);
                setActiveModal('section');
            }
        };

        const addBlockHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            setInsertPosition(detail?.position ?? 0);
            setInsertSlot(detail?.slot ?? 'default');
            setActiveModal('block-picker');
        };

        const editBlockHandler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (!detail?.blockId) return;
            const block = blocks.find(b => b.id === detail.blockId);
            if (block) {
                setActiveBlock(block);
                setActiveModal('block-edit');
            }
        };

        window.addEventListener('we:edit-section', sectionHandler);
        window.addEventListener('we:add-block', addBlockHandler);
        window.addEventListener('we:edit-block', editBlockHandler);
        return () => {
            window.removeEventListener('we:edit-section', sectionHandler);
            window.removeEventListener('we:add-block', addBlockHandler);
            window.removeEventListener('we:edit-block', editBlockHandler);
        };
    }, [site.template, currentPage, blocks]);

    async function handleBlockTypeSelected(type: string) {
        const def = BLOCK_DEFINITIONS.find(d => d.type === type);
        if (!def) return;

        setActiveModal(null);

        const blockId = generateBlockId();
        const defaultData: Record<string, string> = {};
        def.fields.forEach(f => {
            if (f.type !== 'image') defaultData[f.key] = '';
        });

        try {
            await api.addBlock(site.id, currentPage, blockId, type, insertPosition, defaultData, insertSlot);
            sessionStorage.setItem('we-scroll', String(window.scrollY));
            window.location.reload();
        } catch (err) {
            console.error('Failed to add block:', err);
            alert('Failed to add block. Please try again.');
        }
    }

    function openModal(modal: ModalName) {
        setMenuOpen(false);
        setActiveModal(modal);
    }

    const pageLabel = TEMPLATE_CONFIGS[site.template]?.[currentPage]?.label || currentPage;

    return (
        <>
            <div className="we-bar">
                <div className="we-bar-inner">
                    <div className="we-bar-left">
                        <div className="we-dropdown" ref={menuRef}>
                            <button
                                type="button"
                                className="we-bar-menu-btn"
                                onClick={() => setMenuOpen(!menuOpen)}
                                aria-label="Site settings"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </button>
                            {menuOpen && (
                                <div className="we-dropdown-menu we-settings-menu">
                                    <button type="button" onClick={() => openModal('seo')}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                        SEO Settings
                                    </button>
                                    <button type="button" onClick={() => openModal('tracking')}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"/></svg>
                                        Tracking Scripts
                                    </button>
                                    <button type="button" onClick={() => openModal('search-design')}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"/></svg>
                                        Search Design
                                    </button>
                                    <button type="button" onClick={() => openModal('crawlers')}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
                                        Crawlers
                                    </button>
                                    <div className="we-menu-divider"></div>
                                    <a href="/crm/websites" className="we-menu-link">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>
                                        Back to Dashboard
                                    </a>
                                </div>
                            )}
                        </div>
                        <span className="we-bar-label">
                            Editing: <strong>{site.agent_name}</strong>
                            <span className="we-bar-page-badge">{pageLabel}</span>
                        </span>
                    </div>

                    <div className="we-bar-center"></div>

                    <div className="we-bar-right"></div>
                </div>
            </div>

            <HeroModal open={activeModal === 'hero'} onClose={() => setActiveModal(null)} site={site} />
            <TestimonialsModal open={activeModal === 'testimonials'} onClose={() => setActiveModal(null)} site={site} />
            <SeoModal open={activeModal === 'seo'} onClose={() => setActiveModal(null)} site={site} />
            <TrackingModal open={activeModal === 'tracking'} onClose={() => setActiveModal(null)} site={site} />
            <CrawlersModal open={activeModal === 'crawlers'} onClose={() => setActiveModal(null)} site={site} />
            <SearchDesignModal open={activeModal === 'search-design'} onClose={() => setActiveModal(null)} site={site} />
            <SectionModal
                open={activeModal === 'section'}
                onClose={() => { setActiveModal(null); setActiveSection(null); }}
                site={site}
                section={activeSection}
                currentPage={currentPage}
            />
            <BlockPickerModal
                open={activeModal === 'block-picker'}
                onClose={() => setActiveModal(null)}
                onSelect={handleBlockTypeSelected}
            />
            <BlockModal
                open={activeModal === 'block-edit'}
                onClose={() => { setActiveModal(null); setActiveBlock(null); }}
                site={site}
                block={activeBlock}
                currentPage={currentPage}
            />
        </>
    );
}
