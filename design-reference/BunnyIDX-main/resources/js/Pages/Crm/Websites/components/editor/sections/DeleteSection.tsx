import React, { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { AgentWebsite } from '../../../types';
import { inputClass } from '../../../constants';

export default function DeleteSection({ website }: { website: AgentWebsite }) {
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const matches = confirmText.trim() === (website.agent_name || '').trim();

    useEffect(() => {
        if (open) {
            const t = setTimeout(() => inputRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
        setConfirmText('');
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    function handleDelete() {
        if (!matches || deleting) return;
        setDeleting(true);
        router.delete(route('crm.websites.destroy', website.id), { onFinish: () => setDeleting(false) });
    }

    return (
        <div className="space-y-6">
            <div className="bg-white border border-[#DC2626] rounded-[4px] p-6">
                <p className="text-[14px] font-semibold text-[#DC2626] mb-1">Delete Website</p>
                <p className="text-[13px] text-[#374151] mb-4">
                    Permanently delete this website and all of its content — pages, blog posts, areas, and media. This action cannot be undone.
                </p>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="h-9 px-4 text-[13px] font-medium text-white bg-[#DC2626] rounded-[4px] hover:bg-[#B91C1C] transition-colors"
                >
                    Delete Website
                </button>
            </div>

            {open && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                >
                    <div className="w-full max-w-md bg-white rounded-[4px] border border-[#E4E7EB] shadow-2xl overflow-hidden">
                        <div className="px-6 py-5">
                            <h2 className="text-[16px] font-semibold text-[#111315]">Delete this website?</h2>
                            <p className="text-[13px] text-[#374151] mt-1.5 leading-relaxed">
                                This permanently deletes <strong className="text-[#111315]">{website.agent_name}</strong> and all of its content. This can't be undone.
                            </p>

                            <div className="mt-4">
                                <label className="block text-[13px] font-medium text-[#111315] mb-1">
                                    Type <span className="font-semibold">{website.agent_name}</span> to confirm
                                </label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    autoComplete="off"
                                    className={`${inputClass} focus:border-[#DC2626]`}
                                    placeholder={website.agent_name}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); }}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-5">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    disabled={deleting}
                                    className="h-9 px-4 text-[13px] font-medium text-[#111315] bg-white border border-[#C8CCD1] rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={!matches || deleting}
                                    className="h-9 px-5 text-[13px] font-semibold text-white bg-[#DC2626] rounded-[4px] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    {deleting ? 'Deleting…' : 'Delete Website'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
