import type { BlockProps } from '../../types';
import { embedUrl } from '../../helpers';
import './VideoBlock.css';

export default function VideoBlock({ data }: BlockProps) {
    const embed = embedUrl(data.video_url);

    return (
        <section className="lp-section lp-video">
            <div className="lp-container">
                {data.eyebrow && (
                    <div style={{ textAlign: 'center' }}>
                        <span className="lp-eyebrow">{data.eyebrow}</span>
                    </div>
                )}
                {data.title && <h2>{data.title}</h2>}
                {data.subtitle && <p className="lp-section-sub">{data.subtitle}</p>}
                <div className="lp-video-frame">
                    {embed ? (
                        <iframe
                            src={embed}
                            title={data.title ?? 'Video'}
                            allow="accelerated-rotation; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                        />
                    ) : (
                        <div
                            className="lp-video-ph"
                            style={data.poster ? { backgroundImage: `url('${data.poster}')` } : undefined}
                        >
                            <div className="play">
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    )}
                </div>
                {data.cta_label && (
                    <div className="lp-video-cta">
                        <a href={data.cta_link ?? '#hero'} className="lp-btn">{data.cta_label}</a>
                    </div>
                )}
            </div>
        </section>
    );
}
