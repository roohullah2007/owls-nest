import BarList from './BarList';
import KpiCard from './KpiCard';
import Panel from './Panel';
import TrendChart from './TrendChart';
import { BarItem } from './BarList';
import { ReportPayload } from './types';
import { delta, formatCurrency, formatNumber, formatPercent, REPORT_COLORS } from './util';

export default function DealsTab({ report }: { report: ReportPayload }) {
    const s = report.summary;
    const p = report.pipeline;

    const typeItems: BarItem[] = p.won_by_type.map((t) => ({
        key: t.key,
        label: t.label,
        value: t.count,
        secondary: formatCurrency(t.value),
    }));

    const projectedItems: BarItem[] = p.projected.map((row) => ({
        key: row.label,
        label: row.label,
        value: row.value,
    }));

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="Active Pipeline" value={formatCurrency(s.active_pipeline_value)} sub={`${formatNumber(s.active_deals)} open`} accent={REPORT_COLORS.purple} />
                <KpiCard label="Closed Volume" value={formatCurrency(s.won_volume)} deltaPct={delta(s.won_volume, s.won_volume_prev)} sub={`${formatNumber(s.deals_won)} won`} accent={REPORT_COLORS.green} />
                <KpiCard label="Win Rate" value={formatPercent(s.win_rate)} sub={`${formatNumber(s.deals_won)}W · ${formatNumber(s.deals_lost)}L`} accent={REPORT_COLORS.amber} />
                <KpiCard label="Avg Days to Close" value={s.avg_days_to_close !== null ? `${s.avg_days_to_close}d` : '—'} accent={REPORT_COLORS.sky} />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Closed Volume Over Time" subtitle="Value of deals won by close date">
                    <TrendChart data={report.trends.won_value} color={REPORT_COLORS.green} format={(v) => formatCurrency(v)} />
                </Panel>
                <Panel title="Deals Won Over Time" subtitle="Count of deals closed-won">
                    <TrendChart data={report.trends.won_count} color={REPORT_COLORS.primary} />
                </Panel>
            </div>

            {/* Pipeline stage breakdown — current open deals per stage */}
            {p.pipelines.map((pipeline) => {
                const stageItems: BarItem[] = pipeline.stages.map((st) => ({
                    key: String(st.id),
                    label: st.name,
                    value: st.count,
                    secondary: formatCurrency(st.value),
                    color: st.color || REPORT_COLORS.primary,
                }));
                const total = pipeline.stages.reduce((sum, st) => sum + st.value, 0);
                return (
                    <Panel
                        key={pipeline.id}
                        title={`${pipeline.name} · Open Deals by Stage`}
                        subtitle="Current snapshot of open pipeline"
                        right={<span className="text-xs font-semibold text-[#111315]">{formatCurrency(total)}</span>}
                    >
                        <BarList items={stageItems} valueFormat={formatNumber} emptyLabel="No open deals in this pipeline" />
                    </Panel>
                );
            })}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Panel title="Projected Income" subtitle="Open deal value by expected close month">
                    <BarList items={projectedItems} color={REPORT_COLORS.purple} valueFormat={(v) => formatCurrency(v)} emptyLabel="No open deals with an expected close date" />
                </Panel>
                <Panel title="Won Deals by Type" subtitle="Closed-won deals in the period">
                    <BarList items={typeItems} color={REPORT_COLORS.green} emptyLabel="No deals won in this period" />
                </Panel>
            </div>
        </div>
    );
}
