import KpiCard from './KpiCard';
import Leaderboard from './Leaderboard';
import Panel from './Panel';
import { ReportPayload } from './types';
import { formatCurrency, formatDuration, formatNumber, REPORT_COLORS } from './util';

export default function AgentsTab({ report }: { report: ReportPayload }) {
    const rows = report.leaderboard;
    const totalVolume = rows.reduce((s, r) => s + r.volume, 0);
    const totalGci = rows.reduce((s, r) => s + r.gci, 0);
    const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
    const totalCalls = rows.reduce((s, r) => s + r.calls, 0);
    const totalTalk = rows.reduce((s, r) => s + r.talk_time_seconds, 0);
    const totalActivities = rows.reduce((s, r) => s + r.activities, 0);

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <KpiCard label="Team Volume" value={formatCurrency(totalVolume)} accent={REPORT_COLORS.green} />
                <KpiCard label="Team GCI" value={formatCurrency(totalGci)} accent={REPORT_COLORS.primary} />
                <KpiCard label="Team Leads" value={formatNumber(totalLeads)} accent={REPORT_COLORS.purple} />
                <KpiCard label="Team Calls" value={formatNumber(totalCalls)} accent={REPORT_COLORS.sky} />
                <KpiCard label="Team Talk Time" value={formatDuration(totalTalk)} accent={REPORT_COLORS.pink} />
                <KpiCard label="Team Activities" value={formatNumber(totalActivities)} accent={REPORT_COLORS.amber} />
            </div>

            <Panel title="Agent Leaderboard" subtitle="Ranked by closed volume in the selected period" bodyClassName="">
                <Leaderboard rows={rows} />
            </Panel>
        </div>
    );
}
