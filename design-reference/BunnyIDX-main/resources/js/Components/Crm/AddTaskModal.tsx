import { useEffect, useRef, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';

interface Contact {
    id: number;
    first_name: string;
    last_name: string;
}
interface Deal {
    id: number;
    title: string;
}

export interface EditableTask {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    due_at: string | null;
    due_date: string | null;
    reminder_at: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    contacts: Contact[];
    deals: Deal[];
    task?: EditableTask | null;
}

const REMINDER_OPTIONS = [
    { value: '', label: 'No reminder' },
    { value: '15', label: '15 min before' },
    { value: '30', label: '30 min before' },
    { value: '60', label: '1 hour before' },
    { value: '1440', label: '1 day before' },
    { value: '2880', label: '2 days before' },
];

function computeReminderAt(dueDate: string, offsetMinutes: string): string {
    if (!dueDate || !offsetMinutes) return '';
    const due = new Date(dueDate + 'T09:00:00');
    due.setMinutes(due.getMinutes() - parseInt(offsetMinutes, 10));
    return due.toISOString();
}

function deriveReminderOffset(dueDate: string | null, reminderAt: string | null): string {
    if (!dueDate || !reminderAt) return '';
    const due = new Date(dueDate + 'T09:00:00');
    const reminder = new Date(reminderAt);
    const diffMinutes = Math.round((due.getTime() - reminder.getTime()) / 60000);
    const match = REMINDER_OPTIONS.find((o) => o.value !== '' && parseInt(o.value, 10) === diffMinutes);
    return match ? match.value : '';
}

function toDateInput(value: string | null): string {
    if (!value) return '';
    // Accept both 'YYYY-MM-DD' and full ISO timestamps; strip to the date portion.
    return value.length >= 10 ? value.slice(0, 10) : value;
}

export default function AddTaskModal({ isOpen, onClose, contacts, deals, task }: Props) {
    const titleRef = useRef<HTMLInputElement>(null);
    const [reminderOffset, setReminderOffset] = useState('');
    const isEdit = !!task;

    const form = useForm({
        title: '',
        priority: 'normal',
        due_date: '',
        reminder_at: '' as string,
        taskable_type: '' as string,
        taskable_id: '' as string,
    });

    useEffect(() => {
        if (isOpen) {
            if (task) {
                const dueDate = toDateInput(task.due_date) || toDateInput(task.due_at);
                form.setData({
                    title: task.title ?? '',
                    priority: task.priority ?? 'normal',
                    due_date: dueDate,
                    reminder_at: task.reminder_at ?? '',
                    taskable_type: '',
                    taskable_id: '',
                });
                setReminderOffset(deriveReminderOffset(dueDate, task.reminder_at));
            } else {
                form.reset();
                setReminderOffset('');
            }
            form.clearErrors();
            setTimeout(() => titleRef.current?.focus(), 200);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, task?.id]);

    if (!isOpen) return null;

    function handleClose() {
        form.reset();
        form.clearErrors();
        setReminderOffset('');
        onClose();
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (isEdit && task) {
            form.patch(route('crm.tasks.update', task.id), {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
        } else {
            form.post(route('crm.tasks.store'), {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
        }
    }

    function handleDelete() {
        if (!task) return;
        if (!confirm('Delete this task? This cannot be undone.')) return;
        router.delete(route('crm.tasks.destroy', task.id), {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    }

    const formId = 'add-task-form';

    const footer = (
        <>
            {isEdit && (
                <button
                    type="button"
                    onClick={handleDelete}
                    className="h-8 px-3 text-[12px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded transition-colors mr-auto"
                >
                    Delete
                </button>
            )}
            <button
                type="button"
                onClick={handleClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                form={formId}
                disabled={!form.data.title.trim() || form.processing}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {form.processing ? 'Saving…' : isEdit ? 'Save' : 'Add Task'}
            </button>
        </>
    );

    return (
        <SlideOverModal title={isEdit ? 'Edit Task' : 'Add Task'} onClose={handleClose} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    <div>
                        <FieldLabel htmlFor="task_title">Title <span className="text-[#DC2626]">*</span></FieldLabel>
                        <input
                            id="task_title"
                            ref={titleRef}
                            type="text"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder="What needs to be done?"
                            className={inputClass}
                            required
                        />
                        {form.errors.title && <p className="mt-1 text-[11px] text-red-500">{form.errors.title}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="task_priority">Priority</FieldLabel>
                            <select
                                id="task_priority"
                                value={form.data.priority}
                                onChange={(e) => form.setData('priority', e.target.value)}
                                className={inputClass}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="task_due">Due date</FieldLabel>
                            <input
                                id="task_due"
                                type="date"
                                value={form.data.due_date}
                                onChange={(e) => {
                                    form.setData('due_date', e.target.value);
                                    if (reminderOffset) {
                                        form.setData('reminder_at', computeReminderAt(e.target.value, reminderOffset));
                                    }
                                }}
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="task_reminder" help="Set a due date first to enable reminders.">Reminder</FieldLabel>
                        <select
                            id="task_reminder"
                            value={reminderOffset}
                            onChange={(e) => {
                                setReminderOffset(e.target.value);
                                form.setData('reminder_at', computeReminderAt(form.data.due_date, e.target.value));
                            }}
                            disabled={!form.data.due_date}
                            className={inputClass + ' disabled:opacity-50 disabled:cursor-not-allowed'}
                        >
                            {REMINDER_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    {!isEdit && (
                        <div>
                            <FieldLabel htmlFor="task_link_type">Link to</FieldLabel>
                            <select
                                id="task_link_type"
                                value={form.data.taskable_type}
                                onChange={(e) => {
                                    form.setData('taskable_type', e.target.value);
                                    form.setData('taskable_id', '');
                                }}
                                className={inputClass}
                            >
                                <option value="">None</option>
                                <option value="contact">Contact</option>
                                <option value="deal">Deal</option>
                            </select>
                        </div>
                    )}

                    {!isEdit && form.data.taskable_type === 'contact' && (
                        <div>
                            <FieldLabel htmlFor="task_contact">Contact</FieldLabel>
                            <select
                                id="task_contact"
                                value={form.data.taskable_id}
                                onChange={(e) => form.setData('taskable_id', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select contact…</option>
                                {contacts.map((c) => (
                                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {!isEdit && form.data.taskable_type === 'deal' && (
                        <div>
                            <FieldLabel htmlFor="task_deal">Deal</FieldLabel>
                            <select
                                id="task_deal"
                                value={form.data.taskable_id}
                                onChange={(e) => form.setData('taskable_id', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select deal…</option>
                                {deals.map((d) => (
                                    <option key={d.id} value={d.id}>{d.title}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </form>
        </SlideOverModal>
    );
}
