import { useEffect, useRef, useState } from 'react';

/** Brand palette used across the reports charts. */
export const REPORT_COLORS = {
    primary: '#1693C9',
    green: '#63A205',
    purple: '#7C36EE',
    amber: '#D97706',
    pink: '#DE3884',
    blue: '#2563EB',
    sky: '#0EA5E9',
    slate: '#64748B',
} as const;

/** Ordered palette for categorical series (sources, statuses, activity types). */
export const CATEGORY_PALETTE = [
    '#1693C9',
    '#7C36EE',
    '#63A205',
    '#D97706',
    '#DE3884',
    '#2563EB',
    '#0EA5E9',
    '#64748B',
    '#0D9488',
    '#9333EA',
];

export function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
}

/** Compact currency e.g. $1.2M, $940K, $0. */
export function formatCurrency(value: number, compact = true): string {
    if (!value) return '$0';
    if (compact && Math.abs(value) >= 1000) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(value);
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return `${value}%`;
}

/** Seconds → compact talk-time, e.g. 45s, 12m, 3h 24m. */
export function formatDuration(seconds: number): string {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
}

/** Signed percentage delta between current and previous; null when no baseline. */
export function delta(current: number, previous: number): number | null {
    if (!previous) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
}

/** Observe an element's pixel width (for responsive SVG charts). */
export function useMeasure<T extends HTMLElement = HTMLDivElement>(): [
    React.RefObject<T>,
    number,
] {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;
        const update = () => setWidth(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return [ref, width];
}
