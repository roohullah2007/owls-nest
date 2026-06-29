import { useForm, usePage } from '@inertiajs/react';
import { useEffect, useState, useRef } from 'react';
import { PageProps } from '@/types';

interface Props {
    contactId?: number;
    contactEmail?: string;
    dealId?: number;
    onClose: () => void;
    inline?: boolean;
    initialData?: { subject?: string; body_preview?: string; cc?: string; bcc?: string };
}

export default function EmailLogForm({ contactId, contactEmail, dealId, onClose, inline, initialData }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [showCcBcc, setShowCcBcc] = useState(false);
    const [ccQuery, setCcQuery] = useState('');
    const [bccQuery, setBccQuery] = useState('');
    const [activeCcField, setActiveCcField] = useState<'cc' | 'bcc' | null>(null);
    const ccRef = useRef<HTMLInputElement>(null);
    const bccRef = useRef<HTMLInputElement>(null);

    const teamMembers = auth.team?.members || [];

    const form = useForm({
        contact_id: contactId || '',
        deal_id: dealId || '',
        direction: 'outbound',
        from_address: auth.user.email,
        to_address: contactEmail || '',
        subject: '',
        body_preview: '',
        cc: '',
        bcc: '',
    });

    useEffect(() => {
        if (initialData) {
            form.setData((prev) => ({
                ...prev,
                subject: initialData.subject || prev.subject,
                body_preview: initialData.body_preview || prev.body_preview,
                cc: initialData.cc || prev.cc,
                bcc: initialData.bcc || prev.bcc,
            }));
            if (initialData.cc || initialData.bcc) setShowCcBcc(true);
        }
    }, [initialData]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('crm.email-logs.store'), {
            preserveScroll: true,
            onSuccess: () => { form.reset('subject', 'body_preview', 'cc', 'bcc'); onClose(); },
        });
    }

    function getFilteredMembers(query: string) {
        if (!query) return [];
        const q = query.toLowerCase();
        return teamMembers.filter(m =>
            m.user.name.toLowerCase().includes(q) || m.user.email.toLowerCase().includes(q)
        ).slice(0, 5);
    }

    function addEmail(field: 'cc' | 'bcc', email: string) {
        const current = form.data[field];
        const emails = current ? current.split(',').map(e => e.trim()).filter(Boolean) : [];
        if (!emails.includes(email)) {
            emails.push(email);
            form.setData(field, emails.join(', '));
        }
        if (field === 'cc') setCcQuery('');
        else setBccQuery('');
        setActiveCcField(null);
    }

    const inputClass = 'w-full bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] placeholder:text-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';

    const ccBccSection = showCcBcc && (
        <div className="space-y-2">
            <div className="relative">
                <input
                    ref={ccRef}
                    type="text"
                    value={form.data.cc}
                    onChange={(e) => { form.setData('cc', e.target.value); setCcQuery(e.target.value.split(',').pop()?.trim() || ''); }}
                    onFocus={() => setActiveCcField('cc')}
                    onBlur={() => setTimeout(() => setActiveCcField(null), 200)}
                    placeholder="CC (comma-separated emails)"
                    className={inputClass}
                />
                {activeCcField === 'cc' && getFilteredMembers(ccQuery).length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-[#E4E7EB] rounded-lg shadow-lg max-h-32 overflow-y-auto">
                        {getFilteredMembers(ccQuery).map(m => (
                            <li key={m.id} onMouseDown={() => addEmail('cc', m.user.email)} className="px-3 py-1.5 text-xs hover:bg-[#F3F4F6] cursor-pointer">
                                <span className="font-medium text-[#5F656D]">{m.user.name}</span> <span className="text-[#8B9096]">{m.user.email}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="relative">
                <input
                    ref={bccRef}
                    type="text"
                    value={form.data.bcc}
                    onChange={(e) => { form.setData('bcc', e.target.value); setBccQuery(e.target.value.split(',').pop()?.trim() || ''); }}
                    onFocus={() => setActiveCcField('bcc')}
                    onBlur={() => setTimeout(() => setActiveCcField(null), 200)}
                    placeholder="BCC (comma-separated emails)"
                    className={inputClass}
                />
                {activeCcField === 'bcc' && getFilteredMembers(bccQuery).length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white border border-[#E4E7EB] rounded-lg shadow-lg max-h-32 overflow-y-auto">
                        {getFilteredMembers(bccQuery).map(m => (
                            <li key={m.id} onMouseDown={() => addEmail('bcc', m.user.email)} className="px-3 py-1.5 text-xs hover:bg-[#F3F4F6] cursor-pointer">
                                <span className="font-medium text-[#5F656D]">{m.user.name}</span> <span className="text-[#8B9096]">{m.user.email}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );

    if (inline) {
        return (
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <input
                        type="text"
                        value={form.data.subject}
                        onChange={(e) => form.setData('subject', e.target.value)}
                        placeholder="Subject"
                        className={inputClass}
                        required
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        {contactEmail && (
                            <span className="text-[10px] text-[#8B9096]">to {contactEmail}</span>
                        )}
                    </div>
                    {!showCcBcc && (
                        <button type="button" onClick={() => setShowCcBcc(true)} className="text-[10px] text-[#1693C9] hover:text-[#1380AF] font-medium">
                            CC/BCC
                        </button>
                    )}
                </div>
                {ccBccSection}
                <div>
                    <textarea
                        value={form.data.body_preview}
                        onChange={(e) => form.setData('body_preview', e.target.value)}
                        rows={4}
                        placeholder="Write your email..."
                        className="w-full bg-[#F9FAFB] border border-[#E4E7EB] rounded-lg px-3 py-2 text-[13px] text-[#111315] placeholder:text-[#8B9096] resize-y focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]"
                    />
                </div>
                <div className="flex items-center justify-end pt-1">
                    <button
                        type="submit"
                        disabled={form.processing || !form.data.subject.trim()}
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
    const modalInputClass = 'mt-1 w-full border border-[#E4E7EB] bg-white text-[13px] h-9 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="w-full max-w-md bg-white p-6 shadow-xl border border-[#E4E7EB] rounded-xl">
                <h3 className="text-sm font-semibold text-[#111315] mb-4">Log Email</h3>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium text-[#5F656D]">From</label><input type="email" value={form.data.from_address} onChange={(e) => form.setData('from_address', e.target.value)} className={modalInputClass} required /></div>
                        <div><label className="block text-xs font-medium text-[#5F656D]">To</label><input type="email" value={form.data.to_address} onChange={(e) => form.setData('to_address', e.target.value)} className={modalInputClass} required /></div>
                    </div>
                    {!showCcBcc && (
                        <button type="button" onClick={() => setShowCcBcc(true)} className="text-[10px] text-[#1693C9] hover:text-[#1380AF] font-medium">
                            + CC/BCC
                        </button>
                    )}
                    {ccBccSection}
                    <div><label className="block text-xs font-medium text-[#5F656D]">Subject</label><input type="text" value={form.data.subject} onChange={(e) => form.setData('subject', e.target.value)} className={modalInputClass} required /></div>
                    <div><label className="block text-xs font-medium text-[#5F656D]">Body</label><textarea value={form.data.body_preview} onChange={(e) => form.setData('body_preview', e.target.value)} rows={4} className="mt-1 w-full border border-[#E4E7EB] text-[13px] px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" /></div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="text-sm text-[#8B9096] hover:text-[#5F656D]">Cancel</button>
                        <button type="submit" disabled={form.processing} className="bg-[#1693C9] px-4 py-1.5 text-xs font-semibold text-white rounded-lg hover:bg-[#1380AF] disabled:opacity-50">Send Email</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
