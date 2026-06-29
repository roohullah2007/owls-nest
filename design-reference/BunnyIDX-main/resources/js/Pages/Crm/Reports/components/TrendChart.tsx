import { useState } from 'react';
import { formatNumber, useMeasure } from './util';

export interface TrendPoint {
    label: string;
    value: number;
}

interface Props {
    data: TrendPoint[];
    color?: string;
    height?: number;
    /** Format the tooltip / axis value (defaults to formatNumber). */
    format?: (v: number) => string;
}

/**
 * Line + gradient area chart with hover crosshair and tooltip. Responsive:
 * measures its container and redraws to the available pixel width.
 */
export default function TrendChart({ data, color = '#1693C9', height = 220, format = formatNumber }: Props) {
    const [ref, width] = useMeasure<HTMLDivElement>();
    const [hover, setHover] = useState<number | null>(null);

    const padding = { top: 16, right: 16, bottom: 28, left: 44 };
    const innerW = Math.max(width - padding.left - padding.right, 0);
    const innerH = height - padding.top - padding.bottom;

    const max = Math.max(1, ...data.map((d) => d.value));
    const niceMax = niceCeil(max);
    const n = data.length;

    const x = (i: number) => (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => innerH - (v / niceMax) * innerH;

    const gradientId = `trend-grad-${color.replace('#', '')}`;
    const linePts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
    const areaPath =
        n > 0
            ? `M ${x(0)},${innerH} ${data.map((d, i) => `L ${x(i)},${y(d.value)}`).join(' ')} L ${x(n - 1)},${innerH} Z`
            : '';

    // Thin x labels so they never overlap.
    const labelStep = Math.ceil(n / Math.max(1, Math.floor(innerW / 60)));
    const gridLines = 4;

    return (
        <div ref={ref} className="relative w-full" style={{ height }}>
            {width > 0 && (
                <svg width={width} height={height} className="overflow-visible">
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <g transform={`translate(${padding.left},${padding.top})`}>
                        {/* Horizontal gridlines + y-axis labels */}
                        {Array.from({ length: gridLines + 1 }).map((_, i) => {
                            const v = (niceMax / gridLines) * (gridLines - i);
                            const gy = (innerH / gridLines) * i;
                            return (
                                <g key={i}>
                                    <line x1={0} y1={gy} x2={innerW} y2={gy} stroke="#EEF0F3" strokeWidth={1} />
                                    <text x={-10} y={gy + 3} textAnchor="end" className="fill-[#8B9096] text-[10px] tabular-nums">
                                        {format(v)}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Area + line */}
                        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
                        {n > 1 && <polyline points={linePts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}

                        {/* Dots + x labels */}
                        {data.map((d, i) => (
                            <g key={i}>
                                {(i % labelStep === 0 || i === n - 1) && (
                                    <text x={x(i)} y={innerH + 18} textAnchor="middle" className="fill-[#8B9096] text-[10px]">
                                        {d.label}
                                    </text>
                                )}
                                {hover === i && (
                                    <>
                                        <line x1={x(i)} y1={0} x2={x(i)} y2={innerH} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
                                        <circle cx={x(i)} cy={y(d.value)} r={4} fill="#fff" stroke={color} strokeWidth={2} />
                                    </>
                                )}
                            </g>
                        ))}

                        {/* Hover hit-areas */}
                        {data.map((d, i) => {
                            const band = n <= 1 ? innerW : innerW / (n - 1);
                            return (
                                <rect
                                    key={`hit-${i}`}
                                    x={x(i) - band / 2}
                                    y={0}
                                    width={band}
                                    height={innerH}
                                    fill="transparent"
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(null)}
                                />
                            );
                        })}
                    </g>
                </svg>
            )}

            {hover !== null && data[hover] && width > 0 && (
                <Tooltip
                    x={padding.left + x(hover)}
                    label={data[hover].label}
                    rows={[{ color, label: 'Total', value: format(data[hover].value) }]}
                    containerWidth={width}
                />
            )}
        </div>
    );
}

export function Tooltip({
    x,
    label,
    rows,
    containerWidth,
}: {
    x: number;
    label: string;
    rows: { color: string; label: string; value: string }[];
    containerWidth: number;
}) {
    // Keep the tooltip inside the container horizontally.
    const width = 150;
    const left = Math.min(Math.max(x - width / 2, 4), containerWidth - width - 4);
    return (
        <div
            className="pointer-events-none absolute top-1 z-10 rounded-lg border border-[#E4E7EB] bg-white px-3 py-2 shadow-lg"
            style={{ left, width }}
        >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8B9096]">{label}</p>
            {rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-[#5F656D]">
                        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: r.color }} />
                        {r.label}
                    </span>
                    <span className="font-semibold tabular-nums text-[#111315]">{r.value}</span>
                </div>
            ))}
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
