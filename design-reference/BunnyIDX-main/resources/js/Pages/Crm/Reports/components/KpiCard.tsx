import { ReactNode } from 'react';

interface Props {
    label: string;
    value: string;
    /** Signed percent change vs. the previous period; null hides the badge. */
    deltaPct?: number | null;
    /** When true, a negative delta is good (e.g. days-to-close) and colored green. */
    invertDelta?: boolean;
    sub?: string;
    icon?: ReactNode;
    accent?: string;
}

export default function KpiCard({ label, value, deltaPct, invertDelta = false, sub, icon, accent = '#1693C9' }: Props) {
    const hasDelta = deltaPct !== null && deltaPct !== undefined;
    const positive = invertDelta ? (deltaPct ?? 0) < 0 : (deltaPct ?? 0) > 0;
    const neutral = (deltaPct ?? 0) === 0;

    return (
        <div className="rounded-xl border border-[#E4E7EB] bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">{label}</p>
                {icon && (
                    <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${accent}1a`, color: accent }}
                    >
                        {icon}
                    </span>
                )}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-[#111315]">{value}</p>
            <div className="mt-1 flex items-center gap-2">
                {hasDelta && !neutral && (
                    <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            positive ? 'bg-[#E8F5E0] text-[#4d7d04]' : 'bg-[#FCE8E8] text-[#C0392B]'
                        }`}
                    >
                        {(deltaPct ?? 0) > 0 ? '▲' : '▼'} {Math.abs(deltaPct ?? 0)}%
                    </span>
                )}
                {sub && <span className="text-[11px] text-[#8B9096]">{sub}</span>}
            </div>
        </div>
    );
}
