import { useForm, router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import DateTimeField from '@/Components/Crm/DateTimeField';
import { localDateTimeToIso } from '@/utils/dateFormatters';

export interface EditableMeeting {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    meeting_type: string;
    starts_at: string;
    ends_at: string | null;
    contact?: { id: number } | null;
    deal?: { id: number } | null;
}

interface Props {
    contactId?: number;
    dealId?: number;
    contacts?: { id: number; first_name: string; last_name: string }[];
    deals?: { id: number; title: string }[];
    onClose: () => void;
    meeting?: EditableMeeting | null;
}

function toLocalDateTime(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MeetingForm({ contactId, dealId, contacts, deals, onClose, meeting }: Props) {
    const titleRef = useRef<HTMLInputElement>(null);
    const isEdit = !!meeting;

    const form = useForm({
        contact_id: (meeting?.contact?.id ?? contactId ?? '') as number | string,
        deal_id: (meeting?.deal?.id ?? dealId ?? '') as number | string,
        title: meeting?.title ?? '',
        description: meeting?.description ?? '',
        location: meeting?.location ?? '',
        meeting_type: meeting?.meeting_type ?? 'in_person',
        starts_at: toLocalDateTime(meeting?.starts_at ?? null),
        ends_at: toLocalDateTime(meeting?.ends_at ?? null),
        reminder_minutes: '' as string,
    });

    useEffect(() => {
        const t = setTimeout(() => titleRef.current?.focus(), 200);
        return () => clearTimeout(t);
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Store the local datetime-local inputs as UTC; the form re-hydrates them
        // back to local on edit via toLocalDateTime, keeping the round-trip correct.
        form.transform((data) => ({
            ...data,
            starts_at: localDateTimeToIso(data.starts_at),
            ends_at: localDateTimeToIso(data.ends_at),
        }));
        if (isEdit && meeting) {
            form.patch(route('crm.calendar.update', meeting.id), {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        } else {
            form.post(route('crm.calendar.store'), {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    }

    function handleDelete() {
        if (!meeting) return;
        if (!confirm('Delete this event? This cannot be undone.')) return;
        router.delete(route('crm.calendar.destroy', meeting.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    const formId = 'schedule-meeting-form';

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
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                form={formId}
                disabled={form.processing || !form.data.title.trim() || !form.data.starts_at}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {form.processing ? (isEdit ? 'Saving…' : 'Scheduling…') : (isEdit ? 'Save' : 'Schedule')}
            </button>
        </>
    );

    return (
        <SlideOverModal title={isEdit ? 'Edit Event' : 'Schedule Meeting'} onClose={onClose} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    <div>
                        <FieldLabel htmlFor="m_title">Title <span className="text-[#DC2626]">*</span></FieldLabel>
                        <input
                            id="m_title"
                            ref={titleRef}
                            type="text"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            className={inputClass}
                            placeholder="Meeting title"
                            required
                        />
                        {form.errors.title && <p className="mt-1 text-[11px] text-red-500">{form.errors.title}</p>}
                    </div>

                    {(contacts || deals) && (
                        <div className="grid grid-cols-2 gap-3">
                            {contacts && (
                                <div>
                                    <FieldLabel htmlFor="m_contact">Contact</FieldLabel>
                                    <select
                                        id="m_contact"
                                        value={form.data.contact_id}
                                        onChange={(e) => form.setData('contact_id', e.target.value)}
                                        className={inputClass}
                                        disabled={isEdit}
                                    >
                                        <option value="">None</option>
                                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                                    </select>
                                </div>
                            )}
                            {deals && (
                                <div>
                                    <FieldLabel htmlFor="m_deal">Deal</FieldLabel>
                                    <select
                                        id="m_deal"
                                        value={form.data.deal_id}
                                        onChange={(e) => form.setData('deal_id', e.target.value)}
                                        className={inputClass}
                                        disabled={isEdit}
                                    >
                                        <option value="">None</option>
                                        {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="m_type">Type <span className="text-[#DC2626]">*</span></FieldLabel>
                            <select
                                id="m_type"
                                value={form.data.meeting_type}
                                onChange={(e) => form.setData('meeting_type', e.target.value)}
                                className={inputClass}
                            >
                                <option value="in_person">In Person</option>
                                <option value="phone">Phone</option>
                                <option value="video">Video</option>
                                <option value="showing">Showing</option>
                                <option value="open_house">Open House</option>
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="m_location">Location</FieldLabel>
                            <input
                                id="m_location"
                                type="text"
                                value={form.data.location}
                                onChange={(e) => form.setData('location', e.target.value)}
                                className={inputClass}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="m_starts">Starts at <span className="text-[#DC2626]">*</span></FieldLabel>
                            <DateTimeField
                                id="m_starts"
                                value={form.data.starts_at}
                                onChange={(v) => form.setData('starts_at', v)}
                                required
                            />
                            {form.errors.starts_at && <p className="mt-1 text-[11px] text-red-500">{form.errors.starts_at}</p>}
                        </div>
                        <div>
                            <FieldLabel htmlFor="m_ends">Ends at</FieldLabel>
                            <DateTimeField
                                id="m_ends"
                                value={form.data.ends_at}
                                onChange={(v) => form.setData('ends_at', v)}
                            />
                        </div>
                    </div>

                    {!isEdit && (
                        <div>
                            <FieldLabel htmlFor="m_reminder">Reminder</FieldLabel>
                            <select
                                id="m_reminder"
                                value={form.data.reminder_minutes}
                                onChange={(e) => form.setData('reminder_minutes', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">No reminder</option>
                                <option value="5">5 min before</option>
                                <option value="10">10 min before</option>
                                <option value="15">15 min before</option>
                                <option value="30">30 min before</option>
                                <option value="60">1 hour before</option>
                                <option value="120">2 hours before</option>
                                <option value="1440">1 day before</option>
                            </select>
                        </div>
                    )}

                    <div>
                        <FieldLabel htmlFor="m_description">Description</FieldLabel>
                        <textarea
                            id="m_description"
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            rows={3}
                            className={inputClass + ' resize-none'}
                            placeholder="Optional notes"
                        />
                    </div>
                </div>
            </form>
        </SlideOverModal>
    );
}
