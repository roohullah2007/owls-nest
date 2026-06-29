import { useState } from 'react';
import { CATEGORY_PALETTE, formatNumber } from './util';

export interface DonutSlice {
    key: string;
    label: string;
    value: number;
    color?: string;
}

interface Props {
    data: DonutSlice[];
    size?: number;
    /** Label shown under the center total. */
    centerLabel?: string;
}

/** Donut chart with an interactive legend. */
export default function Donut({ data, size = 168, centerLabel = 'Total' }: Props) {
    const [active, setActive] = useState<number | null>(null);
    const total = data.reduce((s, d) => s + d.value, 0);

    const stroke = 22;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    let offset = 0;

    if (total === 0) {
        return <EmptyDonut size={size} centerLabel={centerLabel} />;
    }

    return (
        <div className="flex flex-wrap items-center gap-5">
            <div className="relative shrink-0" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F3" strokeWidth={stroke} />
                    {data.map((slice, i) => {
                        const color = slice.color || CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
                        const frac = slice.value / total;
                        const len = frac * c;
                        const dash = `${len} ${c - len}`;
                        const seg = (
                            <circle
                                key={slice.key}
                                cx={size / 2}
                                cy={size / 2}
                                r={r}
                                fill="none"
                                stroke={color}
                                strokeWidth={active === null || active === i ? stroke : stroke - 6}
                                strokeDasharray={dash}
                                strokeDashoffset={-offset}
                                opacity={active === null || active === i ? 1 : 0.4}
                                onMouseEnter={() => setActive(i)}
                                onMouseLeave={() => setActive(null)}
                                style={{ transition: 'stroke-width 120ms, opacity 120ms' }}
                            />
                        );
                        offset += len;
                        return seg;
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold tabular-nums text-[#111315]">
                        {active === null ? formatNumber(total) : formatNumber(data[active].value)}
                    </span>
                    <span className="max-w-[90px] truncate text-[10px] font-medium uppercase tracking-wider text-[#8B9096]">
                        {active === null ? centerLabel : data[active].label}
                    </span>
                </div>
            </div>

            <ul className="min-w-[140px] flex-1 space-y-1.5">
                {data.map((slice, i) => {
                    const color = slice.color || CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
                    const pct = Math.round((slice.value / total) * 100);
                    return (
                        <li
                            key={slice.key}
                            className="flex items-center justify-between gap-2 text-[12px]"
                            onMouseEnter={() => setActive(i)}
                            onMouseLeave={() => setActive(null)}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
                                <span className="truncate text-[#5F656D]">{slice.label}</span>
                            </span>
                            <span className="shrink-0 tabular-nums font-medium text-[#111315]">
                                {formatNumber(slice.value)} <span className="text-[#8B9096]">· {pct}%</span>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function EmptyDonut({ size, centerLabel }: { size: number; centerLabel: string }) {
    const stroke = 22;
    const r = (size - stroke) / 2;
    return (
        <div className="flex items-center justify-center" style={{ height: size }}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size}>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F3" strokeWidth={stroke} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-[#C8CCD1]">0</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[#C8CCD1]">{centerLabel}</span>
                </div>
            </div>
        </div>
    );
}
