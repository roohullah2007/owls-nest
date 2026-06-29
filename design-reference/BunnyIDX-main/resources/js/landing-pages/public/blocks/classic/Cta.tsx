import type { BlockProps } from '../../types';
import { useResolvedBg } from '../../LpImage';
import './Cta.css';

export default function Cta({ data, page }: BlockProps) {
    const hasImage = !!data.image;
    // Resolve a guaranteed-loadable background when an image is set (broken/missing
    // stored images fall back to a category image); keep the gradient when none.
    const ctaImg = useResolvedBg('cta', page, data.image);

    return (
        <section
            className={`lp-cta ${hasImage ? '' : 'no-image'}`}
            style={hasImage ? { backgroundImage: `url('${ctaImg}')` } : undefined}
        >
            <div className="lp-container">
                <h2>{data.headline ?? 'Ready to get started?'}</h2>
                {data.subtext && <p>{data.subtext}</p>}
                <a href="#hero" className="lp-btn">{data.button_label ?? 'Get Started'}</a>
            </div>
        </section>
    );
}
