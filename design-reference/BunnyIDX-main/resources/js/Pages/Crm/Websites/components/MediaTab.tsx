import { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { api } from '@/website-editor/api';
import { inputClass } from '../constants';

interface MediaImage {
    path: string;
    url: string;
    label: string;
    source: string;
}

interface Props {
    websiteId: number;
    /** Surfaces "+ Upload Image" in the pane's top row (same pattern as Pages). */
    onActionChange?: (action: { label: string; onClick: () => void } | null) => void;
}

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml,.svg,.avif';

export default function MediaTab({ websiteId, onActionChange }: Props) {
    const [images, setImages] = useState<MediaImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [broken, setBroken] = useState<Set<string>>(new Set());
    const [query, setQuery] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);
    const dragDepth = useRef(0);

    const uploading = progress !== null;

    function fetchMedia() {
        setLoading(true);
        axios.get(`/api/website-editor/${websiteId}/media`)
            .then(res => setImages(res.data.images || []))
            .finally(() => setLoading(false));
    }

    useEffect(() => { fetchMedia(); }, [websiteId]);

    // Upload lives in the pane's top row, like "+ Add Page" on the Pages tab.
    useEffect(() => {
        const label = uploading ? `Uploading ${progress!.done}/${progress!.total}…` : '+ Upload Image';
        onActionChange?.({ label, onClick: () => fileRef.current?.click() });
        return () => onActionChange?.(null);
    }, [onActionChange, uploading, progress]);

    async function uploadFiles(fileList: FileList | File[]) {
        const files = Array.from(fileList).filter(f => f.type.startsWith('image/') || /\.(svg|avif)$/i.test(f.name));
        if (files.length === 0) return;

        const failures: string[] = [];
        setProgress({ done: 0, total: files.length });
        for (let i = 0; i < files.length; i++) {
            try {
                await api.uploadMedia(websiteId, files[i]);
            } catch (e) {
                const err = e as { errors?: Record<string, string[]> };
                const msg = err?.errors ? Object.values(err.errors).flat()[0] : null;
                failures.push(`${files[i].name}: ${msg || 'upload failed'}`);
            }
            setProgress({ done: i + 1, total: files.length });
        }
        setProgress(null);
        fetchMedia();
        if (failures.length) {
            alert(`Some images didn't upload (use JPG, PNG, GIF, WEBP, AVIF or SVG, max 10 MB):\n\n${failures.join('\n')}`);
        }
    }

    async function handleDelete(path: string) {
        if (!confirm('Delete this image? It will be removed from your website wherever it is used.')) return;
        setDeleting(path);
        try {
            await axios.delete(`/api/website-editor/${websiteId}/media`, { data: { path } });
            setImages(prev => prev.filter(img => img.path !== path));
        } catch {
            alert('Could not delete this image. Please try again.');
        } finally {
            setDeleting(null);
        }
    }

    // Whole-pane drag overlay — counts enter/leave so nested elements don't flicker.
    function onDragEnter(e: React.DragEvent) {
        if (!Array.from(e.dataTransfer.types).includes('Files')) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragActive(true);
    }
    function onDragLeave(e: React.DragEvent) {
        if (!Array.from(e.dataTransfer.types).includes('Files')) return;
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragActive(false);
    }
    function onDrop(e: React.DragEvent) {
        e.preventDefault();
        dragDepth.current = 0;
        setDragActive(false);
        if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
    }

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return images;
        return images.filter(img =>
            img.label.toLowerCase().includes(q) || img.path.toLowerCase().includes(q));
    }, [images, query]);

    const fileInput = (
        <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ''; }}
        />
    );

    const dropzone = (
        <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={`w-full flex items-center justify-center gap-3 rounded-[4px] border-2 border-dashed px-4 py-5 text-left transition-colors ${
                dragActive ? 'border-[#1693C9] bg-[#E0F2FE]' : 'border-[#D1D5DB] bg-[#FAFBFC] hover:border-[#1693C9] hover:bg-[#F0F9FF]'
            } disabled:opacity-60`}
        >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E0F2FE] text-[#1693C9]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
            </span>
            <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[#111315]">
                    {uploading ? `Uploading ${progress!.done} of ${progress!.total}…` : 'Drop images here, or click to upload'}
                </span>
                <span className="block text-[11px] text-[#8B9096]">JPG, PNG, GIF, WEBP, AVIF or SVG — up to 10 MB each</span>
            </span>
        </button>
    );

    return (
        <div
            className="relative space-y-3"
            onDragEnter={onDragEnter}
            onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault(); }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {fileInput}

            {/* Whole-pane drop overlay */}
            {dragActive && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[6px] border-2 border-dashed border-[#1693C9] bg-[#E0F2FE]/80">
                    <p className="text-[14px] font-semibold text-[#1380AF]">Drop to upload</p>
                </div>
            )}

            {/* Toolbar: search + count */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                    <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search images by name…"
                        className={`${inputClass} pl-8 pr-8`}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8B9096] hover:text-[#111315]"
                            title="Clear search"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
                <p className="text-[11px] text-[#8B9096]">
                    {query
                        ? `${filtered.length} of ${images.length} image${images.length !== 1 ? 's' : ''}`
                        : `${images.length} image${images.length !== 1 ? 's' : ''}`}
                </p>
            </div>

            {dropzone}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <svg className="animate-spin h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : images.length === 0 ? (
                <div className="rounded-[4px] border border-[#E4E7EB] bg-white p-12 text-center">
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E0F2FE]">
                        <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                        </svg>
                    </div>
                    <h4 className="mb-1 text-sm font-semibold text-[#111315]">No images uploaded yet</h4>
                    <p className="text-[12px] text-[#5F656D]">Drag images onto the dropzone above, or click it to browse — then insert them from any image field.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-[4px] border border-[#E4E7EB] bg-white p-10 text-center">
                    <p className="text-[13px] text-[#5F656D]">No images match “{query}”.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filtered.map((img) => {
                        const inUse = img.source !== 'library';
                        return (
                            <div key={img.path} className="group relative overflow-hidden rounded-[4px] border border-[#E4E7EB] bg-white shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] transition-all hover:border-[#D1D5DB] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)]">
                                <div className="relative aspect-[4/3] overflow-hidden bg-[#F3F4F6]">
                                    {broken.has(img.path) ? (
                                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#B6BBC2]">
                                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" /><path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18" /></svg>
                                            <span className="text-[10px] font-medium">Image unavailable</span>
                                        </div>
                                    ) : (
                                        <img
                                            src={img.url}
                                            alt={img.label}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            onError={() => setBroken((s) => new Set(s).add(img.path))}
                                        />
                                    )}
                                    {inUse && (
                                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                            In use
                                        </span>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(img.path)}
                                            disabled={deleting === img.path}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#DC2626] opacity-0 shadow transition-opacity hover:bg-[#FEF2F2] group-hover:opacity-100 disabled:opacity-50"
                                            title="Delete image"
                                        >
                                            {deleting === img.path ? (
                                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                            ) : (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="px-3 py-2">
                                    <p className="truncate text-[11px] font-medium text-[#111315]" title={img.label}>{img.label}</p>
                                    <p className="mt-0.5 truncate font-mono text-[10px] text-[#8B9096]">{img.path.split('/').pop()}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
