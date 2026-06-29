import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { FieldLabel } from '@/Components/Crm/FormField';
import { img } from '@/landing-pages/public/helpers';
import { imageCandidates, type LpSection } from '@/landing-pages/public/imageFallbacks';
import type { LpPageData } from '@/landing-pages/public/types';
import MediaPickerModal from './MediaPickerModal';

interface Props {
    label: string;
    value: string;
    onChange: (v: string) => void;
    pageUuid: string;
    help?: string;
    /**
     * Page context (assetBase + image category). When provided, the preview resolves
     * stored paths through the same `img()` helper the public landing page uses.
     */
    pageContext?: LpPageData;
    /**
     * Section-fallback slot (hero/about/cta/video/authority). When set, an empty or
     * broken image previews the section's stock fallback — the SAME image the public
     * page and the backend LandingPageImages resolver produce. Slots with no public
     * stock fallback (testimonial/logo posters, the logo) omit this and show the
     * upload placeholder instead.
     */
    section?: LpSection;
    /** @deprecated retained for callers; image fields are upload-only now. */
    allowUrl?: boolean;
}

const PLACEHOLDER_CTX = { assetBase: '/storage/' } as unknown as LpPageData;

function PlaceholderIcon() {
    return (
        <svg className="h-6 w-6 text-[#C4C9D1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 19.5h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
    );
}

/**
 * Section-aware preview that mirrors the public LpImage: it walks the resolver's
 * candidate chain (stored image → section fallback → generic) on error, so the
 * editor shows the exact same image/fallback the published page renders. Slots
 * without a section show the stored image and drop to the placeholder on error.
 */
function Preview({ value, section, pageContext }: { value: string; section?: LpSection; pageContext?: LpPageData }) {
    const candidates = useMemo(() => {
        if (section && pageContext) return imageCandidates(section, pageContext, value);
        const url = img(value, pageContext ?? PLACEHOLDER_CTX);
        return url ? [url] : [];
    }, [section, pageContext, value]);

    const [idx, setIdx] = useState(0);
    const [failed, setFailed] = useState(false);

    // Reset to the first candidate whenever the source set changes.
    useEffect(() => {
        setIdx(0);
        setFailed(false);
    }, [candidates.join('|')]);

    if (!candidates.length || failed) return <PlaceholderIcon />;

    const current = candidates[Math.min(idx, candidates.length - 1)];
    const onError = () => (idx < candidates.length - 1 ? setIdx(idx + 1) : setFailed(true));

    return <img src={current} alt="" className="h-full w-full object-cover" onError={onError} />;
}

/** Image field with upload + library picker (all uploads land in the media library). */
export default function MediaField({ label, value, onChange, pageUuid, help, pageContext, section }: Props) {
    const [picker, setPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const upload = (file: File | undefined) => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        axios
            .post(route('crm.landing-pages.media.upload', pageUuid), fd)
            .then((r) => onChange(r.data.path))
            .finally(() => setUploading(false));
    };

    return (
        <div>
            <FieldLabel help={help}>{label}</FieldLabel>
            <div className="flex items-start gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#E4E7EB] bg-[#F7F8FB] grid place-items-center">
                    <Preview value={value} section={section} pageContext={pageContext} />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-7 px-2.5 text-[12px] font-medium text-white bg-[#1693C9] rounded hover:bg-[#1380AF] disabled:opacity-50">
                            {uploading ? 'Uploading…' : 'Upload'}
                        </button>
                        <button type="button" onClick={() => setPicker(true)} className="h-7 px-2.5 text-[12px] font-medium text-[#111315] border border-[#C8CCD1] rounded hover:bg-[#F3F4F6]">
                            Library
                        </button>
                        {value && (
                            <button type="button" onClick={() => onChange('')} className="h-7 px-2.5 text-[12px] font-medium text-[#8B9096] hover:text-[#DC2626]">
                                Remove
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] text-[#8B9096]">PNG, JPG or WebP — uploaded to your media library.</p>
                </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            {picker && <MediaPickerModal pageUuid={pageUuid} onSelect={(p) => { onChange(p); setPicker(false); }} onClose={() => setPicker(false)} title="Choose an image" />}
        </div>
    );
}
