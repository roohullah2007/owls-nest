import { useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';
import DateTimeField from '@/Components/Crm/DateTimeField';
import { localDateTimeToIso } from '@/utils/dateFormatters';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    contactId: number;
}

export default function AppointmentFormModal({ isOpen, onClose, contactId }: Props) {
    const titleRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        title: '',
        meeting_type: 'in_person',
        starts_at: '',
        ends_at: '',
        location: '',
        description: '',
        contact_id: contactId,
    });

    useEffect(() => {
        if (isOpen) {
            form.reset();
            form.clearErrors();
            form.setData('contact_id', contactId);
            setTimeout(() => titleRef.current?.focus(), 200);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    function handleClose() {
        form.reset();
        form.clearErrors();
        onClose();
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        // Convert the local datetime-local inputs to UTC so they store and re-display
        // in the user's local time (the app's datetime convention).
        form.transform((data) => ({
            ...data,
            starts_at: localDateTimeToIso(data.starts_at),
            ends_at: localDateTimeToIso(data.ends_at),
        }));
        form.post(route('crm.calendar.store'), {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    }

    const formId = 'contact-add-appointment-form';

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
                disabled={!form.data.title.trim() || !form.data.starts_at || form.processing}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {form.processing ? 'Saving…' : 'Add Appointment'}
            </button>
        </>
    );

    return (
        <SlideOverModal title="Add Appointment" onClose={handleClose} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    <div>
                        <FieldLabel htmlFor="appt_title">Title <span className="text-[#DC2626]">*</span></FieldLabel>
                        <input
                            id="appt_title"
                            ref={titleRef}
                            type="text"
                            value={form.data.title}
                            onChange={(e) => form.setData('title', e.target.value)}
                            placeholder="e.g. Property Showing, Follow-up Call"
                            className={inputClass}
                            required
                        />
                        {form.errors.title && <p className="mt-1 text-[11px] text-red-500">{form.errors.title}</p>}
                    </div>

                    <div>
                        <FieldLabel htmlFor="appt_type">Type</FieldLabel>
                        <select
                            id="appt_type"
                            value={form.data.meeting_type}
                            onChange={(e) => form.setData('meeting_type', e.target.value)}
                            className={inputClass}
                        >
                            <option value="showing">Showing</option>
                            <option value="in_person">In Person</option>
                            <option value="video">Video Call</option>
                            <option value="phone">Phone Call</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="appt_start">Start <span className="text-[#DC2626]">*</span></FieldLabel>
                            <DateTimeField
                                id="appt_start"
                                value={form.data.starts_at}
                                onChange={(v) => form.setData('starts_at', v)}
                                required
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="appt_end">End</FieldLabel>
                            <DateTimeField
                                id="appt_end"
                                value={form.data.ends_at}
                                onChange={(v) => form.setData('ends_at', v)}
                            />
                        </div>
                    </div>

                    <div>
                        <FieldLabel htmlFor="appt_location">Location</FieldLabel>
                        <input
                            id="appt_location"
                            type="text"
                            value={form.data.location}
                            onChange={(e) => form.setData('location', e.target.value)}
                            placeholder="Address or meeting link"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <FieldLabel htmlFor="appt_notes">Notes</FieldLabel>
                        <textarea
                            id="appt_notes"
                            rows={3}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                            placeholder="Add notes..."
                            className={inputClass + ' resize-none'}
                        />
                    </div>
                </div>
            </form>
        </SlideOverModal>
    );
}
