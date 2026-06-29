import type { BlockProps } from '../../types';
import './TestimonialLegacy.css';

export default function TestimonialLegacy({ data }: BlockProps) {
    if (!data.quote) return null;

    return (
        <section className="lp-section">
            <div className="lp-container lp-quote">
                <div className="mark">“</div>
                <blockquote>{data.quote}</blockquote>
                <div className="who">{data.author ?? ''}</div>
                {data.location && <div className="where">{data.location}</div>}
            </div>
        </section>
    );
}
