import React, { useRef, useState } from 'react';
import { AgentWebsite, WebsiteFormData, FormSetData } from '../../../types';
import { inputClass, textareaClass, cardClass } from '../../../constants';
import AiFieldButton from '../../AiFieldButton';
import { sectionHeading } from '../navConfig';
import { api } from '@/website-editor/api';

interface Props {
    data: WebsiteFormData;
    setData: FormSetData;
    website: AgentWebsite;
    websiteId: number;
}

const ID_PATTERNS: Record<string, { regex: RegExp; message: string }> = {
    ga4_id: { regex: /^G-[A-Z0-9]{4,}$/i, message: 'GA4 Measurement IDs look like G-XXXXXXXXXX.' },
    gtm_id: { regex: /^GTM-[A-Z0-9]{4,}$/i, message: 'GTM Container IDs look like GTM-XXXXXXX.' },
    fb_pixel_id: { regex: /^\d{5,20}$/, message: 'Meta Pixel IDs are numbers only (5–20 digits).' },
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Per-card save button with inline status text. */
function CardSave({ state, error, onClick }: { state: SaveState; error: string | null; onClick: () => void }) {
    return (
        <div className="flex items-center justify-end gap-3 pt-1">
            {state === 'saved' && <span className="text-[11px] text-[#63A205]">Saved</span>}
            {state === 'error' && <span className="text-[11px] text-[#DC2626]">{error || 'Could not save. Check the values and try again.'}</span>}
            <button
                type="button"
                onClick={onClick}
                disabled={state === 'saving'}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {state === 'saving' ? 'Saving…' : 'Save'}
            </button>
        </div>
    );
}

/** Small image upload tile (favicon / OG image) backed by the website-editor API. */
function ImageUploadTile({ label, sublabel, url, onPick, uploading, tall }: {
    label: string;
    sublabel: string;
    url: string | null;
    onPick: (file: File) => void;
    uploading: boolean;
    tall?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#374151] mb-1.5">{label}</p>
            <div
                onClick={() => !uploading && inputRef.current?.click()}
                className={`border border-[#E4E7EB] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#8B9096] hover:shadow-sm transition-all overflow-hidden bg-[#F9FAFB] ${tall ? 'h-28' : 'h-16'}`}
            >
                {uploading ? (
                    <span className="text-[11px] text-[#8B9096]">Uploading…</span>
                ) : url ? (
                    <img src={url} className="max-h-full max-w-full object-contain p-2" alt="" />
                ) : (
                    <span className="text-[11px] text-[#9CA3AF]">Upload</span>
                )}
            </div>
            <p className="text-[10px] text-[#8B9096] mt-1.5">{sublabel}</p>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
            />
        </div>
    );
}

export default function SeoSection({ data, setData, website, websiteId }: Props) {
    const siteUrl = `${window.location.origin}/site/${website.slug}`;

    // ── Social sharing (Open Graph) — saved via the website-editor API ──
    const [ogTitle, setOgTitle] = useState(website.og_title || '');
    const [ogDescription, setOgDescription] = useState(website.og_description || '');
    const [ogImageUrl, setOgImageUrl] = useState(website.og_image ? `/storage/${website.og_image}` : null);
    const [faviconUrl, setFaviconUrl] = useState(website.favicon ? `/storage/${website.favicon}` : null);
    const [uploadingOg, setUploadingOg] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const [ogState, setOgState] = useState<SaveState>('idle');
    const [ogError, setOgError] = useState<string | null>(null);

    // ── Tracking — structured IDs (page_data._config.tracking) + raw snippets ──
    const tracking = (website.page_data?._config?.tracking || {}) as Record<string, string | null>;
    const [ga4Id, setGa4Id] = useState(tracking.ga4_id || '');
    const [gtmId, setGtmId] = useState(tracking.gtm_id || '');
    const [fbPixelId, setFbPixelId] = useState(tracking.fb_pixel_id || '');
    const [trackingHead, setTrackingHead] = useState(website.tracking_head || '');
    const [trackingBody, setTrackingBody] = useState(website.tracking_body || '');
    const [trackingState, setTrackingState] = useState<SaveState>('idle');
    const [trackingError, setTrackingError] = useState<string | null>(null);

    // ── Crawler files (robots.txt / llms.txt columns) ──
    const [robotsTxt, setRobotsTxt] = useState(website.robots_txt || '');
    const [llmsTxt, setLlmsTxt] = useState(website.llms_txt || '');
    const [crawlerState, setCrawlerState] = useState<SaveState>('idle');
    const [crawlerError, setCrawlerError] = useState<string | null>(null);

    function firstApiError(err: unknown): string | null {
        const e = err as { errors?: Record<string, string[]>; message?: string };
        if (e?.errors) {
            const first = Object.values(e.errors)[0];
            if (first?.length) return first[0];
        }
        return e?.message || null;
    }

    async function saveOg() {
        setOgState('saving');
        setOgError(null);
        try {
            await api.updateSite(websiteId, { og_title: ogTitle.trim() || null, og_description: ogDescription.trim() || null });
            setOgState('saved');
        } catch (err) {
            setOgError(firstApiError(err));
            setOgState('error');
        }
    }

    async function uploadOg(file: File) {
        setUploadingOg(true);
        try {
            const res = await api.uploadOgImage(websiteId, file) as { url?: string };
            if (res.url) setOgImageUrl(res.url);
        } catch (err) {
            setOgError(firstApiError(err) || 'Image upload failed.');
            setOgState('error');
        } finally {
            setUploadingOg(false);
        }
    }

    async function uploadFavicon(file: File) {
        setUploadingFavicon(true);
        try {
            const res = await api.uploadFavicon(websiteId, file) as { url?: string };
            if (res.url) setFaviconUrl(res.url);
        } catch (err) {
            setOgError(firstApiError(err) || 'Favicon upload failed.');
            setOgState('error');
        } finally {
            setUploadingFavicon(false);
        }
    }

    async function saveTracking() {
        // Client-side sanity check so users get a friendly message before the
        // server's strict validation rejects the value.
        for (const [key, value] of [['ga4_id', ga4Id], ['gtm_id', gtmId], ['fb_pixel_id', fbPixelId]] as const) {
            const trimmed = value.trim();
            if (trimmed && !ID_PATTERNS[key].regex.test(trimmed)) {
                setTrackingError(ID_PATTERNS[key].message);
                setTrackingState('error');
                return;
            }
        }
        setTrackingState('saving');
        setTrackingError(null);
        try {
            await api.updateTrackingConfig(websiteId, {
                ga4_id: ga4Id.trim() || null,
                gtm_id: gtmId.trim() || null,
                fb_pixel_id: fbPixelId.trim() || null,
            });
            await api.updateSite(websiteId, {
                tracking_head: trackingHead.trim() || null,
                tracking_body: trackingBody.trim() || null,
            });
            setTrackingState('saved');
        } catch (err) {
            setTrackingError(firstApiError(err));
            setTrackingState('error');
        }
    }

    async function saveCrawlers() {
        setCrawlerState('saving');
        setCrawlerError(null);
        try {
            await api.updateSite(websiteId, { robots_txt: robotsTxt.trim() || null, llms_txt: llmsTxt.trim() || null });
            setCrawlerState('saved');
        } catch (err) {
            setCrawlerError(firstApiError(err));
            setCrawlerState('error');
        }
    }

    return (
        <div className="space-y-6">
            {/* Site-wide meta — saved with the page's Update button (useWebsiteForm) */}
            <div className={`${cardClass} p-6 space-y-5`}>
                <div>
                    <div className="flex items-center mb-1.5">
                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Meta Title</label>
                        <AiFieldButton field="meta_title" websiteId={websiteId} currentValue={data.meta_title} onResult={(v) => setData('meta_title', v)} />
                    </div>
                    <input type="text" value={data.meta_title} onChange={(e) => setData('meta_title', e.target.value)} className={inputClass} placeholder="Agent Name | San Diego Real Estate" />
                    <p className="mt-1.5 text-[11px] text-[#8B9096]">{data.meta_title.length}/60 characters recommended</p>
                </div>
                <div>
                    <div className="flex items-center mb-1.5">
                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Meta Description</label>
                        <AiFieldButton field="meta_description" websiteId={websiteId} currentValue={data.meta_description} onResult={(v) => setData('meta_description', v)} />
                    </div>
                    <textarea value={data.meta_description} onChange={(e) => setData('meta_description', e.target.value)} rows={3} className={textareaClass} placeholder="Search for homes in San Diego with a trusted local realtor..." />
                    <p className="mt-1.5 text-[11px] text-[#8B9096]">{data.meta_description.length}/160 characters recommended</p>
                </div>
                <p className="text-[11px] text-[#8B9096]">
                    These are the site-wide defaults — every page can override them from Pages → Edit → SEO.
                    Saved with the Update button above.
                </p>
            </div>

            <div className={`${cardClass} p-6 space-y-3`}>
                <p className={sectionHeading}>Search Preview</p>
                <div className="border border-[#E4E7EB] rounded-lg p-4 bg-white">
                    <p className="text-[11px] text-[#111315] truncate">{siteUrl}</p>
                    <p className="text-[16px] text-[#111315] font-medium mt-0.5 truncate">{data.meta_title || `${website.agent_name} | Real Estate`}</p>
                    <p className="text-[13px] text-[#545454] mt-1 line-clamp-2">{data.meta_description || 'No description set. Add a meta description to improve how your site appears in search results.'}</p>
                </div>
            </div>

            {/* Social sharing (Open Graph) + favicon */}
            <div className={`${cardClass} p-6 space-y-5`}>
                <div>
                    <p className={sectionHeading}>Social Sharing & Favicon</p>
                    <p className="mt-1 text-[11px] text-[#8B9096]">How your site appears when shared on Facebook, LinkedIn, iMessage, etc. Blank fields fall back to the meta title/description above.</p>
                </div>
                <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Share Title</label>
                    <input type="text" value={ogTitle} onChange={(e) => { setOgTitle(e.target.value); setOgState('idle'); }} className={inputClass} placeholder={data.meta_title || 'Defaults to the meta title'} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Share Description</label>
                    <textarea value={ogDescription} onChange={(e) => { setOgDescription(e.target.value); setOgState('idle'); }} rows={2} className={textareaClass} placeholder={data.meta_description || 'Defaults to the meta description'} />
                </div>
                <div className="flex gap-5">
                    <ImageUploadTile
                        label="Share Image"
                        sublabel="1200×630px recommended (og:image)."
                        url={ogImageUrl}
                        onPick={uploadOg}
                        uploading={uploadingOg}
                        tall
                    />
                    <ImageUploadTile
                        label="Favicon"
                        sublabel="Square PNG/ICO/SVG, shown in the browser tab."
                        url={faviconUrl}
                        onPick={uploadFavicon}
                        uploading={uploadingFavicon}
                    />
                </div>
                <CardSave state={ogState} error={ogError} onClick={saveOg} />
            </div>

            {/* Analytics & tracking */}
            <div className={`${cardClass} p-6 space-y-5`}>
                <div>
                    <p className={sectionHeading}>Analytics & Tracking</p>
                    <p className="mt-1 text-[11px] text-[#8B9096]">Paste your IDs and we add the official scripts to every page of your published site — no code required.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Google Analytics 4</label>
                        <input type="text" value={ga4Id} onChange={(e) => { setGa4Id(e.target.value); setTrackingState('idle'); }} className={inputClass} placeholder="G-XXXXXXXXXX" />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Google Tag Manager</label>
                        <input type="text" value={gtmId} onChange={(e) => { setGtmId(e.target.value); setTrackingState('idle'); }} className={inputClass} placeholder="GTM-XXXXXXX" />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Meta (Facebook) Pixel</label>
                        <input type="text" value={fbPixelId} onChange={(e) => { setFbPixelId(e.target.value); setTrackingState('idle'); }} className={inputClass} placeholder="123456789012345" />
                    </div>
                </div>
                <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Custom Head Snippet</label>
                    <textarea value={trackingHead} onChange={(e) => { setTrackingHead(e.target.value); setTrackingState('idle'); }} rows={4} className={`${textareaClass} font-mono text-[12px]`} placeholder={'<!-- Scripts/meta tags injected into <head> on every page -->'} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Custom Body Snippet</label>
                    <textarea value={trackingBody} onChange={(e) => { setTrackingBody(e.target.value); setTrackingState('idle'); }} rows={4} className={`${textareaClass} font-mono text-[12px]`} placeholder={'<!-- Scripts injected before </body> on every page -->'} />
                </div>
                <CardSave state={trackingState} error={trackingError} onClick={saveTracking} />
            </div>

            {/* Crawler files */}
            <div className={`${cardClass} p-6 space-y-5`}>
                <div>
                    <p className={sectionHeading}>Crawler Files</p>
                    <p className="mt-1 text-[11px] text-[#8B9096]">Control how search engines and AI assistants crawl your site. Leave blank to use the sensible defaults we generate for you.</p>
                </div>
                <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">robots.txt</label>
                    <textarea value={robotsTxt} onChange={(e) => { setRobotsTxt(e.target.value); setCrawlerState('idle'); }} rows={5} className={`${textareaClass} font-mono text-[12px]`} placeholder={'User-agent: *\nAllow: /'} />
                </div>
                <div>
                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">llms.txt</label>
                    <textarea value={llmsTxt} onChange={(e) => { setLlmsTxt(e.target.value); setCrawlerState('idle'); }} rows={5} className={`${textareaClass} font-mono text-[12px]`} placeholder="# About this site — guidance for AI assistants" />
                </div>
                <CardSave state={crawlerState} error={crawlerError} onClick={saveCrawlers} />
            </div>

            {/* Read-only: generated search-engine files */}
            <div className={`${cardClass} p-6 space-y-3`}>
                <p className={sectionHeading}>Search Engine Files</p>
                <p className="text-[11px] text-[#8B9096]">Generated automatically for your site — submit the sitemap to Google Search Console to speed up indexing.</p>
                <ul className="space-y-1.5">
                    {(['sitemap.xml', 'robots.txt', 'llms.txt'] as const).map((file) => (
                        <li key={file}>
                            <a href={`${siteUrl}/${file}`} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-[#1693C9] hover:underline font-mono">
                                {siteUrl}/{file}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
