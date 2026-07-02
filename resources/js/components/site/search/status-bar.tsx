// The map's status controls. Each status (Active / Sold / Expired / Price
// Changed) is a segmented toggle in its own brand colour; when on it expands to
// an "All ▾" button that opens a days-on-market time-range dropdown — matching
// the EcoListing reference. The selected status drives the listing filter.
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { StatusKey } from './use-property-filters';

type Key = 'active' | 'sold' | 'expired' | 'changed';

const STATUSES: { key: Key; label: string; color: string; title: string }[] = [
    {
        key: 'active',
        label: 'Active',
        color: '#16a34a',
        title: 'Days on Market',
    },
    { key: 'sold', label: 'Sold', color: '#dc2626', title: 'Sold' },
    { key: 'expired', label: 'Expired', color: '#6b7280', title: 'Expired' },
    {
        key: 'changed',
        label: 'Price Changed',
        color: '#1e40af',
        title: 'Price Changed',
    },
];

const RANGES = [
    'All Time',
    'Today',
    'Last 3 Days',
    'Last 7 Days',
    'Last 30 Days',
    'Last 90 Days',
    'Last 180 Days',
    'Last 360 Days',
];

const Chevron = () => (
    <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

/** Maps the on-set to the single status our listing filter understands. */
function primaryStatus(on: Record<Key, boolean>): StatusKey {
    if (on.active) {
        return 'active';
    }

    if (on.sold) {
        return 'sold';
    }

    if (on.expired) {
        return 'expired';
    }

    if (on.changed) {
        return 'changed';
    }

    return 'all';
}

export function StatusBar({
    value,
    onChange,
}: {
    value: StatusKey;
    onChange: (s: StatusKey) => void;
}) {
    const [on, setOn] = useState<Record<Key, boolean>>({
        active: value === 'active' || value === 'all',
        sold: value === 'sold',
        expired: false,
        changed: value === 'changed',
    });
    const [range, setRange] = useState<Record<Key, string>>({
        active: 'All Time',
        sold: 'All Time',
        expired: 'All Time',
        changed: 'All Time',
    });
    const [open, setOpen] = useState<Key | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function close(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(null);
            }
        }
        document.addEventListener('mousedown', close);

        return () => document.removeEventListener('mousedown', close);
    }, []);

    function toggle(key: Key) {
        setOn((prev) => {
            const next = { ...prev, [key]: !prev[key] };
            onChange(primaryStatus(next));

            return next;
        });
        setOpen(null);
    }

    return (
        <div ref={ref} className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => {
                const isOn = on[s.key];

                return (
                    <div key={s.key} className="relative shrink-0">
                        <div
                            className="flex h-9 items-stretch overflow-hidden rounded-xl bg-white shadow-sm"
                            style={{
                                border: `1px solid ${isOn ? s.color : '#d1d5db'}`,
                            }}
                        >
                            <button
                                type="button"
                                aria-pressed={isOn}
                                onClick={() => toggle(s.key)}
                                className="flex items-center px-3.5 text-xs font-semibold whitespace-nowrap transition-colors hover:bg-gray-50"
                                style={{ color: isOn ? s.color : '#1f2937' }}
                            >
                                {s.label}
                            </button>
                            {isOn && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOpen((o) =>
                                            o === s.key ? null : s.key,
                                        )
                                    }
                                    className="flex items-center gap-1 px-3 text-xs font-semibold whitespace-nowrap text-white transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: s.color }}
                                >
                                    <span>
                                        {range[s.key] === 'All Time'
                                            ? 'All'
                                            : range[s.key]}
                                    </span>
                                    <Chevron />
                                </button>
                            )}
                        </div>

                        {open === s.key && (
                            <div className="absolute top-full left-0 z-[700] mt-2 w-64 rounded-2xl border border-gray-100 bg-white py-3 shadow-xl">
                                <div className="flex items-center justify-between px-5 pb-2">
                                    <span
                                        className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase"
                                        style={{ color: s.color }}
                                    >
                                        <span
                                            className="h-2 w-2 rounded-full"
                                            style={{ backgroundColor: s.color }}
                                        />
                                        {s.title}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRange((r) => ({
                                                ...r,
                                                [s.key]: 'All Time',
                                            }));
                                            setOpen(null);
                                        }}
                                        className="flex items-center gap-1 text-xs font-semibold"
                                        style={{ color: s.color }}
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="1 4 1 10 7 10" />
                                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                        </svg>
                                        Reset
                                    </button>
                                </div>
                                <ul className="max-h-72 overflow-y-auto">
                                    {RANGES.map((r) => {
                                        const sel = range[s.key] === r;

                                        return (
                                            <li key={r}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRange((prev) => ({
                                                            ...prev,
                                                            [s.key]: r,
                                                        }));
                                                        setOpen(null);
                                                    }}
                                                    className={cn(
                                                        'flex w-full items-center justify-between px-5 py-2 text-left text-[15px] hover:bg-gray-50',
                                                        sel
                                                            ? 'font-bold text-navy'
                                                            : 'text-gray-600',
                                                    )}
                                                >
                                                    {r}
                                                    {sel && (
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="text-navy"
                                                        >
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
