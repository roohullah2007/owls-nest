import Avatar from '@/Components/Crm/Avatar';
import { useState } from 'react';
import { LeaderboardRow } from './types';
import { formatCurrency, formatDuration, formatNumber, formatPercent } from './util';

interface Props {
    rows: LeaderboardRow[];
}

type SortKey = 'leads' | 'calls' | 'talk_time_seconds' | 'connect_rate' | 'activities' | 'deals_won' | 'volume' | 'gci';

interface Column {
    key: SortKey;
    label: string;
    format: (r: LeaderboardRow) => string;
    total: (rows: LeaderboardRow[]) => string;
}

const MEDALS = ['#E6B400', '#9AA4AE', '#CD7F32']; // gold, silver, bronze

/**
 * Agent production + activity leaderboard (team context). Sortable columns,
 * medals for the top three by the active sort, and a team totals footer.
 */
export default function Leaderboard({ rows }: Props) {
    const [sort, setSort] = useState<SortKey>('volume');

    if (!rows.length) {
        return <p className="py-10 text-center text-xs text-[#8B9096]">No team members to report on.</p>;
    }

    const columns: Column[] = [
        { key: 'leads', label: 'Leads', format: (r) => formatNumber(r.leads), total: (rs) => formatNumber(sum(rs, 'leads')) },
        { key: 'calls', label: 'Calls', format: (r) => formatNumber(r.calls), total: (rs) => formatNumber(sum(rs, 'calls')) },
        { key: 'talk_time_seconds', label: 'Talk Time', format: (r) => formatDuration(r.talk_time_seconds), total: (rs) => formatDuration(sum(rs, 'talk_time_seconds')) },
        { key: 'connect_rate', label: 'Connect %', format: (r) => formatPercent(r.connect_rate), total: () => '' },
        { key: 'activities', label: 'Activities', format: (r) => formatNumber(r.activities), total: (rs) => formatNumber(sum(rs, 'activities')) },
        { key: 'deals_won', label: 'Won', format: (r) => formatNumber(r.deals_won), total: (rs) => formatNumber(sum(rs, 'deals_won')) },
        { key: 'volume', label: 'Volume', format: (r) => formatCurrency(r.volume), total: (rs) => formatCurrency(sum(rs, 'volume')) },
        { key: 'gci', label: 'GCI', format: (r) => formatCurrency(r.gci), total: (rs) => formatCurrency(sum(rs, 'gci')) },
    ];

    const sorted = [...rows].sort((a, b) => (Number(b[sort] ?? 0)) - (Number(a[sort] ?? 0)));
    const topValue = Math.max(1, ...rows.map((r) => Number(r[sort] ?? 0)));

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
                <thead>
                    <tr className="border-b border-[#E4E7EB]">
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#8B9096]">Agent</th>
                        {columns.map((c) => (
                            <th key={c.key} className="px-4 py-2.5 text-right">
                                <button
                                    type="button"
                                    onClick={() => setSort(c.key)}
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                        sort === c.key ? 'text-[#1693C9]' : 'text-[#8B9096] hover:text-[#111315]'
                                    }`}
                                >
                                    {c.label}
                                    {sort === c.key && <span aria-hidden>▾</span>}
                                </button>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((r, i) => (
                        <tr key={r.id} className="border-b border-[#F1F3F5] hover:bg-[#F9FAFB]">
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
                                        style={
                                            i < 3
                                                ? { backgroundColor: MEDALS[i], color: '#fff' }
                                                : { color: '#8B9096' }
                                        }
                                    >
                                        {i + 1}
                                    </span>
                                    <Avatar id={r.id} name={r.name} size="sm" />
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] font-medium text-[#111315]">{r.name}</p>
                                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-[#F1F3F5]">
                                            <div
                                                className="h-full rounded-full bg-[#1693C9]"
                                                style={{ width: `${(Number(r[sort] ?? 0) / topValue) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </td>
                            {columns.map((c) => (
                                <td
                                    key={c.key}
                                    className={`px-4 py-3 text-right text-[13px] tabular-nums ${
                                        sort === c.key ? 'font-semibold text-[#111315]' : 'text-[#5F656D]'
                                    }`}
                                >
                                    {c.format(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t border-[#E4E7EB] bg-[#F9FAFB]">
                        <td className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">Team Total</td>
                        {columns.map((c) => (
                            <td key={c.key} className="px-4 py-2.5 text-right text-[12px] font-semibold tabular-nums text-[#111315]">
                                {c.total(rows)}
                            </td>
                        ))}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

function sum(rows: LeaderboardRow[], key: keyof LeaderboardRow): number {
    return rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
}
