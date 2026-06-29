import { useCallback, useEffect, useState } from 'react';

interface Props {
    photos: string[];
    initialIndex: number;
    onClose: () => void;
}

export default function Lightbox({ photos, initialIndex, onClose }: Props) {
    const [index, setIndex] = useState(initialIndex);
    const [loaded, setLoaded] = useState(false);

    const prev = () => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
    const next = () => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));

    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
    }, [photos.length, onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [handleKey]);

    useEffect(() => { setLoaded(false); }, [index]);

    return (
        <div className="fixed inset-0 z-[1200] bg-black/95" onClick={onClose}>
            <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-5 z-10" onClick={(e) => e.stopPropagation()}>
                <span className="text-white/80 text-sm font-medium">{index + 1} / {photos.length}</span>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                    <svg className="h-6 w-6 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="absolute inset-0 flex items-center justify-center pt-14 pb-20" onClick={onClose}>
                <div className="relative w-full h-full flex items-center justify-center px-16" onClick={(e) => e.stopPropagation()}>
                    {!loaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                        </div>
                    )}
                    <img
                        src={photos[index]}
                        alt=""
                        className={`max-w-full max-h-full object-contain select-none transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setLoaded(true)}
                        draggable={false}
                    />
                </div>
            </div>

            {photos.length > 1 && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); prev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all z-10"
                    >
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); next(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 border border-white/10 transition-all z-10"
                    >
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 h-20 flex items-center justify-center gap-2 px-5 bg-black/60" onClick={(e) => e.stopPropagation()}>
                        {photos.map((photo, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                className={`flex-shrink-0 w-14 h-10 rounded overflow-hidden transition-all ${i === index ? 'ring-2 ring-white opacity-100' : 'opacity-40 hover:opacity-70'}`}
                            >
                                <img src={photo} alt="" className="w-full h-full object-cover" draggable={false} />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
