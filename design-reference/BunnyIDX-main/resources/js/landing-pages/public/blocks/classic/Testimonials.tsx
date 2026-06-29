import { useState } from 'react';
import type { BlockProps } from '../../types';
import { img } from '../../helpers';
import type { LpPageData } from '../../types';
import './Testimonials.css';

/**
 * Testimonial avatar. A named quote should never show a stranger's stock face,
 * so a missing/broken photo falls back to the author's initial — not a generic
 * person image.
 */
function Avatar({ src, author, page }: { src?: string; author?: string; page: LpPageData }) {
    const [failed, setFailed] = useState(false);
    const initial = String(author ?? '?').trim().substring(0, 1);
    if (!src || failed) return <span>{initial}</span>;
    return <img src={img(src, page)} alt={author ?? ''} onError={() => setFailed(true)} />;
}

export default function Testimonials({ data, page }: BlockProps) {
    const items = (data.items ?? []).filter((i: any) => i?.quote);

    if (!items.length) return null;

    return (
        <section className="lp-section lp-tlist">
            <div className="lp-container">
                {data.title && <h2>{data.title}</h2>}
                {data.subtitle && <p className="lp-section-sub">{data.subtitle}</p>}
                <div className="lp-tlist-grid">
                    {items.map((item: any, idx: number) => (
                        <div className="lp-tcard" key={idx}>
                            <div className="lp-tcard-avatar">
                                <Avatar src={item.image} author={item.author} page={page} />
                            </div>
                            <blockquote>{`“${item.quote}”`}</blockquote>
                            {item.author && <div className="who">{item.author}</div>}
                            {item.location && <div className="where">{item.location}</div>}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
