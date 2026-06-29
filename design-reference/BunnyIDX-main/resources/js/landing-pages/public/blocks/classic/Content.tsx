import type { BlockProps } from '../../types';
import './Content.css';

export default function Content({ data }: BlockProps) {
    return (
        <section className="lp-section lp-content">
            <div className="lp-container lp-content-inner">
                {data.eyebrow && <span className="lp-eyebrow">{data.eyebrow}</span>}
                {data.title && <h2>{data.title}</h2>}
                {data.body && <p className="lp-content-body">{data.body}</p>}
            </div>
        </section>
    );
}
