import type { BlockProps } from '../../types';
import './Logos.css';

export default function Logos({ data }: BlockProps) {
    const logos = (data.items ?? []).filter((i: any) => i?.name || i?.image);
    if (!logos.length) return null;

    const row = [...logos, ...logos];

    return (
        <section className="lp-logos">
            <div className="lp-container">
                {data.title && <div className="lp-logos-title">{data.title}</div>}
                <div className="lp-logos-track">
                    <div className="lp-logos-row">
                        {row.map((logo: any, idx: number) => (
                            <div className="lp-logo" key={idx}>
                                {logo.image ? (
                                    <img src={logo.image} alt={logo.name ?? ''} />
                                ) : (
                                    logo.name
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
