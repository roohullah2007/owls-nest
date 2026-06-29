import type { BlockProps } from '../../types';
import LpImage from '../../LpImage';
import './About.css';

export default function About({ data, page }: BlockProps) {
    const stats = (data.stats ?? []).filter((s: any) => s?.value || s?.label);
    // About always shows a photo slot; the resolver guarantees a valid image
    // (stored → category 'about' fallback → generic) so it never breaks.

    return (
        <section className="lp-section lp-about">
            <div className="lp-container lp-about-grid">
                <div className="lp-about-photo">
                    <LpImage section="about" page={page} src={data.photo} alt={data.title ?? ''} />
                </div>
                <div>
                    {data.eyebrow && <span className="lp-eyebrow">{data.eyebrow}</span>}
                    {data.title && <h2>{data.title}</h2>}
                    {data.body && <p className="lp-about-body">{data.body}</p>}
                    {stats.length > 0 && (
                        <div className="lp-about-stats">
                            {stats.map((stat: any, idx: number) => (
                                <div className="lp-about-stat" key={idx}>
                                    <div className="v">{stat.value ?? ''}</div>
                                    <div className="l">{stat.label ?? ''}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
