import type { BlockProps } from '../../types';
import { embedUrl } from '../../helpers';
import './VideoTestimonials.css';

export default function VideoTestimonials({ data }: BlockProps) {
    const items = (data.items ?? []).filter((i: any) => i?.video_url || i?.name);

    if (!items.length) return null;

    return (
        <section className="lp-section lp-vt">
            <div className="lp-container">
                {data.title && <h2>{data.title}</h2>}
                {data.subtitle && <p className="lp-section-sub">{data.subtitle}</p>}
                <div className="lp-vt-grid">
                    {items.map((item: any, idx: number) => {
                        const embed = embedUrl(item.video_url ?? '');
                        return (
                            <div className="lp-vt-card" key={idx}>
                                <div className="lp-vt-frame">
                                    {embed ? (
                                        <iframe
                                            src={embed}
                                            title={item.name ?? 'Video testimonial'}
                                            allow="accelerated-rotation; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div
                                            className="lp-vt-ph"
                                            style={item.poster ? { backgroundImage: `url('${item.poster}')` } : undefined}
                                        >
                                            <div className="play">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {item.name && <div className="who">{item.name}</div>}
                                {item.caption && <div className="what">{item.caption}</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
