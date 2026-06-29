import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ImageUploader from '../components/ImageUploader';
import AiButton from '../components/AiButton';
import { SiteData } from '../types';
import { api } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
}

type BgType = 'video' | 'image' | 'slideshow';

function parseYouTubeId(url: string): string | null {
    if (!url) return null;
    // youtube.com/watch?v=ID or youtu.be/ID or youtube.com/embed/ID
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pat of patterns) {
        const match = url.match(pat);
        if (match) return match[1];
    }
    return null;
}

export default function HeroModal({ open, onClose, site }: Props) {
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [imageUploaded, setImageUploaded] = useState(false);

    const [headline, setHeadline] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [bgType, setBgType] = useState<BgType>('video');
    const [videoUrl, setVideoUrl] = useState('');

    const homeData = site.page_data?.home || {};

    useEffect(() => {
        if (open) {
            setHeadline(site.hero_headline || '');
            setSubtitle(site.hero_subtitle || '');
            setBgType((homeData.hero_bg_type as BgType) || (site.hero_image ? 'image' : 'video'));
            setVideoUrl((homeData.hero_video_url as string) || '');
            setDirty(false);
            setImageUploaded(false);
        }
    }, [open, site]);

    const mark = () => setDirty(true);

    const youtubeId = parseYouTubeId(videoUrl);
    const isYouTube = !!youtubeId;

    async function handleSave() {
        setSaving(true);
        try {
            // Save column fields
            await api.updateSite(site.id, {
                hero_headline: headline,
                hero_subtitle: subtitle,
            });

            // Save page_data fields
            const pageFields: Record<string, string | null> = {
                hero_bg_type: bgType,
                hero_video_url: bgType === 'video' ? videoUrl : null,
            };
            await api.updatePageData(site.id, 'home', pageFields);

            window.location.reload();
        } catch {
            setSaving(false);
        }
    }

    function handleClose() {
        if (imageUploaded) {
            window.location.reload();
            return;
        }
        onClose();
    }

    async function handleHeroImageUpload(file: File) {
        await api.uploadHero(site.id, file);
        setImageUploaded(true);
    }

    async function handleSlideUpload(slideKey: string, file: File) {
        const result = await api.uploadBlockImage(site.id, file);
        if (result.path) {
            await api.updatePageData(site.id, 'home', { [slideKey]: result.path });
            setImageUploaded(true);
        }
    }

    const bgOptions: { value: BgType; label: string }[] = [
        { value: 'video', label: 'Video' },
        { value: 'image', label: 'Image' },
        { value: 'slideshow', label: 'Slideshow' },
    ];

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title="Edit Hero Section"
            wide
            footer={
                <div className="we-modal-actions">
                    <button type="button" className="we-btn we-btn-secondary" onClick={handleClose}>Cancel</button>
                    <button type="button" className="we-btn we-btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            }
        >
            {/* Content fields */}
            <div className="we-field">
                <div className="we-field-header">
                    <label className="we-label">Headline</label>
                </div>
                <div className="we-field-row">
                    <input
                        type="text"
                        className="we-input"
                        value={headline}
                        onChange={(e) => { setHeadline(e.target.value); mark(); }}
                    />
                    <AiButton
                        siteId={site.id}
                        field="hero_headline"
                        currentValue={headline}
                        onGenerated={(v) => { setHeadline(v); mark(); }}
                    />
                </div>
            </div>
            <div className="we-field">
                <div className="we-field-header">
                    <label className="we-label">Subtitle</label>
                </div>
                <div className="we-field-row">
                    <input
                        type="text"
                        className="we-input"
                        value={subtitle}
                        onChange={(e) => { setSubtitle(e.target.value); mark(); }}
                    />
                    <AiButton
                        siteId={site.id}
                        field="hero_subtitle"
                        currentValue={subtitle}
                        onGenerated={(v) => { setSubtitle(v); mark(); }}
                    />
                </div>
            </div>

            {/* Background type selector */}
            <div className="we-field" style={{ marginTop: 8 }}>
                <label className="we-label">Background Type</label>
                <div className="we-bg-type-selector">
                    {bgOptions.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`we-bg-type-option${bgType === opt.value ? ' active' : ''}`}
                            onClick={() => { setBgType(opt.value); mark(); }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Conditional background fields */}
            {bgType === 'video' && (
                <div className="we-field">
                    <div className="we-field-header">
                        <label className="we-label">Video URL</label>
                    </div>
                    <input
                        type="text"
                        className="we-input"
                        value={videoUrl}
                        onChange={(e) => { setVideoUrl(e.target.value); mark(); }}
                        placeholder="YouTube URL or direct .mp4 link"
                    />
                    <p className="we-hint">
                        Supports YouTube links (e.g. youtube.com/watch?v=...) or direct .mp4 URLs. Leave empty for default video.
                    </p>
                    {isYouTube && (
                        <div style={{ marginTop: 8, borderRadius: 6, overflow: 'hidden', background: '#000', aspectRatio: '16/9', maxHeight: 180 }}>
                            <iframe
                                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&controls=0`}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="Preview"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                        </div>
                    )}
                </div>
            )}

            {bgType === 'image' && (
                <ImageUploader
                    label="Hero Image"
                    currentUrl={site.hero_image}
                    maxSizeMb={10}
                    onUpload={handleHeroImageUpload}
                />
            )}

            {bgType === 'slideshow' && (
                <>
                    <ImageUploader
                        label="Slide 1"
                        currentUrl={(homeData.hero_slide_1 as string) || null}
                        maxSizeMb={10}
                        onUpload={(file) => handleSlideUpload('hero_slide_1', file)}
                    />
                    <ImageUploader
                        label="Slide 2"
                        currentUrl={(homeData.hero_slide_2 as string) || null}
                        maxSizeMb={10}
                        onUpload={(file) => handleSlideUpload('hero_slide_2', file)}
                    />
                    <ImageUploader
                        label="Slide 3"
                        currentUrl={(homeData.hero_slide_3 as string) || null}
                        maxSizeMb={10}
                        onUpload={(file) => handleSlideUpload('hero_slide_3', file)}
                    />
                </>
            )}
        </Modal>
    );
}
