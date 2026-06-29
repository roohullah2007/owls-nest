import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Contact } from './types';
import TaskFormModal, { EditableTask } from './TaskFormModal';
import AppointmentFormModal from './AppointmentFormModal';
import MeetingForm, { EditableMeeting } from '@/Components/Crm/MeetingForm';
import Avatar from '@/Components/Crm/Avatar';
import { formatDate as fmtDate } from '@/utils/dateFormatters';

function EditIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
    );
}

interface Props {
    contact: Contact;
}

const formatDate = (d: string | null): string => fmtDate(d, '—');

function formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isOverdue(t: any): boolean {
    if (t.is_completed || !t.due_date) return false;
    return new Date(t.due_date + 'T23:59:59') < new Date();
}

const priorityClass: Record<string, string> = {
    urgent: 'bg-[#FEE2E2] text-[#DC2626]',
    high: 'bg-[#FEF3C7] text-[#D97706]',
    normal: 'bg-[#F3F4F6] text-[#5F656D]',
    low: 'bg-[#F3F4F6] text-[#8B9096]',
};

const meetingTypeLabels: Record<string, string> = {
    showing: 'Showing', in_person: 'In Person', video: 'Video', phone: 'Phone',
};

export default function TasksApptsTab({ contact }: Props) {
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [showApptForm, setShowApptForm] = useState(false);
    const [editingTask, setEditingTask] = useState<EditableTask | null>(null);
    const [editingMeeting, setEditingMeeting] = useState<EditableMeeting | null>(null);

    const tasks = (contact.tasks || []) as any[];
    const meetings = (contact.meetings || []) as any[];
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
        return (a.due_date || '9999').localeCompare(b.due_date || '9999');
    });
    const sortedMeetings = [...meetings].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

    function toggleTask(taskId: number) {
        router.patch(route('crm.tasks.complete', taskId), {}, { preserveScroll: true });
    }
    function deleteTask(taskId: number) {
        if (!confirm('Delete this task?')) return;
        router.delete(route('crm.tasks.destroy', taskId), { preserveScroll: true });
    }
    function deleteMeeting(id: number) {
        if (!confirm('Delete this appointment?')) return;
        router.delete(route('crm.calendar.destroy', id), { preserveScroll: true });
    }

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-6">
            {/* Appointments */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[#111315]">Appointments</h2>
                        <p className="text-[13px] text-[#111315] mt-0.5">Showings, calls, meetings scheduled with this lead.</p>
                    </div>
                    <button onClick={() => setShowApptForm(true)} className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add appointment
                    </button>
                </div>

                <div className="bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F3F4F6] text-[11px] font-semibold text-[#5F656D] tracking-wider">
                            <tr>
                                <th className="text-left px-4 py-2.5">Title</th>
                                <th className="text-left px-4 py-2.5 w-32">Type</th>
                                <th className="text-left px-4 py-2.5 w-48">Date & Time</th>
                                <th className="text-right px-4 py-2.5 w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F3F4F6]">
                            {sortedMeetings.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-10 text-center text-xs text-[#8B9096]">No appointments yet.</td></tr>
                            ) : sortedMeetings.map((m) => {
                                const past = new Date(m.starts_at) < new Date();
                                return (
                                    <tr key={m.id} className="hover:bg-[#FAFBFC] transition-colors">
                                        <td className="px-4 py-3">
                                            <p className={`text-[13px] font-medium ${past ? 'text-[#8B9096]' : 'text-[#111315]'}`}>{m.title}</p>
                                            {m.location && <p className="text-[11px] text-[#8B9096] truncate mt-0.5">{m.location}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#FEF3C7] text-[#D97706]">{meetingTypeLabels[m.meeting_type] || m.meeting_type}</span>
                                        </td>
                                        <td className="px-4 py-3 text-[12px] text-[#5F656D]">{formatDateTime(m.starts_at)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setEditingMeeting({
                                                        id: m.id,
                                                        title: m.title,
                                                        description: m.description ?? null,
                                                        location: m.location ?? null,
                                                        meeting_type: m.meeting_type,
                                                        starts_at: m.starts_at,
                                                        ends_at: m.ends_at ?? null,
                                                        contact: { id: contact.id },
                                                        deal: m.deal_id ? { id: m.deal_id } : null,
                                                    })}
                                                    className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-colors"
                                                    title="Edit"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button onClick={() => deleteMeeting(m.id)} className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors" title="Delete">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Tasks */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-[15px] font-semibold text-[#111315]">Tasks</h2>
                        <p className="text-[13px] text-[#111315] mt-0.5">Follow-ups and to-dos for this lead.</p>
                    </div>
                    <button onClick={() => setShowTaskForm(true)} className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add task
                    </button>
                </div>

                <div className="bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F3F4F6] text-[11px] font-semibold text-[#5F656D] tracking-wider">
                            <tr>
                                <th className="text-left px-4 py-2.5 w-10"></th>
                                <th className="text-left px-4 py-2.5">Task</th>
                                <th className="text-left px-4 py-2.5 w-44">Assignee</th>
                                <th className="text-left px-4 py-2.5 w-32">Due</th>
                                <th className="text-right px-4 py-2.5 w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F3F4F6]">
                            {sortedTasks.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-xs text-[#8B9096]">No tasks yet.</td></tr>
                            ) : sortedTasks.map((t) => {
                                const overdue = isOverdue(t);
                                const assignee = t.user || t.assigned_to;
                                return (
                                    <tr key={t.id} className="hover:bg-[#FAFBFC] transition-colors">
                                        <td className="px-4 py-3">
                                            <button onClick={() => toggleTask(t.id)} className={`h-4 w-4 rounded border transition-colors ${t.is_completed ? 'border-[#059669] bg-[#059669]' : 'border-[#D1D5DB] hover:border-[#111315]'} flex items-center justify-center`}>
                                                {t.is_completed && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className={`text-[13px] ${t.is_completed ? 'text-[#8B9096] line-through' : 'text-[#111315]'} font-medium`}>{t.title}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {t.priority && t.priority !== 'normal' && (
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityClass[t.priority] || priorityClass.normal}`}>{t.priority}</span>
                                                )}
                                                {t.description && <span className="text-[11px] text-[#8B9096] truncate">{t.description}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {assignee ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <Avatar id={assignee.id} name={assignee.name} size="sm" />
                                                    <span className="text-[12px] text-[#5F656D] truncate">{assignee.name}</span>
                                                </span>
                                            ) : (
                                                <span className="text-[12px] text-[#8B9096]">—</span>
                                            )}
                                        </td>
                                        <td className={`px-4 py-3 text-[12px] ${overdue ? 'text-[#DC2626] font-medium' : 'text-[#5F656D]'}`}>{formatDate(t.due_date)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setEditingTask({
                                                        id: t.id,
                                                        title: t.title,
                                                        description: t.description ?? null,
                                                        priority: t.priority ?? 'normal',
                                                        due_date: t.due_date ?? null,
                                                    })}
                                                    className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-colors"
                                                    title="Edit"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button onClick={() => deleteTask(t.id)} className="h-7 w-7 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors" title="Delete">
                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <TaskFormModal
                isOpen={showTaskForm}
                onClose={() => setShowTaskForm(false)}
                contactId={contact.id}
            />

            <TaskFormModal
                isOpen={!!editingTask}
                onClose={() => setEditingTask(null)}
                contactId={contact.id}
                task={editingTask}
            />

            <AppointmentFormModal
                isOpen={showApptForm}
                onClose={() => setShowApptForm(false)}
                contactId={contact.id}
            />

            {editingMeeting && (
                <MeetingForm
                    meeting={editingMeeting}
                    onClose={() => setEditingMeeting(null)}
                />
            )}
        </div>
    );
}
