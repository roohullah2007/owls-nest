import CrmLayout from '@/Layouts/CrmLayout';
import AddTaskModal from '@/Components/Crm/AddTaskModal';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import PriorityBadge from '@/Components/Crm/PriorityBadge';
import SearchInput from '@/Components/Crm/SearchInput';
import PillTabs from '@/Components/Crm/PillTabs';
import { formatRelative } from '@/utils/dateFormatters';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

interface Task {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    due_at: string | null;
    due_date: string | null;
    reminder_at: string | null;
    is_completed: boolean;
    completed_at: string | null;
    taskable?: any;
    taskable_type?: string | null;
}

interface Props {
    tasks: Task[] | { data: Task[]; links: any[] };
    filter: string;
    counts: { today: number; upcoming: number; overdue: number; completed: number };
    contacts: { id: number; uuid: string; first_name: string; last_name: string }[];
    deals: { id: number; title: string }[];
    scope?: string;
    canSeeAllTasks?: boolean;
}

const filterOptions = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'completed', label: 'Completed' },
];

export default function TasksIndex({ tasks, filter, counts, contacts, deals, scope = 'all', canSeeAllTasks = false }: Props) {
    const taskList = Array.isArray(tasks) ? tasks : tasks.data;
    const [showAdd, setShowAdd] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [query, setQuery] = useState('');

    const visibleTasks = useMemo(() => {
        if (!query.trim()) return taskList;
        const q = query.toLowerCase();
        return taskList.filter((t) =>
            t.title.toLowerCase().includes(q)
            || (t.description ?? '').toLowerCase().includes(q)
            || getTaskableLabel(t).toLowerCase().includes(q)
        );
    }, [taskList, query]);

    function toggleComplete(task: Task) {
        router.patch(route('crm.tasks.complete', task.id), {}, { preserveState: true });
    }

    function getTaskableLink(task: Task): string | null {
        if (!task.taskable) return null;
        if (task.taskable_type === 'App\\Models\\Contact' && task.taskable.uuid) {
            return route('crm.contacts.show', task.taskable.uuid);
        }
        if (task.taskable_type === 'App\\Models\\Deal') {
            return route('crm.deals.show', task.taskable.id);
        }
        if (task.taskable_type === 'App\\Models\\Listing') {
            return route('crm.listings.show', task.taskable.id);
        }
        return null;
    }

    function getTaskableLabel(task: Task): string {
        if (!task.taskable) return '';
        if (task.taskable_type === 'App\\Models\\Contact') {
            return `${task.taskable.first_name} ${task.taskable.last_name}`;
        }
        return task.taskable.title || task.taskable.name || '';
    }

    return (
        <CrmLayout>
            <Head title="Tasks" />

            {/* Content area — scrollable */}
            <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-6">
            <div className="space-y-4">

                {/* Page header — single row with everything inline */}
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-lg font-normal text-[#111315]">Tasks</h1>

                    {/* Scope tabs (My Tasks / All Team) */}
                    {canSeeAllTasks && (
                        <div className="hidden sm:flex items-center gap-0.5 ml-2 bg-white border border-[#C8CCD1] rounded-full p-1">
                            {[
                                { key: 'own', label: 'My Tasks' },
                                { key: 'all', label: 'All Team' },
                            ].map((s) => (
                                <button
                                    key={s.key}
                                    onClick={() => router.get(route('crm.tasks.index'), { filter, scope: s.key }, { preserveState: true })}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                                        scope === s.key ? 'bg-[#111315] text-white' : 'text-[#5F656D] hover:text-[#111315]'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Filter tabs (Today / Upcoming / Overdue / Completed) — backed by the shared PillTabs component */}
                    <PillTabs
                        className="hidden md:flex"
                        active={filter}
                        onChange={(key) => router.get(route('crm.tasks.index'), { filter: key, scope }, { preserveState: true })}
                        tabs={filterOptions.map((f) => ({
                            key: f.key,
                            label: f.label,
                            count: (counts as any)[f.key],
                        }))}
                    />

                    <div className="flex-1" />

                    {/* Search */}
                    <SearchInput
                        value={query}
                        onChange={setQuery}
                        placeholder="Search tasks..."
                    />

                    <PrimaryButton onClick={() => setShowAdd(true)} label="Add Task" />
                </div>

                {/* Mobile filter tabs */}
                <div className="flex md:hidden items-center gap-1 overflow-x-auto">
                    {filterOptions.map((f) => {
                        const isActive = filter === f.key;
                        const count = (counts as any)[f.key];
                        return (
                            <button
                                key={f.key}
                                onClick={() => router.get(route('crm.tasks.index'), { filter: f.key, scope }, { preserveState: true })}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                                    isActive ? 'bg-[#111315] text-white' : 'text-[#5F656D] border border-[#C8CCD1] bg-white'
                                }`}
                            >
                                {f.label}
                                {count > 0 && (
                                    <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-[#8B9096]'}`}>{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Task list */}
                <div className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-sm overflow-hidden">
                    {visibleTasks.length === 0 ? (
                        <div className="px-5 py-12 text-center">
                            <svg className="mx-auto h-10 w-10 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={0.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                            <p className="mt-3 text-sm text-[#8B9096]">No tasks found</p>
                            <button onClick={() => setShowAdd(true)} className="mt-1 text-xs font-medium text-[#1693C9] hover:underline">Create your first task</button>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#E4E7EB]">
                            {visibleTasks.map((task) => {
                                const dueStr = task.due_at || task.due_date;
                                const isOverdue = dueStr && !task.is_completed && new Date(dueStr) < new Date();
                                const taskableLink = getTaskableLink(task);
                                const taskableLabel = getTaskableLabel(task);

                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => setEditingTask(task)}
                                        className={`px-4 sm:px-5 py-3 cursor-pointer hover:bg-[#F8F9FA] transition-colors ${task.is_completed ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-start gap-x-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleComplete(task); }}
                                                className={`shrink-0 h-[18px] w-[18px] mt-0.5 rounded-md border-2 transition-colors ${
                                                    task.is_completed
                                                        ? 'bg-[#1693C9] border-[#1693C9]'
                                                        : 'border-[#D1D5DB] hover:border-[#1693C9]'
                                                }`}
                                            >
                                                {task.is_completed && (
                                                    <svg className="h-full w-full text-white" viewBox="0 0 16 16" fill="none">
                                                        <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[13px] font-medium ${task.is_completed ? 'line-through text-[#8B9096]' : 'text-[#111315]'}`}>
                                                        {task.title}
                                                    </span>
                                                    {task.reminder_at && !task.is_completed && (
                                                        <svg className="h-3.5 w-3.5 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                                                        </svg>
                                                    )}
                                                    <PriorityBadge priority={task.priority} />
                                                </div>
                                                {taskableLabel && (
                                                    taskableLink ? (
                                                        <Link
                                                            href={taskableLink}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="block mt-0.5 text-xs text-[#1693C9] hover:underline"
                                                        >
                                                            {taskableLabel}
                                                        </Link>
                                                    ) : (
                                                        <span className="block mt-0.5 text-xs text-[#8B9096]">
                                                            {taskableLabel}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            <span className={`shrink-0 ml-2 text-xs tabular-nums mt-0.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-[#5F656D]'}`}>
                                                {dueStr ? formatRelative(dueStr) : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
            </div>

            <AddTaskModal
                isOpen={showAdd}
                onClose={() => setShowAdd(false)}
                contacts={contacts}
                deals={deals}
            />

            <AddTaskModal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                contacts={contacts}
                deals={deals}
                task={editingTask}
            />
        </CrmLayout>
    );
}
