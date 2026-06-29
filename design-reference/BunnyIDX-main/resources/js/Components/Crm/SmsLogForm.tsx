import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

interface Props {
    contactId?: number;
    contactPhone?: string;
    dealId?: number;
    onClose: () => void;
    inline?: boolean;
    initialData?: { body?: string };
}

export default function SmsLogForm({ contactId, contactPhone, dealId, onClose, inline, initialData }: Props) {
    const form = useForm({
        contact_id: contactId || '',
        deal_id: dealId || '',
        direction: 'outbound',
        phone_number: contactPhone || '',
        body: '',
    });

    useEffect(() => {
        if (initialData) {
            form.setData((prev) => ({ ...prev, body: initialData.body || prev.body }));
        }
    }, [initialData]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('crm.sms-logs.store'), {
            preserveScroll: true,
            onSuccess: () => { form.reset('body'); onClose(); },
        });
    }

    if (inline) {
        return (
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <textarea
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                        rows={3}
                        placeholder="Write your message..."
                        className="w-full bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] placeholder:text-[#8B9096] resize-y focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                        required
                    />
                    <div className="flex items-center justify-between mt-1">
                        <span className={`text-[10px] ${form.data.body.length > 160 ? 'text-[#D97706]' : 'text-[#8B9096]'}`}>
                            {form.data.body.length}/160
                        </span>
                        {contactPhone && (
                            <span className="text-[10px] text-[#8B9096]">to {contactPhone}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-end pt-1">
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.body.trim()}
                        className="flex items-center gap-1.5 bg-[#1693C9] px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                        Send
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
                <h3 className="text-sm font-semibold text-[#111315] mb-4">Log SMS</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium text-[#5F656D]">Direction</label><select value={form.data.direction} onChange={(e) => form.setData('direction', e.target.value)} className={inputClass}><option value="outbound">Outbound</option><option value="inbound">Inbound</option></select></div>
                        <div><label className="block text-xs font-medium text-[#5F656D]">Phone Number</label><input type="tel" value={form.data.phone_number} onChange={(e) => form.setData('phone_number', e.target.value)} className={inputClass} /></div>
                    </div>
                    <div><label className="block text-xs font-medium text-[#5F656D]">Message</label><textarea value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} rows={3} className="mt-1 w-full border border-[#E4E7EB] text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" required /></div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="text-sm text-[#8B9096] hover:text-[#5F656D]">Cancel</button>
                        <button type="submit" disabled={form.processing} className="bg-[#1693C9] px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-50">Send Text</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
