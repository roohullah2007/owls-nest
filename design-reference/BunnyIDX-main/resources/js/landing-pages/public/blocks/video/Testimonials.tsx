import { useState } from 'react';
import type { BlockProps, LpPageData } from '../../types';
import { img } from '../../helpers';

/** Avatar that falls back to the author's initial on a missing/broken photo. */
function Avatar({ src, author, page }: { src?: string; author?: string; page: LpPageData }) {
    const [failed, setFailed] = useState(false);
    const initial = (author ?? '?').toString().substring(0, 1).toUpperCase();
    if (!src || failed) {
        return <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--navy)] text-sm font-bold text-white">{initial}</span>;
    }
    return <img src={img(src, page)} alt={author ?? ''} onError={() => setFailed(true)} className="h-11 w-11 rounded-full object-cover" />;
}

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

export default function Testimonials({ data, page }: BlockProps) {
    const items = (Array.isArray(data.items) ? data.items : []).filter((t: any) => t && t.quote);

    return (
        <section className="bg-[var(--navy)] px-5 py-16 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{data.eyebrow ?? 'People Choose Us Because'}</p>
                    <h2 className="mt-2 text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">{data.title ?? 'Everyone Wins!'}</h2>
                </div>

                {items.length ? (
                    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
                        {items.map((item: any, idx: number) => {
                            return (
                                <figure key={idx} className="flex flex-col rounded-xl bg-white p-6 text-[var(--navy)] shadow-lg">
                                    <div className="flex gap-0.5 text-[var(--accent)]">
                                        {Array.from({ length: 5 }).map((_, s) => (
                                            <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20l2.3-7-6-4.4h7.6z"/></svg>
                                        ))}
                                    </div>
                                    <blockquote className="mt-4 flex-1 text-[15px] font-semibold leading-relaxed">“{item.quote}”</blockquote>
                                    <figcaption className="mt-5 flex items-center gap-3 border-t border-[#ECEDF3] pt-4">
                                        <Avatar src={item.image} author={item.author} page={page} />
                                        <div>
                                            {item.author ? <div className="text-sm font-bold">{item.author}</div> : null}
                                            {item.location ? <div className="text-xs text-[#6B7180]">{item.location}</div> : null}
                                        </div>
                                    </figcaption>
                                </figure>
                            );
                        })}
                    </div>
                ) : null}

                <div className="mt-10 flex justify-center">
                    <CtaButton label={data.cta_label ?? 'Apply Now'} sub="Spaces are limited — don’t delay." link="#apply" />
                </div>
            </div>
        </section>
    );
}
