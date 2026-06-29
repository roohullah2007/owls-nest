import { router } from '@inertiajs/react';

interface Props {
    tasks: any[];
}

export default function TasksList({ tasks }: Props) {
    const pendingTasks = tasks.filter((t: any) => !t.is_completed);
    const completedTasks = tasks.filter((t: any) => t.is_completed);

    function handleToggle(taskId: number) {
        router.patch(route('crm.tasks.complete', taskId), {}, { preserveScroll: true });
    }

    function formatDue(dateStr: string | null): string | null {
        if (!dateStr) return null;
        const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function isOverdue(task: any): boolean {
        if (task.is_completed || !task.due_date) return false;
        return new Date(task.due_date + 'T23:59:59') < new Date();
    }

    if (pendingTasks.length === 0 && completedTasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center">
                <svg className="h-8 w-8 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <p className="mt-2 text-xs text-[#8B9096]">All caught up</p>
                <p className="text-[11px] text-[#C4C9D1] mt-0.5">Add a task with the + button</p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {pendingTasks.map((task: any) => (
                <div key={`t-${task.id}`} className="flex items-start gap-2.5 py-2 group">
                    <button onClick={() => handleToggle(task.id)} className="shrink-0 mt-0.5 h-4 w-4 rounded border border-[#D1D5DB] hover:border-[#111315] transition-colors" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#111315] truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            {task.due_date && (
                                <span className={`text-[11px] ${isOverdue(task) ? 'text-[#DC2626] font-medium' : 'text-[#8B9096]'}`}>{formatDue(task.due_date)}</span>
                            )}
                            {task.priority !== 'normal' && (
                                <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${task.priority === 'urgent' ? 'bg-[#DC2626] text-white' : task.priority === 'high' ? 'bg-[#D97706] text-white' : 'bg-[#F3F4F6] text-[#5F656D]'}`}>{task.priority}</span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            {completedTasks.length > 0 && (
                <>
                    <div className="pt-2 mt-1 border-t border-[#F3F4F6]"><p className="text-[11px] text-[#8B9096] mb-1">Completed</p></div>
                    {completedTasks.slice(0, 5).map((task: any) => (
                        <div key={`tc-${task.id}`} className="flex items-start gap-2.5 py-1.5 opacity-50">
                            <button onClick={() => handleToggle(task.id)} className="shrink-0 mt-0.5 h-4 w-4 rounded border border-[#059669] bg-[#059669] flex items-center justify-center">
                                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                            </button>
                            <p className="text-xs text-[#8B9096] line-through truncate">{task.title}</p>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
