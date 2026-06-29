import CrmLayout from '@/Layouts/CrmLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface SupportRequest {
    id: number;
    topic: string;
    message: string;
    preferred_date: string;
    preferred_time: string;
    contact_method: string;
    status: string;
    created_at: string;
    scheduled_at: string | null;
}

interface Props {
    requests: SupportRequest[];
}

const topics = [
    { value: 'idx_setup', label: 'IDX Setup & Configuration', desc: 'Help setting up your IDX plugin and connecting MLS' },
    { value: 'mls_connection', label: 'MLS Connection Issues', desc: 'Troubleshooting MLS connection or data problems' },
    { value: 'plugin_help', label: 'WordPress Plugin Help', desc: 'Installation, shortcodes, widgets, and plugin usage' },
    { value: 'billing', label: 'Billing & Licensing', desc: 'License activation, domain changes, or billing questions' },
    { value: 'account', label: 'Account & Settings', desc: 'CRM account settings, profile, or data management' },
    { value: 'other', label: 'Other', desc: 'General questions or feature requests' },
];

const timeSlots = [
    { value: 'morning', label: 'Morning', desc: '9 AM - 12 PM EST' },
    { value: 'afternoon', label: 'Afternoon', desc: '12 PM - 5 PM EST' },
    { value: 'evening', label: 'Evening', desc: '5 PM - 8 PM EST' },
];

const contactMethods = [
    { value: 'video_call', label: 'Video Call', icon: 'M15.75 10.5l4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z' },
    { value: 'phone', label: 'Phone Call', icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z' },
    { value: 'chat', label: 'Live Chat', icon: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z' },
];

const topicLabels: Record<string, string> = Object.fromEntries(topics.map((t) => [t.value, t.label]));
const methodLabels: Record<string, string> = Object.fromEntries(contactMethods.map((m) => [m.value, m.label]));
const timeLabels: Record<string, string> = Object.fromEntries(timeSlots.map((t) => [t.value, t.label]));

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
    scheduled: { bg: '#DBEAFE', text: '#1E40AF', label: 'Scheduled' },
    completed: { bg: '#DCFCE7', text: '#166534', label: 'Completed' },
    canceled: { bg: '#F3F4F6', text: '#5F656D', label: 'Canceled' },
};

export default function Consultation({ requests }: Props) {
    const [step, setStep] = useState(1);

    const form = useForm({
        topic: '',
        message: '',
        preferred_date: '',
        preferred_time: '',
        contact_method: 'video_call',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        form.post(route('crm.support.consultation.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setStep(1);
            },
        });
    }

    const today = new Date().toISOString().split('T')[0];

    return (
        <CrmLayout>
            <Head title="Schedule Consultation" />

            {/* Toolbar */}
            <div className="bg-white border-b border-[#E4E7EB] shrink-0">
                <div className="flex items-stretch h-11">
                    <div className="flex items-center px-3 sm:px-5 border-r border-[#E4E7EB] shrink-0">
                        <span className="text-xs font-semibold text-[#111315] tracking-wider">Support</span>
                    </div>
                    <div className="flex items-center px-3 sm:px-4 text-xs font-medium text-[#111315] bg-[#F3F4F6] border-r border-[#E4E7EB]">
                        Schedule Consultation
                    </div>
                    <div className="flex-1" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
                <div className="max-w-3xl mx-auto space-y-4">

                    {/* Header */}
                    <div className="bg-white border border-[#E4E7EB]">
                        <div className="px-5 py-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-lg bg-[#111315] flex items-center justify-center shrink-0">
                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-base font-semibold text-[#111315]">Schedule a Consultation</h1>
                                    <p className="text-xs text-[#5F656D] mt-0.5">Book a free session with our support team. We'll help you get set up and answer any questions.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-4">

                        {/* Step 1: Topic */}
                        <div className="bg-white border border-[#E4E7EB]">
                            <div className="px-5 py-3 border-b border-[#E4E7EB] flex items-center gap-3">
                                <span className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold bg-[#111315] text-white">1</span>
                                <p className="text-xs font-semibold text-[#111315] tracking-wider">What do you need help with?</p>
                            </div>
                            <div className="px-5 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {topics.map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => { form.setData('topic', t.value); if (step < 2) setStep(2); }}
                                            className={`flex flex-col text-left px-4 py-3 border-2 transition-colors ${
                                                form.data.topic === t.value
                                                    ? 'border-[#111315] bg-[#F9FAFB]'
                                                    : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'
                                            }`}
                                        >
                                            <span className={`text-xs font-medium ${form.data.topic === t.value ? 'text-[#111315]' : 'text-[#5F656D]'}`}>{t.label}</span>
                                            <span className="text-[11px] text-[#8B9096] mt-0.5">{t.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                {form.errors.topic && <p className="text-[11px] text-red-500 mt-2">{form.errors.topic}</p>}
                            </div>
                        </div>

                        {/* Step 2: Date & Time */}
                        {step >= 2 && (
                            <div className="bg-white border border-[#E4E7EB]">
                                <div className="px-5 py-3 border-b border-[#E4E7EB] flex items-center gap-3">
                                    <span className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold bg-[#111315] text-white">2</span>
                                    <p className="text-xs font-semibold text-[#111315] tracking-wider">When works best for you?</p>
                                </div>
                                <div className="px-5 py-4 space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#5F656D] tracking-wide mb-1.5">Preferred Date</label>
                                        <input
                                            type="date"
                                            value={form.data.preferred_date}
                                            onChange={(e) => { form.setData('preferred_date', e.target.value); if (step < 3) setStep(3); }}
                                            min={today}
                                            className="h-9 px-3 text-sm border border-[#E4E7EB] bg-white text-[#111315] focus:outline-none focus:border-[#111315] focus:ring-0 w-full sm:w-auto"
                                        />
                                        {form.errors.preferred_date && <p className="text-[11px] text-red-500 mt-1">{form.errors.preferred_date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#5F656D] tracking-wide mb-1.5">Preferred Time</label>
                                        <div className="flex flex-wrap gap-2">
                                            {timeSlots.map((t) => (
                                                <button
                                                    key={t.value}
                                                    type="button"
                                                    onClick={() => { form.setData('preferred_time', t.value); if (step < 3) setStep(3); }}
                                                    className={`px-4 py-2.5 border-2 transition-colors ${
                                                        form.data.preferred_time === t.value
                                                            ? 'border-[#111315] bg-[#F9FAFB]'
                                                            : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'
                                                    }`}
                                                >
                                                    <p className={`text-xs font-medium ${form.data.preferred_time === t.value ? 'text-[#111315]' : 'text-[#5F656D]'}`}>{t.label}</p>
                                                    <p className="text-[10px] text-[#8B9096] mt-0.5">{t.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                        {form.errors.preferred_time && <p className="text-[11px] text-red-500 mt-1">{form.errors.preferred_time}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Contact Method & Message */}
                        {step >= 3 && (
                            <div className="bg-white border border-[#E4E7EB]">
                                <div className="px-5 py-3 border-b border-[#E4E7EB] flex items-center gap-3">
                                    <span className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-semibold bg-[#111315] text-white">3</span>
                                    <p className="text-xs font-semibold text-[#111315] tracking-wider">How should we reach you?</p>
                                </div>
                                <div className="px-5 py-4 space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#5F656D] tracking-wide mb-1.5">Contact Method</label>
                                        <div className="flex flex-wrap gap-2">
                                            {contactMethods.map((m) => (
                                                <button
                                                    key={m.value}
                                                    type="button"
                                                    onClick={() => form.setData('contact_method', m.value)}
                                                    className={`flex items-center gap-2.5 px-4 py-2.5 border-2 transition-colors ${
                                                        form.data.contact_method === m.value
                                                            ? 'border-[#111315] bg-[#F9FAFB]'
                                                            : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'
                                                    }`}
                                                >
                                                    <svg className={`h-4 w-4 ${form.data.contact_method === m.value ? 'text-[#111315]' : 'text-[#8B9096]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                                                    </svg>
                                                    <span className={`text-xs font-medium ${form.data.contact_method === m.value ? 'text-[#111315]' : 'text-[#5F656D]'}`}>{m.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {form.errors.contact_method && <p className="text-[11px] text-red-500 mt-1">{form.errors.contact_method}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#5F656D] tracking-wide mb-1.5">Tell us more</label>
                                        <textarea
                                            value={form.data.message}
                                            onChange={(e) => form.setData('message', e.target.value)}
                                            placeholder="Describe what you need help with so our team can prepare for the call..."
                                            rows={4}
                                            className="w-full px-3 py-2 text-sm border border-[#E4E7EB] bg-white text-[#111315] placeholder-[#C4C9D1] focus:outline-none focus:border-[#111315] focus:ring-0 resize-none"
                                        />
                                        {form.errors.message && <p className="text-[11px] text-red-500 mt-1">{form.errors.message}</p>}
                                    </div>
                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="submit"
                                            disabled={!form.data.topic || !form.data.preferred_date || !form.data.preferred_time || !form.data.message || form.processing}
                                            className="h-9 px-6 bg-[#1693C9] text-white text-xs font-medium hover:bg-[#1380AF] disabled:opacity-30 rounded-lg transition-colors"
                                        >
                                            {form.processing ? 'Submitting...' : 'Request Consultation'}
                                        </button>
                                        <span className="text-[11px] text-[#8B9096]">Free — no charge for consultations</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>

                    {/* Previous Requests */}
                    {requests.length > 0 && (
                        <div className="bg-white border border-[#E4E7EB]">
                            <div className="px-5 py-3 border-b border-[#E4E7EB]">
                                <p className="text-xs font-semibold text-[#111315] tracking-wider">Your Requests</p>
                            </div>
                            <div className="divide-y divide-[#E4E7EB]">
                                {requests.map((req) => {
                                    const st = statusStyles[req.status] || statusStyles.pending;
                                    return (
                                        <div key={req.id} className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-medium text-[#111315]">{topicLabels[req.topic] || req.topic}</span>
                                                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: st.bg, color: st.text }}>{st.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#8B9096]">
                                                        <span>{methodLabels[req.contact_method] || req.contact_method}</span>
                                                        {req.preferred_date && (
                                                            <span>{new Date(req.preferred_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {timeLabels[req.preferred_time] || req.preferred_time}</span>
                                                        )}
                                                        <span>Submitted {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                    {req.message && <p className="text-[11px] text-[#5F656D] mt-1 line-clamp-2">{req.message}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CrmLayout>
    );
}
