import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import SlideOverModal from '@/Components/Crm/SlideOverModal';

interface MediaItem {
    id?: number;
    path: string;
    url: string;
    label: string;
    source: string;
}

interface Props {
    pageUuid: string;
    onSelect?: (path: string) => void;
    onClose: () => void;
    title?: string;
}

/** Landing-page Media Library — browse, upload and delete; click an image to use it. */
export default function MediaPickerModal({ pageUuid, onSelect, onClose, title = 'Media Library' }: Props) {
    const [images, setImages] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = () => {
        setLoading(true);
        axios
            .get(route('crm.landing-pages.media', pageUuid))
            .then((r) => setImages(r.data.images ?? []))
            .finally(() => setLoading(false));
    };

    useEffect(load, [pageUuid]);

    const upload = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        const queue = Array.from(files).map((file) => {
            const fd = new FormData();
            fd.append('file', file);
            return axios.post(route('crm.landing-pages.media.upload', pageUuid), fd);
        });
        Promise.all(queue).finally(() => {
            setUploading(false);
            load();
        });
    };

    const remove = (path: string) => {
        if (!confirm('Delete this image? It will be removed from the page everywhere it is used.')) return;
        axios.delete(route('crm.landing-pages.media.delete', pageUuid), { data: { path } }).then(load);
    };

    const headerRight = (
        <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-7 px-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-white bg-[#1693C9] rounded hover:bg-[#1380AF] disabled:opacity-50"
        >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            {uploading ? 'Uploading…' : 'Upload'}
        </button>
    );

    return (
        <SlideOverModal title={title} onClose={onClose} headerRight={headerRight} width={460}>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <p className="text-[13px] text-[#8B9096] text-center py-10">Loading…</p>
                ) : images.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-[13px] font-medium text-[#111315]">No media yet</p>
                        <p className="text-[12px] text-[#8B9096] mt-1">Upload an image to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                        {images.map((img) => (
                            <div key={img.path} className="group relative aspect-square overflow-hidden rounded-lg border border-[#E4E7EB] bg-[#F7F8FB]">
                                <button type="button" onClick={() => onSelect?.(img.path)} className="absolute inset-0" title={onSelect ? 'Use this image' : img.label}>
                                    <img src={img.url} alt={img.label} className="h-full w-full object-cover" loading="lazy" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => remove(img.path)}
                                    title="Delete"
                                    className="absolute top-1 right-1 h-6 w-6 inline-flex items-center justify-center rounded bg-white/90 text-[#8B9096] opacity-0 group-hover:opacity-100 hover:text-[#DC2626] transition-opacity"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9M18.16 5.79 17.5 19.7a2.25 2.25 0 0 1-2.244 2.05H8.744A2.25 2.25 0 0 1 6.5 19.7L5.84 5.79M9.75 5.79V4.5A1.5 1.5 0 0 1 11.25 3h1.5a1.5 1.5 0 0 1 1.5 1.5v1.29" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </SlideOverModal>
    );
}
