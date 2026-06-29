// Two-thumb range slider used by the Price / Year / Sqft / Lot filter panels.
// Controlled: the parent owns the [min,max] tuple. Thumb visuals come from the
// `.fp-*` rules in app.css (pseudo-elements can't be expressed as utilities).
import type { ChangeEvent } from 'react';

const HIST = [
    35, 60, 95, 70, 45, 72, 50, 38, 44, 66, 52, 40, 30, 46, 34, 26, 38, 30, 22,
    16, 12, 18, 12, 10, 14, 9, 12, 8, 11, 7, 9, 6, 8, 6, 7, 5, 7, 5, 6, 5,
];

interface DualRangeSliderProps {
    min: number;
    max: number;
    step: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    /** Labels under the rail, e.g. ["$0", "$10M+"]. */
    ends: [string, string];
    showHistogram?: boolean;
}

export function DualRangeSlider({
    min,
    max,
    step,
    value,
    onChange,
    ends,
    showHistogram = false,
}: DualRangeSliderProps) {
    const [a, b] = value;
    const pct = (v: number) => ((v - min) / (max - min)) * 100;

    function handleMin(e: ChangeEvent<HTMLInputElement>) {
        let next = Number(e.target.value);

        if (next > b - step) {
            next = b - step;
        }

        onChange([Math.max(min, next), b]);
    }
    function handleMax(e: ChangeEvent<HTMLInputElement>) {
        let next = Number(e.target.value);

        if (next < a + step) {
            next = a + step;
        }

        onChange([a, Math.min(max, next)]);
    }

    return (
        <div className="fp-range">
            {showHistogram && (
                <div className="fp-hist">
                    {HIST.map((h, i) => (
                        <i key={i} style={{ height: `${h}%` }} />
                    ))}
                </div>
            )}
            <div className="fp-slider">
                <div className="fp-rail" />
                <div
                    className="fp-fill"
                    style={{
                        left: `${pct(a)}%`,
                        width: `${pct(b) - pct(a)}%`,
                    }}
                />
                <input
                    type="range"
                    className="fp-r"
                    min={min}
                    max={max}
                    step={step}
                    value={a}
                    onChange={handleMin}
                    aria-label="Minimum"
                />
                <input
                    type="range"
                    className="fp-r"
                    min={min}
                    max={max}
                    step={step}
                    value={b}
                    onChange={handleMax}
                    aria-label="Maximum"
                />
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-gray-400">
                <span>{ends[0]}</span>
                <span>{ends[1]}</span>
            </div>
        </div>
    );
}
