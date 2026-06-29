import { useEffect, useRef, useState } from 'react';

/**
 * Destructive-action confirmation modal with two safety modes:
 *
 *   mode="type-name" — single item: user must type the exact name to confirm.
 *                       Used when deleting one record (lead, deal, etc.) to
 *                       prevent accidental clicks.
 *
 *   mode="password"  — bulk items: user must enter their account password.
 *                       Used when the action affects many records at once;
 *                       prevents drive-by destruction even from a hijacked
 *                       authenticated session.
 *
 * The parent handles the actual submit. This component only validates that the
 * user's typed input matches what's required, then surfaces the value via
 * onConfirm so the parent can include it in the request payload.
 */

interface Props {
    open: boolean;
    onClose: () => void;
    /** What's being deleted, used in the title/copy. e.g. "contact", "deal". */
    entity?: string;
    /** Required for mode="type-name". The user must type this exact string. */
    name?: string;
    /** Required for mode="password". Triggered with the typed password. */
    count?: number;
    mode: 'type-name' | 'password';
    /** Triggered on confirm — receives the input value (password for bulk mode, empty for type-name). */
    onConfirm: (value: string) => Promise<void> | void;
    /** Loading state owned by the parent. */
    confirming?: boolean;
    /** Optional server-side error message to surface (e.g. "wrong password"). */
    error?: string | null;
}

export default function DeleteConfirmModal({
    open, onClose, entity = 'item', name, count = 1, mode, onConfirm, confirming = false, error,
}: Props) {
    const [input, setInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Clear input when the modal closes so re-opening starts fresh.
    useEffect(() => {
        if (!open) setInput('');
        else setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    // Esc to close.
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    const isTypeName = mode === 'type-name';
    const matches = isTypeName ? input.trim() === (name ?? '').trim() : input.length > 0;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!matches || confirming) return;
        await onConfirm(input);
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-md bg-white rounded-xl border border-[#E4E7EB] shadow-2xl overflow-hidden">
                {/* Header with warning icon */}
                <div className="px-5 py-4 border-b border-[#E4E7EB] flex items-start gap-3">
                    <span className="shrink-0 h-9 w-9 rounded-full bg-[#FEF2F2] flex items-center justify-center text-[#DC2626]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-[14px] font-semibold text-[#111315]">
                            {isTypeName ? `Delete ${entity}?` : `Delete ${count} ${entity}${count === 1 ? '' : 's'}?`}
                        </h2>
                        <p className="text-[12px] text-[#5F656D] mt-1 leading-relaxed">
                            {isTypeName ? (
                                <>
                                    This permanently deletes <strong className="text-[#111315]">{name}</strong> and all of their notes, tasks, deals, files, emails, SMS, and calls. This can't be undone.
                                </>
                            ) : (
                                <>
                                    This permanently deletes {count} {entity}{count === 1 ? '' : 's'} and <strong className="text-[#111315]">all of their related data</strong> — notes, tasks, deals, files, emails, SMS, calls, timeline. This can't be undone.
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="px-5 py-4 space-y-3">
                    {isTypeName ? (
                        <div>
                            <label className="block text-[11px] font-medium text-[#5F656D] mb-1.5">
                                Type <span className="font-mono text-[#111315] bg-[#F3F4F6] px-1.5 py-0.5 rounded">{name}</span> to confirm
                            </label>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                autoComplete="off"
                                className="block w-full py-2 px-3 text-[13px] text-[#111315] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626]"
                                placeholder={name}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-[11px] font-medium text-[#5F656D] mb-1.5">
                                Enter your account password to confirm
                            </label>
                            <input
                                ref={inputRef}
                                type="password"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                autoComplete="current-password"
                                className="block w-full py-2 px-3 text-[13px] text-[#111315] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:border-[#DC2626]"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[11px] text-[#DC2626]">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={confirming}
                            className="h-9 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!matches || confirming}
                            className="h-9 px-5 text-[12px] font-semibold text-white bg-[#DC2626] rounded-md hover:bg-[#B91C1C] disabled:opacity-40 transition-colors"
                        >
                            {confirming ? 'Deleting…' : isTypeName ? 'Delete' : `Delete ${count} ${entity}${count === 1 ? '' : 's'}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
