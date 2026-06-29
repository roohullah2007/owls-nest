import { useEffect, useState } from 'react';
import type { BlockProps } from '../../types';
import { embedUrl } from '../../helpers';
import { useResolvedBg } from '../../LpImage';

function CtaButton({ label, sub, link }: { label: string; sub?: string | null; link: string }) {
    return (
        <a
            href={link}
            className="inline-flex w-full max-w-2xl flex-col items-center rounded-lg px-8 py-4 text-center text-white shadow-[0_12px_30px_-8px_rgba(232,71,43,.55)] transition hover:-translate-y-0.5 hover:brightness-[1.04]"
            style={{ backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 82%, #ffffff), var(--accent))' }}
        >
            <span className="text-lg font-extrabold uppercase tracking-wide sm:text-xl">{label}</span>
            {sub ? <span className="mt-0.5 text-xs font-medium text-white/90">{sub}</span> : null}
        </a>
    );
}

/** Build the autoplay-enabled embed src, matching the Blade's ?autoplay=1&rel=0 suffix. */
function autoplayEmbed(raw: string): string {
    const base = embedUrl(raw);
    if (!base) return '';
    if (/youtube\.com\/embed\//i.test(base)) return `${base}?autoplay=1&rel=0`;
    if (/player\.vimeo\.com\/video\//i.test(base)) return `${base}?autoplay=1`;
    return base;
}

export default function HeroVideo({ data, page }: BlockProps) {
    const embed = autoplayEmbed(String(data.video_url ?? '').trim());
    // Guaranteed-loadable video poster/background (req #10).
    const posterSrc = useResolvedBg('video', page, data.poster);
    const stats = (Array.isArray(data.stats) ? data.stats : []).filter((s: any) => s && (s.value || s.label));

    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const playInner = (
        <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white/95 text-[var(--accent)] shadow-xl transition group-hover:scale-105">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </span>
    );

    return (
        <section id="hero" className="bg-[var(--navy)] px-5 pb-14 pt-12 text-center sm:px-6">
            <div className="mx-auto max-w-3xl">
                {data.eyebrow ? (
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/55 sm:text-sm">{data.eyebrow}</p>
                ) : null}

                <h1 className="mx-auto mt-3 max-w-3xl text-[40px] font-extrabold uppercase leading-[1.02] tracking-tight sm:text-6xl">{data.headline ?? 'The Masterclass for Home Sellers'}</h1>

                {data.subheadline ? (
                    <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/65">{data.subheadline}</p>
                ) : null}

                {/* Video player with the red "watch this video" tab */}
                <div className="group mx-auto mt-8 max-w-2xl overflow-hidden rounded-xl bg-black shadow-[0_24px_60px_-15px_rgba(0,0,0,.7)]">
                    <div className="flex items-center justify-center gap-2 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white" style={{ backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 82%, #ffffff), var(--accent))' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        {data.video_tab ?? 'Watch This Video'}
                    </div>
                    <div className="relative aspect-video">
                        <div className="absolute inset-0 bg-cover bg-center" style={posterSrc ? { backgroundImage: `url('${posterSrc}')` } : undefined}></div>
                        <div className="absolute inset-0 bg-black/30"></div>
                        {embed ? (
                            <button type="button" aria-label="Play video" onClick={() => setOpen(true)} className="absolute inset-0 grid w-full place-items-center">
                                {playInner}
                            </button>
                        ) : (
                            <div className="absolute inset-0 grid w-full place-items-center">
                                {playInner}
                            </div>
                        )}
                    </div>
                </div>

                {data.caption ? (
                    <p className="mx-auto mt-6 max-w-lg text-[15px] font-medium text-white/75" dangerouslySetInnerHTML={{ __html: data.caption }} />
                ) : null}

                <div className="mt-7 flex justify-center">
                    <CtaButton
                        label={data.cta_label ?? 'Apply Now'}
                        sub={data.note ?? 'Limited spots — by application only.'}
                        link={data.cta_link ?? '#apply'}
                    />
                </div>

                {stats.length ? (
                    <div className="mx-auto mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-white/10 pt-8">
                        {stats.map((stat: any, i: number) => (
                            <div key={i}>
                                <div className="text-2xl font-extrabold text-[var(--accent)] sm:text-3xl">{stat.value ?? ''}</div>
                                <div className="mt-1 text-xs text-white/55 sm:text-sm">{stat.label ?? ''}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {embed && open ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
                    <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                    </button>
                    <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-black shadow-2xl">
                        <iframe src={embed} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen></iframe>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
