import type { BlockProps } from '../../types';
import { img } from '../../helpers';

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

export default function Cta({ data, page }: BlockProps) {
    const imgSrc = img(data.image, page);

    return (
        <section className="relative overflow-hidden bg-[var(--navy)] px-5 py-16 text-center sm:px-6">
            {imgSrc ? (
                <>
                    <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url('${imgSrc}')` }}></div>
                    <div className="absolute inset-0 bg-[var(--navy)]/70"></div>
                </>
            ) : null}
            <div className="relative mx-auto max-w-2xl">
                {data.eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{data.eyebrow}</p> : null}
                <h2 className="mt-2 text-4xl font-extrabold uppercase tracking-tight sm:text-6xl">{data.headline ?? 'Ready to Get Started?'}</h2>
                {data.subtext ? <p className="mx-auto mt-5 max-w-xl text-[15px] text-white/70">{data.subtext}</p> : null}
                <div className="mt-8 flex justify-center">
                    <CtaButton label={data.button_label ?? 'Apply Now'} sub="Spaces Are Limited — Don’t Delay!" link={data.cta_link ?? '#apply'} />
                </div>
            </div>
        </section>
    );
}
