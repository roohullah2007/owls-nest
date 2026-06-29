import { useState } from 'react';
import type { BlockProps } from '../../types';
import './Calculator.css';

/** $1,234,567 — matches the Blade JS fmt(): '$' + Math.round(n).toLocaleString('en-US'). */
function fmt(n: number): string {
    return '$' + Math.round(n).toLocaleString('en-US');
}

/** number_format($x, 2) then rtrim trailing zeros and the dot — e.g. 3 -> "3", 2.5 -> "2.5". */
function rate(n: number): string {
    return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export default function Calculator({ data }: BlockProps) {
    const trad = Number(data.traditional_rate ?? 3) || 3;
    const our = Number(data.our_rate ?? 2) || 2;
    const min = Number(data.min_value ?? 100000);
    const max = Number(data.max_value ?? 2000000);
    const step = Number(data.step ?? 25000);
    const defaultValue = Number(data.default_value ?? 500000);

    const [value, setValue] = useState(defaultValue);

    const v = Number(value) || 0;
    const tFee = (v * trad) / 100;
    const oFee = (v * our) / 100;

    const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
    const rangeStyle = {
        background: `linear-gradient(90deg, var(--accent) ${pct}%, var(--line) ${pct}%)`,
    };

    return (
        <section className="lp-section lp-calc">
            <div className="lp-container">
                {data.title && <h2>{data.title}</h2>}
                {data.subtitle && <p className="lp-section-sub">{data.subtitle}</p>}

                <div className="lp-calc-card" data-lp-calc data-trad={trad} data-our={our}>
                    <div className="lp-calc-valrow">
                        <span className="lbl">Your home's value</span>
                        <span className="val" data-calc-value>{fmt(v)}</span>
                    </div>
                    <input
                        type="range"
                        className="lp-calc-range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        data-calc-range
                        style={rangeStyle}
                        onChange={(e) => setValue(Number(e.target.value))}
                    />

                    <div className="lp-calc-fees">
                        <div className="lp-calc-fee strike">
                            <div className="k">Traditional ({rate(trad)}%)</div>
                            <div className="v" data-calc-trad>{fmt(tFee)}</div>
                        </div>
                        <div className="lp-calc-fee">
                            <div className="k">Our Fee ({rate(our)}%)</div>
                            <div className="v" data-calc-our>{fmt(oFee)}</div>
                        </div>
                    </div>

                    <div className="lp-calc-save">
                        <div className="k">{data.savings_label ?? 'You keep'}</div>
                        <div className="v" data-calc-save>{fmt(tFee - oFee)}</div>
                    </div>

                    {data.note && <p className="lp-calc-note">{data.note}</p>}
                    {data.cta_label && <a href="#hero" className="lp-btn">{data.cta_label}</a>}
                </div>
            </div>
        </section>
    );
}
