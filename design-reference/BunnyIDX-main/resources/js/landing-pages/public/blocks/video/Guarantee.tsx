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

export default function Guarantee({ data }: BlockProps) {
    return (
        <section className="bg-[var(--navy)] px-5 py-16 sm:px-6">
            <div className="mx-auto max-w-3xl">
                <div className="rounded-2xl bg-white px-7 py-12 text-center text-[var(--navy)] shadow-2xl sm:px-12">
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--navy)] text-white">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/></svg>
                    </span>
                    {data.badge_label ? (
                        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{data.badge_label}</p>
                    ) : null}
                    <h2 className="mt-2 text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">{data.title ?? 'Guaranteed'}</h2>
                    {data.body ? (
                        <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[#4A4F61]">{data.body}</p>
                    ) : null}
                </div>

                {data.cta_label ? (
                    <div className="mt-9 flex justify-center">
                        <CtaButton label={data.cta_label} sub="Spaces Are Limited — Don’t Delay!" link={data.cta_link ?? '#apply'} />
                    </div>
                ) : null}
            </div>
        </section>
    );
}
