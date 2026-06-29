import React, { useState, useEffect, useCallback } from 'react';
import { AgentWebsite, TemplateConfig } from '../types';
import { useWebsiteForm } from '../hooks/useWebsiteForm';
import { useTestimonials } from '../hooks/useTestimonials';
import { ActiveSection, SECTION_TITLES, GENERAL_GROUP, IDX_GROUP, IDX_SUB_NAV_ITEMS, LISTINGS_GROUP, LISTINGS_SUB_NAV_ITEMS } from './editor/navConfig';
import EditorSidebar from './editor/EditorSidebar';
import GeneralSubSidebar from './editor/GeneralSubSidebar';
import GeneralSection from './editor/sections/GeneralSection';
import BrandingSection from './editor/sections/BrandingSection';
import SocialSection from './editor/sections/SocialSection';
import SeoSection from './editor/sections/SeoSection';
import DomainSection from './editor/sections/DomainSection';
import DeleteSection from './editor/sections/DeleteSection';
import DisplayContactsSection from './editor/sections/DisplayContactsSection';
import PropertySearchSection from './editor/sections/PropertySearchSection';
import CondoDirectorySection from './editor/sections/CondoDirectorySection';
import NewDevelopmentsSection from './editor/sections/NewDevelopmentsSection';
import TranslationsSection from './editor/sections/TranslationsSection';
import WebsiteListingsSection from './editor/sections/WebsiteListingsSection';
import TeamSection from './editor/sections/TeamSection';
import MenusSection from './editor/sections/MenusSection';
import BlogTab from './BlogTab';
import AreasTab from './AreasTab';
import MediaTab from './MediaTab';
import PagesTab from './PagesTab';
import PageBlockEditor from './PageBlockEditor';
import GoogleReviewsCard from './GoogleReviewsCard';
import { inputClass, textareaClass, labelClass } from '../constants';
import { SettingsPaneHeader, SettingsUpdateButton } from '@/Components/Crm/SettingsPane';
import SlideOverModal from '@/Components/Crm/SlideOverModal';

const FORM_SECTIONS: ActiveSection[] = ['general', 'branding', 'social', 'seo', 'contacts'];
const ALL_SECTIONS: ActiveSection[] = ['general', 'branding', 'social', 'contacts', 'domain', 'delete', 'pages', 'menus', 'idx-settings', 'idx-restrictions', 'idx-detail', 'idx-marketing', 'idx-leads', 'idx-css', 'website-listings', 'featured-listings', 'sold-listings', 'team', 'condo-directory', 'new-developments', 'translations', 'testimonials', 'blog', 'areas', 'media', 'seo'];

const BUILTIN_PAGE_LABELS: Record<string, string> = {
    home: 'Home', about: 'About', buy: 'Buy', sell: 'Sell', areas: 'Communities', blog: 'Blog', contact: 'Contact', 'home-valuation': 'Home Valuation', featured: 'Featured Properties', sold: 'Past Transactions',
};

// Best-effort label for a page slug (PageBlockEditor refines it from fetched data).
function pageLabelFor(slug: string): string {
    return BUILTIN_PAGE_LABELS[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EditView({ website, templates, initialSection, initialEditingPage, initialBlogPostId }: { website: AgentWebsite; templates: Record<string, TemplateConfig>; initialSection?: string; initialEditingPage?: string; initialBlogPostId?: number }) {
    const [activeSection, setActiveSection] = useState<ActiveSection>(
        (ALL_SECTIONS.includes(initialSection as ActiveSection) ? (initialSection as ActiveSection) : 'general'),
    );
    const { form, isDirty, handleSubmit } = useWebsiteForm(website);
    const testimonials = useTestimonials(website.testimonials);

    // Each tab is its own URL: /crm/websites/{uuid}/{section}. The block editor
    // deep-links further: /crm/websites/{uuid}/pages/{page}. Switch via pushState
    // (instant, keeps form state) and sync on browser back/forward.
    const [editingPage, setEditingPage] = useState<{ slug: string; label: string } | null>(
        initialEditingPage ? { slug: initialEditingPage, label: pageLabelFor(initialEditingPage) } : null,
    );
    // Some content tabs (Blog, Areas, Pages) provide their own primary action.
    const [sectionAction, setSectionAction] = useState<{ label: string; onClick: () => void; secondary?: { label: string; onClick: () => void } } | null>(null);

    const navigate = useCallback((section: ActiveSection) => {
        // Clear cross-tab transient state synchronously here (not in an effect)
        // so the incoming tab's own effect can re-assign without being clobbered.
        setSectionAction(null);
        setEditingPage(null);
        setActiveSection(section);
        window.history.pushState({}, '', route('crm.websites.edit', { agentWebsite: website.uuid, section }));
    }, [website.uuid]);

    const openPageEditor = useCallback((slug: string, label: string) => {
        setEditingPage({ slug, label });
        window.history.pushState({}, '', route('crm.websites.edit-page', { agentWebsite: website.uuid, page: slug }));
    }, [website.uuid]);

    const closePageEditor = useCallback(() => {
        setEditingPage(null);
        window.history.pushState({}, '', route('crm.websites.edit', { agentWebsite: website.uuid, section: 'pages' }));
    }, [website.uuid]);

    useEffect(() => {
        function onPop() {
            const parts = window.location.pathname.split('/').filter(Boolean);
            const last = parts[parts.length - 1];
            const prev = parts[parts.length - 2];
            setSectionAction(null);
            if (prev === 'pages' && last !== 'pages') {
                // Deep link into the block editor: /…/pages/{page}
                setActiveSection('pages');
                setEditingPage({ slug: last, label: pageLabelFor(last) });
            } else if (prev === 'blog' && /^\d+$/.test(last)) {
                // Deep link into the blog post editor: /…/blog/{post} — BlogTab
                // listens for popstate itself and opens/closes the right post.
                setEditingPage(null);
                setActiveSection('blog');
            } else {
                setEditingPage(null);
                setActiveSection(ALL_SECTIONS.includes(last as ActiveSection) ? (last as ActiveSection) : 'general');
            }
        }
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    const isFormSection = FORM_SECTIONS.includes(activeSection);
    const showSave = isFormSection;
    const isGeneralGroup = GENERAL_GROUP.includes(activeSection);
    const isIdxGroup = IDX_GROUP.includes(activeSection);
    const isListingsGroup = LISTINGS_GROUP.includes(activeSection);

    function handleSave() {
        if (isFormSection) handleSubmit();
    }

    const saveDisabled = isFormSection ? form.processing || !isDirty : false;
    const saving = form.processing && isFormSection;

    // Per-tab header actions (reuses the Settings "Update" button). The General
    // tab also carries the publish toggle.
    const headerActions = (
        <div className="flex items-center gap-3">
            {activeSection === 'general' && (
                <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#5F656D]">{form.data.is_published ? 'Published' : 'Draft'}</span>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={form.data.is_published}
                        onClick={() => form.setData('is_published', !form.data.is_published)}
                        className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors ${form.data.is_published ? 'bg-[#1693C9]' : 'bg-[#C8CCD1]'}`}
                    >
                        <span className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow transition-transform ${form.data.is_published ? 'translate-x-[19px]' : 'translate-x-[2px]'}`} />
                    </button>
                </div>
            )}
            {showSave && (
                <SettingsUpdateButton type="button" onClick={handleSave} disabled={saveDisabled} label={saving ? 'Saving…' : 'Update'} />
            )}
            {!showSave && sectionAction?.secondary && (
                <button
                    type="button"
                    onClick={sectionAction.secondary.onClick}
                    className="h-9 px-4 inline-flex items-center gap-1.5 border border-[#C8CCD1] bg-white text-[#111315] text-[13px] font-medium rounded hover:bg-[#F7F8F9] transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    {sectionAction.secondary.label}
                </button>
            )}
            {!showSave && sectionAction && (
                <button
                    type="button"
                    onClick={sectionAction.onClick}
                    className="h-9 px-5 bg-[#1693C9] text-white text-[13px] font-medium rounded hover:bg-[#1380AF] transition-colors"
                >
                    {sectionAction.label}
                </button>
            )}
        </div>
    );

    // The block editor is its own full-bleed page (own left palette + canvas).
    if (editingPage) {
        return (
            <PageBlockEditor
                websiteId={website.id}
                page={editingPage.slug}
                pageLabel={editingPage.label}
                onBack={closePageEditor}
            />
        );
    }

    return (
        <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
            <EditorSidebar website={website} activeSection={activeSection} onNavigate={navigate} />

            <main className="flex-1 flex min-w-0 bg-[#F7F8FB]">
                {isGeneralGroup && (
                    <GeneralSubSidebar website={website} active={activeSection} onSelect={navigate} />
                )}
                {isIdxGroup && (
                    <GeneralSubSidebar website={website} active={activeSection} onSelect={navigate} items={IDX_SUB_NAV_ITEMS} />
                )}
                {isListingsGroup && (
                    <GeneralSubSidebar website={website} active={activeSection} onSelect={navigate} items={LISTINGS_SUB_NAV_ITEMS} />
                )}

                <div className="flex-1 overflow-y-auto min-w-0">
                    <div className="p-5 sm:p-6 lg:p-8 w-full">
                        <SettingsPaneHeader title={SECTION_TITLES[activeSection]} actions={headerActions} />

                        {activeSection === 'general' && (
                            <GeneralSection
                                data={form.data}
                                setData={form.setData}
                                errors={form.errors}
                                website={website}
                            />
                        )}

                        {activeSection === 'branding' && (
                            <BrandingSection data={form.data} setData={form.setData} website={website} templates={templates} />
                        )}

                        {activeSection === 'social' && (
                            <SocialSection data={form.data} setData={form.setData} />
                        )}

                        {activeSection === 'contacts' && (
                            <DisplayContactsSection data={form.data} setData={form.setData} />
                        )}

                        {activeSection === 'domain' && <DomainSection website={website} />}

                        {activeSection === 'delete' && <DeleteSection website={website} />}

                        {IDX_GROUP.includes(activeSection) && (
                            <PropertySearchSection
                                website={website}
                                onActionChange={setSectionAction}
                                tab={activeSection === 'idx-settings' ? 'design'
                                    : activeSection === 'idx-restrictions' ? 'restrictions'
                                    : activeSection === 'idx-detail' ? 'detail'
                                    : activeSection === 'idx-marketing' ? 'marketing'
                                    : activeSection === 'idx-leads' ? 'leads'
                                    : 'css'}
                            />
                        )}

                        {activeSection === 'pages' && (
                            <PagesTab
                                websiteId={website.id}
                                onActionChange={setSectionAction}
                                onEditPage={openPageEditor}
                            />
                        )}

                        {activeSection === 'menus' && <MenusSection websiteId={website.id} onActionChange={setSectionAction} />}

                        {/* 'website-listings' is the old combined tab's deep-link alias → Featured. */}
                        {(activeSection === 'featured-listings' || activeSection === 'website-listings') && (
                            <WebsiteListingsSection website={website} section="featured" onActionChange={setSectionAction} />
                        )}
                        {activeSection === 'sold-listings' && (
                            <WebsiteListingsSection website={website} section="sold" onActionChange={setSectionAction} />
                        )}

                        {activeSection === 'team' && <TeamSection website={website} onActionChange={setSectionAction} />}

                        {activeSection === 'testimonials' && (
                            <TestimonialsView testimonials={testimonials} website={website} onActionChange={setSectionAction} />
                        )}

                        {activeSection === 'blog' && <BlogTab websiteId={website.id} websiteUuid={website.uuid} initialPostId={initialBlogPostId} onActionChange={setSectionAction} />}

                        {activeSection === 'areas' && <AreasTab websiteId={website.id} onActionChange={setSectionAction} />}

                        {activeSection === 'condo-directory' && <CondoDirectorySection website={website} onActionChange={setSectionAction} />}

                        {activeSection === 'new-developments' && <NewDevelopmentsSection website={website} onActionChange={setSectionAction} />}

                        {activeSection === 'translations' && <TranslationsSection website={website} />}

                        {activeSection === 'media' && <MediaTab websiteId={website.id} onActionChange={setSectionAction} />}

                        {activeSection === 'seo' && (
                            <SeoSection data={form.data} setData={form.setData} website={website} websiteId={website.id} />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

/** Testimonials tab — Pages-style card list; quote/name/role edited in a slide-over. */
function TestimonialsView({ testimonials, website, onActionChange }: {
    testimonials: ReturnType<typeof useTestimonials>;
    website: AgentWebsite;
    onActionChange: (action: { label: string; onClick: () => void } | null) => void;
}) {
    const { items, setItems, saving, save } = testimonials;
    const websiteId = website.id;
    // Index being edited; -1 = creating a new one; null = closed.
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [draft, setDraft] = useState<{ text: string; name: string; role: string; rating?: number | null }>({ text: '', name: '', role: '', rating: null });

    useEffect(() => {
        onActionChange({ label: '+ Add Testimonial', onClick: () => { setDraft({ text: '', name: '', role: '', rating: null }); setEditingIdx(-1); } });
        return () => onActionChange(null);
    }, [onActionChange]);

    function openEdit(idx: number) {
        setDraft({ ...items[idx] });
        setEditingIdx(idx);
    }

    async function saveDraft() {
        const next = editingIdx === -1
            ? [...items, draft]
            : items.map((t, i) => (i === editingIdx ? { ...draft } : t));
        setItems(next);
        setEditingIdx(null);
        await save(websiteId, next);
    }

    async function removeAt(idx: number) {
        if (!confirm('Delete this testimonial?')) return;
        const next = items.filter((_, i) => i !== idx);
        setItems(next);
        await save(websiteId, next);
    }

    const modalFooter = (
        <>
            <button type="button" onClick={() => setEditingIdx(null)} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">Cancel</button>
            <button type="button" onClick={saveDraft} disabled={saving || !draft.text.trim() || !draft.name.trim()} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                {saving ? 'Saving…' : 'Save'}
            </button>
        </>
    );

    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <div className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] p-12 text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#E0F2FE] mb-3">
                        <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
                    </div>
                    <h4 className="text-sm font-semibold text-[#111315] mb-1">No testimonials yet</h4>
                    <p className="text-[12px] text-[#5F656D] mb-4">Add your first client testimonial to display on your website.</p>
                    <button type="button" onClick={() => { setDraft({ text: '', name: '', role: '', rating: null }); setEditingIdx(-1); }} className="h-8 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded-[4px] hover:bg-[#1380AF] transition-colors">
                        Add First Testimonial
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {items.map((t, idx) => (
                        <div
                            key={idx}
                            className="group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center"
                        >
                            <button type="button" onClick={() => openEdit(idx)} className="shrink-0 pl-3 flex items-center" aria-label={`Edit testimonial from ${t.name}`}>
                                <span className="h-10 w-10 rounded-[4px] bg-[#E0F2FE] flex items-center justify-center">
                                    <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
                                </span>
                            </button>

                            <div className="flex-1 min-w-0 flex items-center gap-4 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                    <button type="button" onClick={() => openEdit(idx)} className="block max-w-full text-left">
                                        <span className="inline-flex items-center gap-2 max-w-full">
                                            <span className="text-[15px] font-semibold text-[#111315] truncate hover:text-[#1693C9] transition-colors">{t.name || 'Untitled'}</span>
                                            {t.role && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#F3F4F6] text-[#5F656D] shrink-0">{t.role}</span>}
                                            {t.rating != null && t.rating > 0 && (
                                                <span className="inline-flex items-center gap-0.5 shrink-0" title={`${t.rating} of 5 stars`}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <svg key={star} className="h-3 w-3" viewBox="0 0 24 24" fill={(t.rating ?? 0) >= star ? '#F59E0B' : '#E4E7EB'}><path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
                                                    ))}
                                                </span>
                                            )}
                                            {t.source === 'google' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#E8F0FE] text-[#1A73E8] shrink-0">Google</span>}
                                        </span>
                                    </button>
                                    <p className="text-[11px] text-[#8B9096] truncate mt-0.5">&ldquo;{t.text}&rdquo;</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openEdit(idx)}
                                    className="h-8 px-3.5 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors flex items-center gap-1.5 shrink-0"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeAt(idx)}
                                    disabled={saving}
                                    className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#F0C2C2] rounded-[4px] hover:bg-[#FEF2F2] transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-30"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingIdx !== null && (
                <SlideOverModal title={editingIdx === -1 ? 'Add Testimonial' : 'Edit Testimonial'} onClose={() => setEditingIdx(null)} footer={modalFooter} width={440}>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                        <div>
                            <label className={labelClass}>Quote *</label>
                            <textarea value={draft.text} onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))} className={textareaClass} rows={4} placeholder="What did the client say?" autoFocus />
                        </div>
                        <div>
                            <label className={labelClass}>Client Name *</label>
                            <input type="text" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={inputClass} placeholder="John Smith" />
                        </div>
                        <div>
                            <label className={labelClass}>Role / Title</label>
                            <input type="text" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} className={inputClass} placeholder="Home Buyer" />
                        </div>
                        <div>
                            <label className={labelClass}>Rating (optional)</label>
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} type="button" aria-label={`${star} star${star > 1 ? 's' : ''}`} onClick={() => setDraft((d) => ({ ...d, rating: d.rating === star ? null : star }))} className="p-0.5">
                                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill={(draft.rating ?? 0) >= star ? '#F59E0B' : 'none'} stroke={(draft.rating ?? 0) >= star ? '#F59E0B' : '#C8CCD1'} strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
                                    </button>
                                ))}
                                {draft.rating != null && <button type="button" onClick={() => setDraft((d) => ({ ...d, rating: null }))} className="ml-2 text-[11px] text-[#8B9096] hover:text-[#111315]">Clear</button>}
                            </div>
                        </div>
                    </div>
                </SlideOverModal>
            )}
        </div>
    );
}
