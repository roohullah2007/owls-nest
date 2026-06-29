interface StatItem {
    label: string;
    value: string;
    accent?: string;
}

interface Props {
    stats: StatItem[];
    columns?: number;
}

export default function StatStrip({ stats, columns }: Props) {
    const cols = columns || stats.length;

    return (
        <div
            className="grid border border-[#E4E7EB] bg-white rounded-xl overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
            {stats.map((stat, i) => (
                <div key={i} className="border-r border-[#E4E7EB] last:border-r-0 px-4 py-4">
                    <p className="whitespace-nowrap text-[10px] font-bold tracking-wider text-[#8B9096]">{stat.label}</p>
                    <p
                        className="mt-1.5 text-xl font-bold tabular-nums tracking-tight"
                        style={{ color: stat.accent || '#111315' }}
                    >
                        {stat.value}
                    </p>
                </div>
            ))}
        </div>
    );
}
