import { useState } from 'react';
import MediaPickerModal from './MediaPickerModal';

interface Props {
    websiteId: number;
    /** Stored path (e.g. agent-websites/…) or an absolute URL. Empty when unset. */
    value: string;
    onChange: (path: string) => void;
    size?: 'sm' | 'md' | 'lg';
}

/** Resolve a stored path or absolute URL to a displayable src. */
export function mediaUrl(value: string): string {
    if (!value) return '';
    return /^https?:\/\//.test(value) ? value : `/storage/${value}`;
}

/**
 * A single image field backed by the Media Library. Shows a thumbnail and a
 * Select/Change + Remove control; opens the MediaPicker to choose or upload.
 * Yields the chosen path via onChange — the consumer decides where to persist it.
 */
export default function MediaField({ websiteId, value, onChange, size = 'md' }: Props) {
    const [picking, setPicking] = useState(false);
    const box = size === 'lg' ? 'h-32 w-48' : size === 'sm' ? 'h-20 w-28' : 'h-28 w-40';

    return (
        <>
            {value ? (
                // Controls sit on top of the image (overlay) so the field stays compact and aligned.
                <div className={`relative group ${box} rounded-lg border border-[#C8CCD1] bg-[#F3F4F6] overflow-hidden`}>
                    <img src={mediaUrl(value)} alt="" className="h-full w-full object-contain" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => setPicking(true)} className="h-7 px-3 bg-white text-[11px] font-medium text-[#111315] rounded-md hover:bg-white/90 transition-colors">Change</button>
                        <button type="button" onClick={() => onChange('')} className="h-7 px-3 bg-white text-[11px] font-medium text-[#DC2626] rounded-md hover:bg-white/90 transition-colors">Remove</button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className={`${box} rounded-lg border-2 border-dashed border-[#C8CCD1] bg-[#F9FAFB] flex flex-col items-center justify-center gap-1.5 text-[#5F656D] hover:border-[#1693C9] hover:text-[#1693C9] transition-colors`}
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 13.5h.008v.008H18V13.5Z" /></svg>
                    <span className="text-[11px] font-medium">Select Image</span>
                </button>
            )}
            {picking && (
                <MediaPickerModal websiteId={websiteId} onClose={() => setPicking(false)} onSelect={(p) => onChange(p)} />
            )}
        </>
    );
}
