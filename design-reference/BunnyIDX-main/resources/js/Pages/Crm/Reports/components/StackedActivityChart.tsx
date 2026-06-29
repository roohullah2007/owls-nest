import { useState } from 'react';
import { Tooltip } from './TrendChart';
import { formatNumber, useMeasure } from './util';

export interface ActivitySeries {
    key: string;
    label: string;
    color: string;
}

interface Props<T extends { label: string }> {
    data: T[];
    series: ActivitySeries[];
    height?: number;
}

const num = (row: { label: string }, key: string): number => Number((row as Record<string, unknown>)[key]) || 0;

/** Stacked column chart for activity volume over time. */
export default function StackedActivityChart<T extends { label: string }>({ data, series, height = 240 }: Props<T>) {
    const [ref, width] = useMeasure<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);

    const padding = { top: 16, right: 16, bottom: 28, left: 40 };
    const innerW = Math.max(width - padding.left - padding.right, 0);
    const innerH = height - padding.top - padding.bottom;

    const totals = data.map((row) => series.reduce((sum, s) => sum + num(row, s.key), 0));
    const max = Math.max(1, ...totals);
    const niceMax = niceCeil(max);
    const n = data.length;

    const gap = n > 30 ? 1 : n > 14 ? 2 : 4;
    const band = n > 0 ? innerW / n : 0;
    const barW = Math.max(2, band - gap);
    const gridLines = 4;

    return (
        <div ref={ref} className="relative w-full" style={{ height }}>
            {width > 0 && (
                <svg width={width} height={height}>
                    <g transform={`translate(${padding.left},${padding.top})`}>
                        {Array.from({ length: gridLines + 1 }).map((_, i) => {
                            const v = (niceMax / gridLines) * (gridLines - i);
                            const gy = (innerH / gridLines) * i;
                            return (
                                <g key={i}>
                                    <line x1={0} y1={gy} x2={innerW} y2={gy} stroke="#EEF0F3" strokeWidth={1} />
                                    <text x={-8} y={gy + 3} textAnchor="end" className="fill-[#8B9096] text-[10px] tabular-nums">
                                        {formatNumber(v)}
                                    </text>
                                </g>
                            );
                        })}

                        {data.map((row, i) => {
                            const cx = band * i + (band - barW) / 2;
                            let yCursor = innerH;
                            const isHover = hover === i;
                            return (
                                <g
                                    key={i}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(null)}
                                    style={{ cursor: 'default' }}
                                >
                                    <rect x={band * i} y={0} width={band} height={innerH} fill={isHover ? '#F7F8FB' : 'transparent'} />
                                    {series.map((s) => {
                                        const val = num(row, s.key);
                                        const h = (val / niceMax) * innerH;
                                        yCursor -= h;
                                        return h > 0 ? (
                                            <rect key={s.key} x={cx} y={yCursor} width={barW} height={h} fill={s.color} rx={1} opacity={isHover ? 1 : 0.92} />
                                        ) : null;
                                    })}
                                    {(i % Math.ceil(n / Math.max(1, Math.floor(innerW / 60))) === 0 || i === n - 1) && (
                                        <text x={band * i + band / 2} y={innerH + 18} textAnchor="middle" className="fill-[#8B9096] text-[10px]">
                                            {row.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                </svg>
            )}

            {hover !== null && data[hover] && width > 0 && (
                <Tooltip
                    x={padding.left + band * hover + band / 2}
                    label={data[hover].label}
                    rows={series
                        .map((s) => ({ color: s.color, label: s.label, value: formatNumber(num(data[hover], s.key)) }))
                        .filter((r) => r.value !== '0')}
                    containerWidth={width}
                />
            )}
        </div>
    );
}

function niceCeil(max: number): number {
    if (max <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    const n = max / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
}
