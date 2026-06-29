import { useState } from 'react';
import axios from 'axios';
import type { EmailAccount } from '@/types';

interface Props {
    accounts: EmailAccount[];
    defaultAccountId: number;
    contactId?: number;
    dealId?: number;
    prefillTo?: string;
    onClose: () => void;
    onSent?: () => void;
}

export default function EmailComposeModal({ accounts, defaultAccountId, contactId, dealId, prefillTo, onClose, onSent }: Props) {
    const [accountId, setAccountId] = useState(defaultAccountId);
    const [to, setTo] = useState(prefillTo || '');
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCcBcc, setShowCcBcc] = useState(false);

    const handleSend = async () => {
        if (!to.trim() || !subject.trim() || !body.trim() || sending) return;

        setSending(true);
        setError(null);

        try {
            await axios.post(route('crm.email.send'), {
                email_account_id: accountId,
                to: to.trim(),
                subject: subject.trim(),
                body_html: body.replace(/\n/g, '<br>'),
                cc: cc.trim() || null,
                bcc: bcc.trim() || null,
                contact_id: contactId || null,
                deal_id: dealId || null,
            });

            onSent?.();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send email.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E7EB]">
                    <h3 className="text-sm font-semibold text-[#111315]">New Email</h3>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#111315] transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {error && (
                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                            {error}
                        </div>
                    )}

                    {/* From */}
                    {accounts.length > 1 ? (
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-[#5F656D] w-12 shrink-0">From</label>
                            <select
                                value={accountId}
                                onChange={(e) => setAccountId(Number(e.target.value))}
                                className="flex-1 h-8 text-[13px] border border-[#C8CCD1] rounded-md px-2.5 text-[#111315] bg-white focus:outline-none focus:ring-1 focus:ring-[#7C36EE]"
                            >
                                {accounts.map((a) => (
                                    <option key={a.id} value={a.id}>{a.email_address}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-[#5F656D] w-12 shrink-0">From</label>
                            <span className="text-[13px] text-[#111315]">{accounts[0]?.email_address}</span>
                        </div>
                    )}

                    {/* To */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-[#5F656D] w-12 shrink-0">To</label>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="recipient@example.com"
                            className="flex-1 h-8 text-[13px] border border-[#C8CCD1] rounded-md px-2.5 text-[#111315] placeholder-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#7C36EE]"
                        />
                        {!showCcBcc && (
                            <button
                                onClick={() => setShowCcBcc(true)}
                                className="text-xs text-[#7C36EE] hover:underline shrink-0"
                            >
                                Cc/Bcc
                            </button>
                        )}
                    </div>

                    {/* Cc / Bcc */}
                    {showCcBcc && (
                        <>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-[#5F656D] w-12 shrink-0">Cc</label>
                                <input
                                    type="text"
                                    value={cc}
                                    onChange={(e) => setCc(e.target.value)}
                                    placeholder="cc@example.com"
                                    className="flex-1 h-8 text-[13px] border border-[#C8CCD1] rounded-md px-2.5 text-[#111315] placeholder-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#7C36EE]"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-[#5F656D] w-12 shrink-0">Bcc</label>
                                <input
                                    type="text"
                                    value={bcc}
                                    onChange={(e) => setBcc(e.target.value)}
                                    placeholder="bcc@example.com"
                                    className="flex-1 h-8 text-[13px] border border-[#C8CCD1] rounded-md px-2.5 text-[#111315] placeholder-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#7C36EE]"
                                />
                            </div>
                        </>
                    )}

                    {/* Subject */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-[#5F656D] w-12 shrink-0">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject"
                            className="flex-1 h-8 text-[13px] border border-[#C8CCD1] rounded-md px-2.5 text-[#111315] placeholder-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#7C36EE]"
                        />
                    </div>

                    {/* Body */}
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Write your message..."
                        rows={10}
                        className="w-full border border-[#E4E7EB] rounded-lg px-3 py-2.5 text-sm text-[#111315] placeholder-[#8B9096] resize-none focus:outline-none focus:ring-1 focus:ring-[#7C36EE] focus:border-[#7C36EE]"
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[#E4E7EB]">
                    <button
                        onClick={onClose}
                        className="h-8 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!to.trim() || !subject.trim() || !body.trim() || sending}
                        className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium text-white bg-[#7C36EE] rounded-md hover:bg-[#6B2CD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        )}
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
