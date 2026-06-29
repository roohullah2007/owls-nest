import { CATEGORY_PALETTE, formatNumber } from './util';

export interface BarItem {
    key: string;
    label: string;
    value: number;
    /** Optional secondary value (e.g. $ volume) shown on the right. */
    secondary?: string;
    color?: string;
}

interface Props {
    items: BarItem[];
    /** Single bar color; when omitted each bar uses the categorical palette. */
    color?: string;
    valueFormat?: (v: number) => string;
    emptyLabel?: string;
}

/** Ranked horizontal bars — used for source / status / type / outcome breakdowns. */
export default function BarList({ items, color, valueFormat = formatNumber, emptyLabel = 'No data for this period' }: Props) {
    if (!items.length) {
        return <p className="py-8 text-center text-xs text-[#8B9096]">{emptyLabel}</p>;
    }
    const max = Math.max(1, ...items.map((i) => i.value));

    return (
        <ul className="space-y-3">
            {items.map((item, i) => {
                const pct = (item.value / max) * 100;
                const barColor = color || item.color || CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
                return (
                    <li key={item.key}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                            <span className="truncate text-[#5F656D]">{item.label}</span>
                            <span className="shrink-0 tabular-nums font-semibold text-[#111315]">
                                {valueFormat(item.value)}
                                {item.secondary && <span className="ml-1.5 font-normal text-[#8B9096]">{item.secondary}</span>}
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F3F5]">
                            <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: barColor }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
