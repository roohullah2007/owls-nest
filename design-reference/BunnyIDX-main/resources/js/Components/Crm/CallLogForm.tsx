import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

interface Props {
    contactId?: number;
    contactPhone?: string;
    dealId?: number;
    onClose: () => void;
    inline?: boolean;
    initialData?: { notes?: string };
}

export default function CallLogForm({ contactId, contactPhone, dealId, onClose, inline, initialData }: Props) {
    const form = useForm({
        contact_id: contactId || '',
        deal_id: dealId || '',
        direction: 'outbound',
        outcome: 'connected',
        phone_number: contactPhone || '',
        duration_seconds: '',
        notes: '',
    });

    useEffect(() => {
        if (initialData) {
            form.setData((prev) => ({ ...prev, notes: initialData.notes || prev.notes }));
        }
    }, [initialData]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('crm.call-logs.store'), {
            preserveScroll: true,
            onSuccess: () => { form.reset(); onClose(); },
        });
    }

    if (inline) {
        const selectClass = 'w-full bg-white border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] appearance-none';
        const inputClass = 'w-full bg-white border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] placeholder:text-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';

        return (
            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Direction</label>
                        <select value={form.data.direction} onChange={(e) => form.setData('direction', e.target.value)} className={selectClass}>
                            <option value="outbound">Outbound</option>
                            <option value="inbound">Inbound</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Outcome</label>
                        <select value={form.data.outcome} onChange={(e) => form.setData('outcome', e.target.value)} className={selectClass}>
                            <option value="connected">Connected</option>
                            <option value="no_answer">No Answer</option>
                            <option value="left_voicemail">Left Voicemail</option>
                            <option value="busy">Busy</option>
                            <option value="wrong_number">Wrong Number</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Phone</label>
                        <input type="tel" value={form.data.phone_number} onChange={(e) => form.setData('phone_number', e.target.value)} placeholder="(555) 000-0000" className={inputClass} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Duration (min)</label>
                        <input type="number" value={form.data.duration_seconds} onChange={(e) => form.setData('duration_seconds', e.target.value)} placeholder="0" className={inputClass} min="0" />
                    </div>
                </div>
                <div>
                    <textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={2}
                        placeholder="Add call notes..."
                        className="w-full bg-white border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] placeholder:text-[#8B9096] resize-y focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                    />
                </div>
                <div className="flex items-center justify-between pt-1">
                    <div>
                        {contactPhone && (
                            <span className="text-[10px] text-[#8B9096]">calling {contactPhone}</span>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="flex items-center gap-1.5 bg-[#1693C9] px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                        Log Call
                    </button>
                </div>
            </form>
        );
    }

    // Modal mode
    const inputClass = 'mt-1 w-full border border-[#E4E7EB] bg-white text-[13px] h-9 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="w-full max-w-md bg-white p-6 shadow-xl border border-[#E4E7EB] rounded-xl">
                <h3 className="text-sm font-semibold text-[#111315] mb-4">Log Call</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D]">Direction</label>
                            <select value={form.data.direction} onChange={(e) => form.setData('direction', e.target.value)} className={inputClass}><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D]">Outcome</label>
                            <select value={form.data.outcome} onChange={(e) => form.setData('outcome', e.target.value)} className={inputClass}><option value="connected">Connected</option><option value="no_answer">No Answer</option><option value="left_voicemail">Left Voicemail</option><option value="busy">Busy</option><option value="wrong_number">Wrong Number</option></select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium text-[#5F656D]">Phone Number</label><input type="tel" value={form.data.phone_number} onChange={(e) => form.setData('phone_number', e.target.value)} className={inputClass} /></div>
                        <div><label className="block text-xs font-medium text-[#5F656D]">Duration (seconds)</label><input type="number" value={form.data.duration_seconds} onChange={(e) => form.setData('duration_seconds', e.target.value)} className={inputClass} min="0" /></div>
                    </div>
                    <div><label className="block text-xs font-medium text-[#5F656D]">Notes</label><textarea value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={2} className="mt-1 w-full border border-[#E4E7EB] text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" /></div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="text-sm text-[#8B9096] hover:text-[#5F656D]">Cancel</button>
                        <button type="submit" disabled={form.processing} className="bg-[#1693C9] px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-50">Log Call</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
