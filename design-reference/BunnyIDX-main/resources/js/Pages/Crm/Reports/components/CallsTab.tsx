import Avatar from '@/Components/Crm/Avatar';
import BarList from './BarList';
import HourHistogram from './HourHistogram';
import KpiCard from './KpiCard';
import Panel from './Panel';
import StackedActivityChart from './StackedActivityChart';
import { CallReport } from './types';
import { formatDuration, formatNumber, formatPercent, REPORT_COLORS } from './util';

export default function CallsTab({ calls, isTeam }: { calls: CallReport; isTeam: boolean }) {
    const s = calls.summary;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <KpiCard label="Total Calls" value={formatNumber(s.total)} sub={`${formatNumber(s.outbound)} out · ${formatNumber(s.inbound)} in`} accent={REPORT_COLORS.primary} />
                <KpiCard label="Connect Rate" value={formatPercent(s.connect_rate)} sub={`${formatNumber(s.connected)} connected`} accent={REPORT_COLORS.green} />
                <KpiCard label="Talk Time" value={formatDuration(s.talk_time_seconds)} accent={REPORT_COLORS.purple} />
                <KpiCard label="Avg Call" value={formatDuration(s.avg_duration_seconds)} sub="connected calls" accent={REPORT_COLORS.sky} />
                <KpiCard label="Voicemails" value={formatNumber(s.voicemails)} accent={REPORT_COLORS.amber} />
                <KpiCard label="No Answer" value={formatNumber(s.no_answer)} accent={REPORT_COLORS.pink} />
            </div>

            <Panel title="Call Volume Over Time" subtitle="Inbound vs. outbound calls logged">
                <StackedActivityChart
                    data={calls.trend}
                    series={[
                        { key: 'outbound', label: 'Outbound', color: REPORT_COLORS.primary },
                        { key: 'inbound', label: 'Inbound', color: REPORT_COLORS.green },
                    ]}
                    height={240}
                />
            </Panel>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Call Outcomes" subtitle="How calls resolved">
                    <BarList items={calls.outcomes} color={REPORT_COLORS.primary} emptyLabel="No calls logged in this period" />
                </Panel>
                <Panel title="Busiest Call Hours" subtitle="When calls happen during the day">
                    <HourHistogram data={calls.by_hour} />
                </Panel>
            </div>

            {isTeam && (
                <Panel title="Calls by Agent" subtitle="Volume, connect rate and talk time per agent" bodyClassName="">
                    <CallsByAgent rows={calls.by_agent} />
                </Panel>
            )}
        </div>
    );
}

function CallsByAgent({ rows }: { rows: CallReport['by_agent'] }) {
    if (!rows.length) {
        return <p className="py-10 text-center text-xs text-[#8B9096]">No calls logged by team members in this period.</p>;
    }
    const topCalls = Math.max(1, ...rows.map((r) => r.calls));

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
                <thead>
                    <tr className="border-b border-[#E4E7EB]">
                        <th className="px-5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-[#8B9096]">Agent</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#8B9096]">Calls</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#8B9096]">Connected</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#8B9096]">Connect %</th>
                        <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-[#8B9096]">Talk Time</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id} className="border-b border-[#F1F3F5] last:border-0 hover:bg-[#F9FAFB]">
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <Avatar id={r.id} name={r.name} size="sm" />
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] font-medium text-[#111315]">{r.name}</p>
                                        <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-[#F1F3F5]">
                                            <div className="h-full rounded-full bg-[#1693C9]" style={{ width: `${(r.calls / topCalls) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[#111315]">{formatNumber(r.calls)}</td>
                            <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[#111315]">{formatNumber(r.connected)}</td>
                            <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[#111315]">{formatPercent(r.connect_rate)}</td>
                            <td className="px-4 py-3 text-right text-[13px] tabular-nums text-[#111315]">{formatDuration(r.talk_time_seconds)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
