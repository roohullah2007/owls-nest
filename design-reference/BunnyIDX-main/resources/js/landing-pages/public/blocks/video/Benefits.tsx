import type { BlockProps } from '../../types';

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

const ICONS = [
    '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    '<path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20l2.3-7-6-4.4h7.6z"/>',
    '<path d="M20 7L9 18l-5-5"/>',
    '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
    '<path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
];

export default function Benefits({ data }: BlockProps) {
    const items = (Array.isArray(data.items) ? data.items : []).filter(
        (i: any) => i && (i.title || i.text),
    );

    return (
        <section className="bg-[#F3F4FA] px-5 py-16 text-[var(--navy)] sm:px-6">
            <div className="mx-auto max-w-5xl">
                <div className="mx-auto max-w-2xl text-center">
                    {data.eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{data.eyebrow}</p> : null}
                    {data.title ? <h2 className="mt-2 text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">{data.title}</h2> : null}
                    {data.subtitle ? <p className="mt-4 text-[15px] leading-relaxed text-[#4A4F61]">{data.subtitle}</p> : null}
                </div>

                {items.length ? (
                    <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item: any, i: number) => (
                            <div key={i} className="rounded-xl border border-[#E6E7F0] bg-white p-7 text-center shadow-sm">
                                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--navy)] text-white">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: ICONS[i % ICONS.length] }} />
                                </span>
                                {item.title ? <h3 className="mt-5 text-lg font-extrabold">{item.title}</h3> : null}
                                {item.text ? <p className="mt-2 text-[14px] leading-relaxed text-[#5A5F70]">{item.text}</p> : null}
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="mt-10 flex justify-center">
                    <CtaButton label={data.cta_label ?? 'Apply Now'} sub="Spaces Are Limited — Don’t Delay!" link="#apply" />
                </div>
            </div>
        </section>
    );
}
