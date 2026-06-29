import { Link, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';
import type { Stats } from './types';

const statusMetrics: { key: string; label: string; color: string; bg: string }[] = [
    { key: 'new_lead', label: 'New Leads', color: '#1693C9', bg: 'rgba(0, 106, 255, 0.08)' },
    { key: 'active', label: 'Active', color: '#63A205', bg: 'rgba(99, 162, 5, 0.08)' },
    { key: 'client', label: 'Client', color: '#1693C9', bg: 'rgba(0, 106, 255, 0.08)' },
    { key: 'past_client', label: 'Past Client', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.08)' },
    { key: 'inactive', label: 'Inactive', color: '#8B9096', bg: 'rgba(139, 144, 150, 0.08)' },
];

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function GreetingHeader({ stats }: { stats: Stats }) {
    const { auth } = usePage<PageProps>().props;
    const firstName = auth.user.name.split(' ')[0];
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-lg font-normal text-[#111315]">{getGreeting()}, {firstName}</h1>
                <p className="mt-0.5 text-xs text-[#5F656D]">{dateStr}</p>
            </div>
            <div className="flex gap-2">
                {statusMetrics.map((m) => (
                    <Link
                        key={m.key}
                        href={route('crm.contacts.index', { status: m.key })}
                        title={`View ${m.label}`}
                        className="rounded-lg px-3 py-2 min-w-[80px] transition hover:opacity-80 hover:shadow-sm"
                        style={{ backgroundColor: m.bg, border: `1px solid ${m.color}40` }}
                    >
                        <p className="text-[10px] font-medium tracking-wide" style={{ color: m.color }}>{m.label}</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color: m.color }}>
                            {stats.leads_by_status?.[m.key] ?? 0}
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
