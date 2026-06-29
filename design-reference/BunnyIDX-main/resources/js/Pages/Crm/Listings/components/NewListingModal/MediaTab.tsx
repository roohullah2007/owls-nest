import { useEffect, useRef, useState } from 'react';
import { NewListingFormData } from '../NewListingModal';
import { Field, INPUT_CLASS, SectionTitle } from './fields';

interface Props {
    data: NewListingFormData;
    setData: (key: keyof NewListingFormData, value: any) => void;
    errors: Record<string, string>;
    existingPhotos?: string[] | null;
}

export default function MediaTab({ data, setData, errors, existingPhotos }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        const urls = data.photos.map((f) => URL.createObjectURL(f));
        setPreviews(urls);
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, [data.photos]);

    function addFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'));
        setData('photos', [...data.photos, ...accepted]);
    }

    function removePhoto(idx: number) {
        setData(
            'photos',
            data.photos.filter((_, i) => i !== idx),
        );
    }

    function movePhoto(idx: number, dir: -1 | 1) {
        const next = [...data.photos];
        const target = idx + dir;
        if (target < 0 || target >= next.length) return;
        [next[idx], next[target]] = [next[target], next[idx]];
        setData('photos', next);
    }

    return (
        <div className="space-y-5">
            <SectionTitle>Photos and media</SectionTitle>

            {existingPhotos && existingPhotos.length > 0 && (
                <div>
                    <p className="text-[11px] text-[#5F656D] mb-2">
                        Existing photos ({existingPhotos.length}). To remove or reorder them, use the listing's full page.
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {existingPhotos.map((src, idx) => (
                            <div
                                key={idx}
                                className="relative aspect-square bg-[#F3F4F6] rounded-lg overflow-hidden border border-[#E4E7EB]"
                            >
                                <img
                                    src={src.startsWith('http') ? src : `/storage/${src}`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                                {idx === 0 && (
                                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-[#1693C9] text-white">
                                        Cover
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-colors ${
                    dragActive
                        ? 'border-[#1693C9] bg-[#EFF6FF]'
                        : 'border-[#D1D5DB] hover:border-[#9CA3AF] bg-[#FAFBFC]'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => addFiles(e.target.files)}
                    className="hidden"
                />
                <svg
                    className="h-9 w-9 mx-auto text-[#9CA3AF] mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <p className="text-[13px] font-medium text-[#111315]">Drop photos here, or click to browse</p>
                <p className="text-xs text-[#8B9096] mt-0.5">PNG, JPG, or WebP — up to 10 MB each</p>
            </div>

            {errors.photos && <p className="text-[11px] text-[#DC2626]">{errors.photos}</p>}

            {previews.length > 0 && (
                <div>
                    <p className="text-[11px] text-[#5F656D] mb-2">
                        {previews.length} photo{previews.length === 1 ? '' : 's'} — the first one is the cover image.
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {previews.map((src, idx) => (
                            <div
                                key={idx}
                                className="group relative aspect-square bg-[#F3F4F6] rounded-lg overflow-hidden border border-[#E4E7EB]"
                            >
                                <img src={src} alt="" className="w-full h-full object-cover" />
                                {idx === 0 && (
                                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-[#1693C9] text-white">
                                        Cover
                                    </span>
                                )}
                                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => movePhoto(idx, -1)}
                                            disabled={idx === 0}
                                            className="h-6 w-6 inline-flex items-center justify-center rounded bg-white/80 hover:bg-white text-[#111315] disabled:opacity-30"
                                            title="Move left"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                            </svg>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => movePhoto(idx, 1)}
                                            disabled={idx === previews.length - 1}
                                            className="h-6 w-6 inline-flex items-center justify-center rounded bg-white/80 hover:bg-white text-[#111315] disabled:opacity-30"
                                            title="Move right"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                                            </svg>
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(idx)}
                                        className="h-6 w-6 inline-flex items-center justify-center rounded bg-white/80 hover:bg-[#FEF2F2] hover:text-[#DC2626] text-[#111315]"
                                        title="Remove"
                                    >
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Field label="Virtual tour URL" error={errors['features.virtual_tour_url']}>
                <input
                    type="url"
                    value={data.virtual_tour_url}
                    onChange={(e) => setData('virtual_tour_url', e.target.value)}
                    placeholder="https://my.matterport.com/show/?m=..."
                    className={INPUT_CLASS}
                />
            </Field>
        </div>
    );
}
