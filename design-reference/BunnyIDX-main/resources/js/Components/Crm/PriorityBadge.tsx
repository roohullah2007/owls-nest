const styles: Record<string, string> = {
    urgent: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    normal: 'bg-[#E4E7EB] text-[#5F656D]',
    low: 'bg-[#F3F4F6] text-[#5F656D]',
};

export default function PriorityBadge({ priority }: { priority: string }) {
    return (
        <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-bold tracking-wide rounded-full ${styles[priority] || styles.normal}`}>
            {priority}
        </span>
    );
}
