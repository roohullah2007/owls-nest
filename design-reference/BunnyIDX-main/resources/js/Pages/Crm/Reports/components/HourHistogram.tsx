import { formatNumber } from './util';

interface Props {
    /** 24 values, one per hour (index 0 = 12am … 23 = 11pm). */
    data: number[];
    color?: string;
}

const HOUR_LABELS: Record<number, string> = { 0: '12a', 6: '6a', 12: '12p', 18: '6p', 23: '11p' };

function hourTitle(h: number): string {
    const ampm = h < 12 ? 'am' : 'pm';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}${ampm}`;
}

/** Busiest-hours histogram for calls (24 bars, hover for the exact count). */
export default function HourHistogram({ data, color = '#1693C9' }: Props) {
    const max = Math.max(1, ...data);
    const peak = data.indexOf(Math.max(...data));

    return (
        <div>
            <div className="flex h-36 items-end gap-1">
                {data.map((v, h) => (
                    <div key={h} className="group relative flex flex-1 flex-col items-center justify-end">
                        <div
                            className="w-full rounded-sm transition-opacity hover:opacity-100"
                            style={{
                                height: `${(v / max) * 100}%`,
                                minHeight: v > 0 ? 3 : 1,
                                backgroundColor: v > 0 ? color : '#EEF0F3',
                                opacity: h === peak ? 1 : 0.55,
                            }}
                        />
                        <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-[#111315] px-2 py-1 text-[10px] font-medium text-white group-hover:block">
                            {hourTitle(h)} · {formatNumber(v)}
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-1.5 flex justify-between">
                {Array.from({ length: 24 }).map((_, h) => (
                    <span key={h} className="flex-1 text-center text-[9px] text-[#8B9096]">
                        {HOUR_LABELS[h] ?? ''}
                    </span>
                ))}
            </div>
        </div>
    );
}
