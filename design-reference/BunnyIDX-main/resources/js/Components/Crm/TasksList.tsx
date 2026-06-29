import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Task {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    due_at: string | null;
    due_date: string | null;
    is_completed: boolean;
    completed_at: string | null;
    taskable?: { id: number; first_name?: string; last_name?: string; title?: string } | null;
    taskable_type?: string | null;
}

interface Props {
    tasks: Task[];
    taskableType?: 'contact' | 'deal' | 'listing';
    taskableId?: number;
    showAddForm?: boolean;
}

const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
};

export default function TasksList({ tasks, taskableType, taskableId, showAddForm = true }: Props) {
    const [showForm, setShowForm] = useState(false);
    const form = useForm({
        title: '',
        description: '',
        priority: 'normal',
        due_date: '',
        taskable_type: taskableType || '',
        taskable_id: taskableId || '',
    });

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('crm.tasks.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('title', 'description', 'due_date');
                setShowForm(false);
            },
        });
    }

    function handleToggle(taskId: number) {
        router.patch(route('crm.tasks.complete', taskId), {}, { preserveScroll: true });
    }

    function handleDelete(taskId: number) {
        router.delete(route('crm.tasks.destroy', taskId), { preserveScroll: true });
    }

    function formatDue(task: Task): string | null {
        if (task.due_at) return new Date(task.due_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (task.due_date) return new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return null;
    }

    function isOverdue(task: Task): boolean {
        if (task.is_completed) return false;
        const now = new Date();
        if (task.due_at) return new Date(task.due_at) < now;
        if (task.due_date) return new Date(task.due_date + 'T23:59:59') < now;
        return false;
    }

    return (
        <div>
            {showAddForm && (
                <div className="mb-4">
                    {!showForm ? (
                        <button
                            onClick={() => setShowForm(true)}
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                        >
                            Add Task
                        </button>
                    ) : (
                        <form onSubmit={handleAdd} className="rounded-lg border border-gray-200 p-4">
                            <input
                                type="text"
                                value={form.data.title}
                                onChange={(e) => form.setData('title', e.target.value)}
                                placeholder="Task title"
                                className="w-full rounded-md border-gray-300 text-sm"
                                required
                            />
                            <textarea
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                                placeholder="Description (optional)"
                                rows={2}
                                className="mt-2 w-full rounded-md border-gray-300 text-sm"
                            />
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <select
                                    value={form.data.priority}
                                    onChange={(e) => form.setData('priority', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm"
                                >
                                    <option value="low">Low</option>
                                    <option value="normal">Normal</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                                <input
                                    type="date"
                                    value={form.data.due_date}
                                    onChange={(e) => form.setData('due_date', e.target.value)}
                                    className="rounded-md border-gray-300 text-sm"
                                />
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-500">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-500"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {tasks.length === 0 ? (
                <p className="text-sm text-gray-500">No tasks</p>
            ) : (
                <ul className="space-y-2">
                    {tasks.map((task) => (
                        <li
                            key={task.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 ${
                                task.is_completed ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'
                            }`}
                        >
                            <button
                                onClick={() => handleToggle(task.id)}
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                    task.is_completed
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-gray-300 hover:border-gray-400'
                                }`}
                            >
                                {task.is_completed && (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                )}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                        {task.title}
                                    </span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${priorityColors[task.priority]}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                {task.description && (
                                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{task.description}</p>
                                )}
                                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                                    {formatDue(task) && (
                                        <span className={isOverdue(task) ? 'text-red-500 font-medium' : ''}>
                                            Due {formatDue(task)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => handleDelete(task.id)} className="text-xs text-gray-300 hover:text-red-500" title="Delete">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
