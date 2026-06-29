import CrmLayout from '@/Layouts/CrmLayout';
import Select from '@/Components/Crm/Select';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import ActivityTab from './components/ActivityTab';
import AgentsTab from './components/AgentsTab';
import CallsTab from './components/CallsTab';
import DealsTab from './components/DealsTab';
import LeadsTab from './components/LeadsTab';
import OverviewTab from './components/OverviewTab';
import { AgentOption, ReportFilters, ReportPayload } from './components/types';

interface Props {
    report: ReportPayload;
    filters: ReportFilters;
    agents: AgentOption[];
}

const RANGES: { key: string; label: string }[] = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '90D' },
    { key: 'mtd', label: 'MTD' },
    { key: 'qtd', label: 'QTD' },
    { key: 'ytd', label: 'YTD' },
    { key: '12m', label: '12M' },
];

type TabKey = 'overview' | 'leads' | 'deals' | 'calls' | 'activity' | 'agents';

export default function ReportsIndex({ report, filters, agents }: Props) {
    const [tab, setTab] = useState<TabKey>('overview');
    const isTeam = filters.context === 'team';
    const [customStart, setCustomStart] = useState(filters.start);
    const [customEnd, setCustomEnd] = useState(filters.end);

    const reload = (params: Record<string, string | number | null>) => {
        router.get(route('crm.reports.index'), cleanParams({ range: filters.range, agent: filters.agent, ...params }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['report', 'filters', 'agents'],
        });
    };

    const setRange = (range: string) => reload({ range, start: null, end: null });
    const applyCustom = () => reload({ range: 'custom', start: customStart, end: customEnd });
    const setAgent = (agent: string) => reload({ agent: agent === 'all' ? null : Number(agent) });

    const tabs: { key: TabKey; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'leads', label: 'Leads' },
        { key: 'deals', label: 'Deals' },
        { key: 'calls', label: 'Calls' },
        { key: 'activity', label: 'Activity' },
        ...(isTeam ? [{ key: 'agents' as TabKey, label: 'Agents' }] : []),
    ];

    const agentOptions = [
        { value: 'all', label: 'Whole Team' },
        ...agents.map((a) => ({ value: String(a.id), label: a.name })),
    ];

    return (
        <CrmLayout>
            <Head title="Reports" />
            <div className="mx-auto max-w-[1400px] p-6">
                {/* Header */}
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-[#111315]">Reports</h1>
                        <p className="mt-0.5 text-xs text-[#5F656D]">
                            {isTeam ? 'Team performance' : 'Your performance'} · {formatRangeLabel(filters)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isTeam && (
                            <Select
                                value={filters.agent ? String(filters.agent) : 'all'}
                                onChange={setAgent}
                                options={agentOptions}
                                menuAlign="right"
                            />
                        )}
                        <RangePills active={filters.range} onChange={setRange} />
                    </div>
                </div>

                {/* Custom range row */}
                {filters.range === 'custom' && (
                    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-[#E4E7EB] bg-white p-4 shadow-sm">
                        <DateField label="From" value={customStart} onChange={setCustomStart} />
                        <DateField label="To" value={customEnd} onChange={setCustomEnd} />
                        <button
                            type="button"
                            onClick={applyCustom}
                            className="h-9 rounded-[4px] bg-[#1693C9] px-4 text-xs font-medium text-white transition-colors hover:bg-[#1380AF]"
                        >
                            Apply
                        </button>
                    </div>
                )}

                {/* Tab nav */}
                <div className="mb-5 flex items-center gap-1 border-b border-[#E4E7EB]">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => setTab(t.key)}
                            className={`-mb-px border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                                tab === t.key
                                    ? 'border-[#1693C9] text-[#111315]'
                                    : 'border-transparent text-[#8B9096] hover:text-[#111315]'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {tab === 'overview' && <OverviewTab report={report} />}
                {tab === 'leads' && <LeadsTab report={report} />}
                {tab === 'deals' && <DealsTab report={report} />}
                {tab === 'calls' && <CallsTab calls={report.calls} isTeam={isTeam} />}
                {tab === 'activity' && <ActivityTab report={report} />}
                {tab === 'agents' && isTeam && <AgentsTab report={report} />}
            </div>
        </CrmLayout>
    );
}

function RangePills({ active, onChange }: { active: string; onChange: (r: string) => void }) {
    const all = [...RANGES, { key: 'custom', label: 'Custom' }];
    return (
        <div className="inline-flex h-9 items-center gap-0.5 rounded-[4px] border border-[#E4E7EB] bg-white p-1">
            {all.map((r) => (
                <button
                    key={r.key}
                    type="button"
                    onClick={() => onChange(r.key)}
                    className={`h-full rounded-[4px] px-2.5 text-[11px] font-medium transition-colors ${
                        active === r.key ? 'bg-[#1693C9] text-white shadow-sm' : 'text-[#111315] hover:bg-[#F3F4F6]'
                    }`}
                >
                    {r.label}
                </button>
            ))}
        </div>
    );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[#5F656D]">{label}</span>
            <input
                type="date"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 rounded-[4px] border border-[#C8CCD1] px-2 text-[13px] text-[#111315] focus:border-[#1693C9] focus:ring-0"
            />
        </label>
    );
}

function cleanParams(params: Record<string, string | number | null>): Record<string, string | number> {
    return Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''),
    ) as Record<string, string | number>;
}

function formatRangeLabel(filters: ReportFilters): string {
    const fmt = (d: string) =>
        new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(filters.start)} – ${fmt(filters.end)}`;
}
