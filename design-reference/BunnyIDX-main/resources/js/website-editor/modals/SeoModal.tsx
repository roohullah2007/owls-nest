import React, { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import AiButton from '../components/AiButton';
import { SiteData } from '../types';
import { api } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
}

type Tab = 'seo' | 'pages' | 'social';

/** Built-in public pages that accept their own meta title/description. */
const PAGE_SEO_OPTIONS: Array<{ key: string; label: string }> = [
    { key: 'home', label: 'Home' },
    { key: 'about', label: 'About' },
    { key: 'buy', label: 'Buy' },
    { key: 'sell', label: 'Sell' },
    { key: 'properties', label: 'Property Search' },
    { key: 'featured', label: 'Featured Properties' },
    { key: 'sold', label: 'Past Transactions' },
    { key: 'team', label: 'Team' },
    { key: 'condos', label: 'Condo Directory' },
    { key: 'new-developments', label: 'New Developments' },
    { key: 'home-valuation', label: 'Home Valuation' },
    { key: 'mortgage-calculator', label: 'Mortgage Calculator' },
    { key: 'market-trends', label: 'Market Trends' },
    { key: 'areas', label: 'Areas' },
    { key: 'blog', label: 'Blog' },
    { key: 'contact', label: 'Contact' },
];

export default function SeoModal({ open, onClose, site }: Props) {
    const [tab, setTab] = useState<Tab>('seo');
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const [metaTitle, setMetaTitle] = useState('');
    const [metaDesc, setMetaDesc] = useState('');
    const [ogTitle, setOgTitle] = useState('');
    const [ogDesc, setOgDesc] = useState('');
    const [ogImageUrl, setOgImageUrl] = useState<string | null>(null);
    const [ogUploading, setOgUploading] = useState(false);
    const ogInputRef = useRef<HTMLInputElement>(null);
    const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
    const [faviconUploading, setFaviconUploading] = useState(false);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    // Per-page overrides (page_data[page].meta_title / meta_description) —
    // rendered by every public layout; the site-level values are the fallback.
    const customPages = (((site.page_data as any)?._config?.custom_pages || []) as Array<{ slug?: string; title?: string }>)
        .filter((p) => p.slug)
        .map((p) => ({ key: p.slug as string, label: p.title || (p.slug as string) }));
    const pageOptions = [...PAGE_SEO_OPTIONS, ...customPages];
    const [pageKey, setPageKey] = useState('home');
    const [pageMeta, setPageMeta] = useState<Record<string, { title: string; desc: string }>>({});
    const [dirtyPages, setDirtyPages] = useState<string[]>([]);

    useEffect(() => {
        if (open) {
            setMetaTitle(site.meta_title || '');
            setMetaDesc(site.meta_description || '');
            setOgTitle(site.og_title || '');
            setOgDesc(site.og_description || '');
            setOgImageUrl(site.og_image ? `/storage/${site.og_image}` : null);
            setFaviconUrl(site.favicon ? `/storage/${site.favicon}` : null);
            const meta: Record<string, { title: string; desc: string }> = {};
            for (const { key } of pageOptions) {
                const pd = (site.page_data as any)?.[key] || {};
                meta[key] = { title: pd.meta_title || '', desc: pd.meta_description || '' };
            }
            setPageMeta(meta);
            setDirtyPages([]);
            setPageKey('home');
            setDirty(false);
            setTab('seo');
        }
    }, [open, site]); // eslint-disable-line react-hooks/exhaustive-deps

    const setPageField = (field: 'title' | 'desc', value: string) => {
        setPageMeta((m) => ({ ...m, [pageKey]: { ...m[pageKey], [field]: value } }));
        setDirtyPages((d) => (d.includes(pageKey) ? d : [...d, pageKey]));
        mark();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateSite(site.id, {
                meta_title: metaTitle,
                meta_description: metaDesc,
                og_title: ogTitle,
                og_description: ogDesc,
            });
            for (const p of dirtyPages) {
                await api.updatePageData(site.id, p, {
                    meta_title: pageMeta[p]?.title || null,
                    meta_description: pageMeta[p]?.desc || null,
                });
            }
            window.location.reload();
        } catch {
            setSaving(false);
        }
    };

    const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setOgUploading(true);
        try {
            const res = await api.uploadOgImage(site.id, file);
            if (res.url) setOgImageUrl(res.url);
        } catch {
            // silent
        } finally {
            setOgUploading(false);
            if (ogInputRef.current) ogInputRef.current.value = '';
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFaviconUploading(true);
        try {
            const res = await api.uploadFavicon(site.id, file);
            if (res.url) setFaviconUrl(res.url);
        } catch {
            // silent
        } finally {
            setFaviconUploading(false);
            if (faviconInputRef.current) faviconInputRef.current.value = '';
        }
    };

    const mark = () => setDirty(true);

    const tabs = (
        <div className="we-tabs">
            {([
                ['seo', 'Site SEO'],
                ['pages', 'Per-Page'],
                ['social', 'Social / OG'],
            ] as [Tab, string][]).map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    className={`we-tab${tab === key ? ' active' : ''}`}
                    onClick={() => setTab(key)}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="SEO Settings"
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
            {tab === 'seo' && (
                <>
                    <div className="we-field">
                        <div className="we-field-header">
                            <label className="we-label">Meta Title</label>
                            <span className="we-char-count">{metaTitle.length}/60</span>
                        </div>
                        <input
                            type="text"
                            className="we-input"
                            value={metaTitle}
                            onChange={(e) => { setMetaTitle(e.target.value); mark(); }}
                            maxLength={60}
                            placeholder="Page title for search engines"
                        />
                    </div>
                    <div className="we-field">
                        <div className="we-field-header">
                            <label className="we-label">Meta Description</label>
                            <span className="we-char-count">{metaDesc.length}/160</span>
                        </div>
                        <textarea
                            className="we-textarea"
                            value={metaDesc}
                            onChange={(e) => { setMetaDesc(e.target.value); mark(); }}
                            maxLength={160}
                            rows={3}
                            placeholder="Short description for search results"
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <AiButton
                            siteId={site.id}
                            field="meta_title"
                            currentValue={metaTitle}
                            onGenerated={(v) => {
                                setMetaTitle(v);
                                mark();
                                api.aiGenerate(site.id, 'meta_description', metaDesc).then((res) => {
                                    if (res.value) { setMetaDesc(res.value); mark(); }
                                }).catch(() => {});
                            }}
                        />
                    </div>
                    <div className="we-field" style={{ marginTop: 18 }}>
                        <label className="we-label">Favicon</label>
                        <p className="we-hint">Browser tab icon (max 1MB, .ico/.png/.svg)</p>
                        <div
                            className="we-uploader-zone we-uploader-small"
                            style={{ marginTop: 8 }}
                            onClick={() => faviconInputRef.current?.click()}
                        >
                            {faviconUrl ? (
                                <img src={faviconUrl} className="we-uploader-preview-small" alt="Favicon" />
                            ) : (
                                <div className="we-uploader-placeholder">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                    <span>Click to upload favicon</span>
                                </div>
                            )}
                            {faviconUploading && <div className="we-uploader-loading">Uploading...</div>}
                        </div>
                        <input ref={faviconInputRef} type="file" accept=".ico,.png,.svg,image/png,image/svg+xml,image/x-icon" hidden onChange={handleFaviconUpload} />
                    </div>
                </>
            )}

            {tab === 'pages' && (
                <>
                    <p className="we-hint" style={{ marginBottom: 12 }}>
                        Set a custom meta title &amp; description per page. Empty fields fall back to the site-level SEO settings.
                    </p>
                    <div className="we-field">
                        <label className="we-label">Page</label>
                        <select className="we-input" value={pageKey} onChange={(e) => setPageKey(e.target.value)}>
                            {pageOptions.map(({ key, label }) => (
                                <option key={key} value={key}>{label}{dirtyPages.includes(key) ? ' •' : ''}</option>
                            ))}
                        </select>
                    </div>
                    <div className="we-field">
                        <div className="we-field-header">
                            <label className="we-label">Meta Title</label>
                            <span className="we-char-count">{(pageMeta[pageKey]?.title || '').length}/60</span>
                        </div>
                        <input
                            type="text"
                            className="we-input"
                            value={pageMeta[pageKey]?.title || ''}
                            onChange={(e) => setPageField('title', e.target.value)}
                            maxLength={60}
                            placeholder={metaTitle || 'Falls back to site Meta Title'}
                        />
                    </div>
                    <div className="we-field">
                        <div className="we-field-header">
                            <label className="we-label">Meta Description</label>
                            <span className="we-char-count">{(pageMeta[pageKey]?.desc || '').length}/160</span>
                        </div>
                        <textarea
                            className="we-textarea"
                            value={pageMeta[pageKey]?.desc || ''}
                            onChange={(e) => setPageField('desc', e.target.value)}
                            maxLength={160}
                            rows={3}
                            placeholder={metaDesc || 'Falls back to site Meta Description'}
                        />
                    </div>
                </>
            )}

            {tab === 'social' && (
                <>
                    <div className="we-field">
                        <div className="we-field-header">
                            <label className="we-label">OG Title</label>
                        </div>
                        <input
                            type="text"
                            className="we-input"
                            value={ogTitle}
                            onChange={(e) => { setOgTitle(e.target.value); mark(); }}
                            placeholder={metaTitle || 'Falls back to Meta Title'}
                        />
                    </div>
                    <div className="we-field">
                        <div className="we-field-header">
                            <label className="we-label">OG Description</label>
                        </div>
                        <textarea
                            className="we-textarea"
                            value={ogDesc}
                            onChange={(e) => { setOgDesc(e.target.value); mark(); }}
                            rows={3}
                            placeholder={metaDesc || 'Falls back to Meta Description'}
                        />
                    </div>
                    <div className="we-field">
                        <label className="we-label">OG Image</label>
                        <p className="we-hint">Image shown when shared on social media (max 5MB)</p>
                        <div
                            className="we-uploader-zone"
                            style={{ marginTop: 8 }}
                            onClick={() => ogInputRef.current?.click()}
                        >
                            {ogImageUrl ? (
                                <img src={ogImageUrl} className="we-uploader-preview" alt="OG Image" />
                            ) : (
                                <div className="we-uploader-placeholder">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                    <span>Click to upload OG image</span>
                                    <span className="we-uploader-hint">Recommended: 1200x630px</span>
                                </div>
                            )}
                            {ogUploading && <div className="we-uploader-loading">Uploading...</div>}
                        </div>
                        <input ref={ogInputRef} type="file" accept="image/*" hidden onChange={handleOgImageUpload} />
                    </div>
                </>
            )}
        </Modal>
    );
}
