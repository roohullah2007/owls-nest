import { formatShortDate } from '@/utils/dateFormatters';
import DashboardPanel from './DashboardPanel';
import type { Task } from './types';

const priorityStyles: Record<string, string> = {
    urgent: 'bg-[#DC2626] text-white',
    high: 'bg-[#D97706] text-white',
    normal: 'bg-[#5F656D] text-white',
    low: 'bg-[#8B9096] text-white',
};

export default function TasksDueTodayCard({ tasks }: { tasks: Task[] }) {
    return (
        <DashboardPanel title="Tasks Due Today" action={{ label: 'View all', href: route('crm.tasks.index') }}>
            {tasks.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-[#8B9096]">All caught up!</p>
            ) : (
                <div>
                    {tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-x-2 min-w-0">
                                <span className="truncate text-xs text-[#111315]">{task.title}</span>
                                <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium capitalize rounded-full ${priorityStyles[task.priority] || priorityStyles.normal}`}>
                                    {task.priority}
                                </span>
                            </div>
                            <span className="shrink-0 ml-3 text-[11px] tabular-nums text-[#8B9096]">
                                {task.due_at ? formatShortDate(task.due_at) : task.due_date ? formatShortDate(task.due_date) : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </DashboardPanel>
    );
}
