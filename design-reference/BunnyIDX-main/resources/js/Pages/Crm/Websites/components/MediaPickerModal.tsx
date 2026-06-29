import { useEffect, useRef, useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { api } from '@/website-editor/api';
import { MediaItem } from '@/website-editor/types';

interface Props {
    websiteId: number;
    onClose: () => void;
    onSelect: (path: string) => void;
    title?: string;
}

/**
 * WordPress-style Media Library picker. Lists every image uploaded for the site,
 * lets the user insert one (click) or upload a new file (which is added to the
 * library and inserted). Accepts JPG/PNG/GIF/WEBP/AVIF/SVG.
 */
export default function MediaPickerModal({ websiteId, onClose, onSelect, title }: Props) {
    const [images, setImages] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let alive = true;
        api.listMedia(websiteId)
            .then((r) => { if (alive) setImages(r.images || []); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [websiteId]);

    async function handleUpload(file: File) {
        setUploading(true);
        try {
            const res = await api.uploadMedia(websiteId, file);
            if (res.path) { onSelect(res.path); onClose(); }
        } catch (e) {
            const err = e as { errors?: Record<string, string[]> };
            const msg = err?.errors ? Object.values(err.errors).flat()[0] : null;
            alert(msg || 'Upload failed. Use JPG, PNG, GIF, WEBP, AVIF or SVG (max 10 MB).');
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(path: string) {
        if (!confirm('Delete this image from the library? It will be removed wherever it is used.')) return;
        setDeleting(path);
        try {
            await api.deleteMedia(websiteId, path);
            setImages((prev) => prev.filter((i) => i.path !== path));
        } finally {
            setDeleting(null);
        }
    }

    const footer = (
        <>
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">Cancel</button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml,.svg,.avif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                {uploading ? 'Uploading…' : 'Upload New'}
            </button>
        </>
    );

    return (
        <SlideOverModal title={title || 'Media Library'} onClose={onClose} footer={footer} width={560}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <svg className="animate-spin h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-16 text-[#8B9096]">
                        <svg className="h-10 w-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /></svg>
                        <p className="text-[13px]">Your media library is empty</p>
                        <p className="text-[11px] mt-1">Upload an image to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {images.map((img) => (
                            <div key={img.path} className="relative group border border-[#E4E7EB] rounded-lg overflow-hidden">
                                <button type="button" onClick={() => { onSelect(img.path); onClose(); }} className="block w-full aspect-square bg-[#F3F4F6]" title="Insert this image">
                                    <img src={img.url} alt={img.label || ''} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(img.path)}
                                    disabled={deleting === img.path}
                                    className="absolute top-1.5 right-1.5 h-6 w-6 bg-white/90 rounded-full flex items-center justify-center text-[#5F656D] hover:text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 shadow-sm"
                                    title="Delete from library"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
