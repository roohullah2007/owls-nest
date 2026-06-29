import { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';

export interface EditableTask {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    contactId: number;
    /** When provided the modal edits this task (PATCH) instead of creating one. */
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

export default function TaskFormModal({ isOpen, onClose, contactId, task = null }: Props) {
    const titleRef = useRef<HTMLInputElement>(null);
    const [reminderOffset, setReminderOffset] = useState('');
    const isEdit = !!task;

    const form = useForm({
        title: '',
        description: '',
        priority: 'normal',
        due_date: '',
        reminder_at: '' as string,
        taskable_type: 'contact',
        taskable_id: String(contactId),
    });

    useEffect(() => {
        if (isOpen) {
            form.clearErrors();
            // Edit: hydrate from the task; Create: reset to a blank contact task.
            if (task) {
                form.setData({
                    title: task.title ?? '',
                    description: task.description ?? '',
                    priority: task.priority ?? 'normal',
                    due_date: task.due_date ?? '',
                    reminder_at: '',
                    taskable_type: 'contact',
                    taskable_id: String(contactId),
                });
            } else {
                form.reset();
                form.setData('taskable_id', String(contactId));
            }
            setReminderOffset('');
            setTimeout(() => titleRef.current?.focus(), 200);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, task]);

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
            // Don't clobber an existing reminder when the user didn't touch the field.
            form.transform((data) => {
                const { taskable_type, taskable_id, ...rest } = data;
                if (!reminderOffset) {
                    const { reminder_at, ...keep } = rest;
                    return keep;
                }
                return rest;
            });
            form.patch(route('crm.tasks.update', task.id), {
                preserveScroll: true,
                onSuccess: () => handleClose(),
            });
            return;
        }
        form.post(route('crm.tasks.store'), {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    }

    const formId = 'contact-add-task-form';

    const footer = (
        <>
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

                    <div>
                        <FieldLabel htmlFor="task_description">Description</FieldLabel>
                        <textarea
                            id="task_description"
                            rows={3}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="Add details..."
                            className={inputClass + ' resize-none'}
                        />
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
                </div>
            </form>
        </SlideOverModal>
    );
}
