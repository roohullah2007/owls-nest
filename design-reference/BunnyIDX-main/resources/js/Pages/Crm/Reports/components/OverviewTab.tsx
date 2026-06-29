import BarList from './BarList';
import Donut from './Donut';
import Funnel from './Funnel';
import KpiCard from './KpiCard';
import Panel from './Panel';
import StackedActivityChart from './StackedActivityChart';
import TrendChart from './TrendChart';
import { ReportPayload } from './types';
import { delta, formatCurrency, formatNumber, formatPercent, REPORT_COLORS } from './util';

const ICONS = {
    leads: <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />,
    pipeline: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />,
    won: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />,
    activity: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />,
};

function Icon({ d }: { d: React.ReactNode }) {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
            {d}
        </svg>
    );
}

export default function OverviewTab({ report }: { report: ReportPayload }) {
    const s = report.summary;

    return (
        <div className="space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard
                    label="New Leads"
                    value={formatNumber(s.new_leads)}
                    deltaPct={delta(s.new_leads, s.new_leads_prev)}
                    sub="vs. prev period"
                    icon={<Icon d={ICONS.leads} />}
                    accent={REPORT_COLORS.primary}
                />
                <KpiCard
                    label="Active Pipeline"
                    value={formatCurrency(s.active_pipeline_value)}
                    sub={`${formatNumber(s.active_deals)} open deals`}
                    icon={<Icon d={ICONS.pipeline} />}
                    accent={REPORT_COLORS.purple}
                />
                <KpiCard
                    label="Closed Volume"
                    value={formatCurrency(s.won_volume)}
                    deltaPct={delta(s.won_volume, s.won_volume_prev)}
                    sub={`${formatNumber(s.deals_won)} won`}
                    icon={<Icon d={ICONS.won} />}
                    accent={REPORT_COLORS.green}
                />
                <KpiCard
                    label="Win Rate"
                    value={formatPercent(s.win_rate)}
                    sub={`${formatNumber(s.deals_won)}W · ${formatNumber(s.deals_lost)}L`}
                    icon={<Icon d={ICONS.activity} />}
                    accent={REPORT_COLORS.amber}
                />
            </div>

            {/* Secondary KPI strip */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="GCI (Commission)" value={formatCurrency(s.gci)} accent={REPORT_COLORS.green} />
                <KpiCard label="Avg Deal Value" value={formatCurrency(s.avg_deal_value)} accent={REPORT_COLORS.blue} />
                <KpiCard
                    label="Avg Days to Close"
                    value={s.avg_days_to_close !== null ? `${s.avg_days_to_close}d` : '—'}
                    accent={REPORT_COLORS.sky}
                />
                <KpiCard label="Activities Logged" value={formatNumber(s.activities)} accent={REPORT_COLORS.pink} />
            </div>

            {/* Lead trend + source mix */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Panel title="New Leads Over Time" subtitle="Contacts created in the selected period" className="lg:col-span-2">
                    <TrendChart data={report.trends.leads} color={REPORT_COLORS.primary} />
                </Panel>
                <Panel title="Leads by Source" subtitle="Where your leads came from">
                    <Donut data={report.leads.by_source} centerLabel="Leads" />
                </Panel>
            </div>

            {/* Funnel + pipeline */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Lead Conversion Funnel" subtitle="From new lead to closed deal">
                    <Funnel stages={report.conversion} />
                </Panel>
                <Panel title="Closed Volume Over Time" subtitle="Value of deals won by close date">
                    <TrendChart data={report.trends.won_value} color={REPORT_COLORS.green} format={(v) => formatCurrency(v)} />
                </Panel>
            </div>

            {/* Activity overview */}
            <Panel title="Activity Volume" subtitle="Calls, emails, texts, notes and meetings logged over time">
                <StackedActivityChart
                    data={report.trends.activity}
                    series={[
                        { key: 'calls', label: 'Calls', color: REPORT_COLORS.primary },
                        { key: 'emails', label: 'Emails', color: REPORT_COLORS.purple },
                        { key: 'texts', label: 'Texts', color: REPORT_COLORS.green },
                        { key: 'notes', label: 'Notes', color: REPORT_COLORS.amber },
                        { key: 'meetings', label: 'Meetings', color: REPORT_COLORS.pink },
                    ]}
                />
            </Panel>

            {/* Status + type */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Leads by Status">
                    <BarList items={report.leads.by_status} color={REPORT_COLORS.primary} />
                </Panel>
                <Panel title="Leads by Type">
                    <BarList items={report.leads.by_type} color={REPORT_COLORS.purple} />
                </Panel>
            </div>
        </div>
    );
}
