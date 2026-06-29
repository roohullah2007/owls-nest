import type { BlockProps } from '../../types';
import LpImage from '../../LpImage';

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

export default function Authority({ data, page }: BlockProps) {
    const points = (Array.isArray(data.points) ? data.points : []).filter((p: any) => p && p.text);

    return (
        <section className="bg-gradient-to-b from-[#EAF3FC] to-[#D9E9F8] px-5 py-16 text-[var(--navy)] sm:px-6">
            <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
                <div>
                    {data.eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{data.eyebrow}</p> : null}
                    <h2 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                        {data.name ?? 'Your Expert Agent'}{data.title ? <>: <span className="text-[var(--accent)]">{data.title}</span></> : null}
                    </h2>

                    {points.length ? (
                        <>
                            <p className="mt-6 text-sm font-bold uppercase tracking-wide text-[var(--navy)]/70">Why work with me</p>
                            <ul className="mt-3 space-y-3">
                                {points.map((point: any, i: number) => {
                                    const parts = String(point.text).split(/:(.*)/s).filter((_, idx) => idx < 2);
                                    return (
                                        <li key={i} className="flex items-start gap-3">
                                            <svg className="mt-1 shrink-0 text-[var(--accent)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7L9 18l-5-5"/></svg>
                                            <span className="text-[15px] leading-relaxed text-[#3C4150]">
                                                {parts.length === 2 ? (
                                                    <><strong className="font-bold text-[var(--navy)]">{parts[0].trim()}:</strong> {parts[1].trim()}</>
                                                ) : (
                                                    point.text
                                                )}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    ) : null}

                    {data.body ? <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-[#3C4150]">{data.body}</p> : null}

                    {data.cta_label ? (
                        <div className="mt-8 flex">
                            <CtaButton label={data.cta_label} sub={null} link={data.cta_link ?? '#apply'} />
                        </div>
                    ) : null}
                </div>

                <div className="order-first lg:order-last">
                    <LpImage section="authority" page={page} src={data.photo} alt={data.name ?? ''} className="mx-auto max-h-[460px] w-full rounded-2xl object-cover shadow-xl" />
                </div>
            </div>
        </section>
    );
}
