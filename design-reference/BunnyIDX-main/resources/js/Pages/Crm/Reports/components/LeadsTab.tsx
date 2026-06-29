import BarList from './BarList';
import Donut from './Donut';
import KpiCard from './KpiCard';
import Panel from './Panel';
import TrendChart from './TrendChart';
import { ReportPayload } from './types';
import { delta, formatNumber, REPORT_COLORS } from './util';

export default function LeadsTab({ report }: { report: ReportPayload }) {
    const s = report.summary;
    const topSource = report.leads.by_source[0];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="New Leads" value={formatNumber(s.new_leads)} deltaPct={delta(s.new_leads, s.new_leads_prev)} sub="vs. prev period" accent={REPORT_COLORS.primary} />
                <KpiCard label="Top Source" value={topSource ? topSource.label : '—'} sub={topSource ? `${formatNumber(topSource.value)} leads` : undefined} accent={REPORT_COLORS.purple} />
                <KpiCard label="Lead Types" value={formatNumber(report.leads.by_type.length)} sub="distinct types" accent={REPORT_COLORS.green} />
                <KpiCard label="Statuses" value={formatNumber(report.leads.by_status.length)} sub="distinct statuses" accent={REPORT_COLORS.amber} />
            </div>

            <Panel title="New Leads Over Time" subtitle="Contacts created in the selected period">
                <TrendChart data={report.trends.leads} color={REPORT_COLORS.primary} />
            </Panel>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Leads by Source" subtitle="Acquisition channel mix">
                    <Donut data={report.leads.by_source} centerLabel="Leads" />
                </Panel>
                <Panel title="Leads by Status" subtitle="Where leads sit in your process">
                    <BarList items={report.leads.by_status} color={REPORT_COLORS.primary} />
                </Panel>
            </div>

            <Panel title="Leads by Type" subtitle="Buyer, seller, investor and more">
                <BarList items={report.leads.by_type} color={REPORT_COLORS.purple} />
            </Panel>
        </div>
    );
}
