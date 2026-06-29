import type { BlockProps } from '../../types';
import './Steps.css';

export default function Steps({ data }: BlockProps) {
    return (
        <section className="lp-section lp-steps">
            <div className="lp-container">
                {data.title && <h2>{data.title}</h2>}
                <div className="lp-steps-grid">
                    {(data.items ?? []).map((item: any, i: number) => (
                        <div className="lp-step" key={i}>
                            <div className="lp-step-num">{i + 1}</div>
                            <h3>{item.title ?? ''}</h3>
                            <p>{item.text ?? ''}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
