import BarList from './BarList';
import KpiCard from './KpiCard';
import Panel from './Panel';
import StackedActivityChart from './StackedActivityChart';
import { ReportPayload } from './types';
import { formatNumber, formatPercent, REPORT_COLORS } from './util';

export default function ActivityTab({ report }: { report: ReportPayload }) {
    const t = report.activity.totals;

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                <KpiCard label="Calls" value={formatNumber(t.calls)} accent={REPORT_COLORS.primary} />
                <KpiCard label="Emails" value={formatNumber(t.emails)} accent={REPORT_COLORS.purple} />
                <KpiCard label="Texts" value={formatNumber(t.texts)} accent={REPORT_COLORS.green} />
                <KpiCard label="Notes" value={formatNumber(t.notes)} accent={REPORT_COLORS.amber} />
                <KpiCard label="Meetings" value={formatNumber(t.meetings)} accent={REPORT_COLORS.pink} />
                <KpiCard label="Tasks Done" value={formatNumber(t.tasks_completed)} accent={REPORT_COLORS.sky} />
            </div>

            <Panel title="Activity Volume Over Time" subtitle="All logged touchpoints, stacked by channel">
                <StackedActivityChart
                    data={report.trends.activity}
                    series={[
                        { key: 'calls', label: 'Calls', color: REPORT_COLORS.primary },
                        { key: 'emails', label: 'Emails', color: REPORT_COLORS.purple },
                        { key: 'texts', label: 'Texts', color: REPORT_COLORS.green },
                        { key: 'notes', label: 'Notes', color: REPORT_COLORS.amber },
                        { key: 'meetings', label: 'Meetings', color: REPORT_COLORS.pink },
                    ]}
                    height={280}
                />
            </Panel>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel
                    title="Call Outcomes"
                    subtitle="How your outbound calls connected"
                    right={
                        report.activity.connected_rate !== null ? (
                            <span className="text-xs font-semibold text-[#63A205]">{formatPercent(report.activity.connected_rate)} connected</span>
                        ) : undefined
                    }
                >
                    <BarList items={report.activity.call_outcomes} color={REPORT_COLORS.primary} emptyLabel="No calls logged in this period" />
                </Panel>
                <Panel title="Call Direction" subtitle="Inbound vs. outbound">
                    <BarList items={report.activity.call_direction} color={REPORT_COLORS.purple} emptyLabel="No calls logged in this period" />
                </Panel>
            </div>
        </div>
    );
}
