import { useEffect } from 'react';

/**
 * Lightweight delete-confirmation modal for a landing page. Replaces the native
 * browser confirm() with an in-app, CRM-styled popup. The parent owns the
 * delete request + loading state; this is purely presentational.
 */
interface Props {
    open: boolean;
    /** Name of the page being deleted — shown for context. */
    name?: string;
    /** Loading state owned by the parent (disables buttons, shows "Deleting…"). */
    deleting?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}

export default function DeletePageModal({ open, name, deleting = false, onCancel, onConfirm }: Props) {
    // Esc closes (unless a delete is in flight).
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deleting) onCancel(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, deleting, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onClick={(e) => { if (e.target === e.currentTarget && !deleting) onCancel(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-page-title"
        >
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#E4E7EB] bg-white shadow-2xl">
                <div className="flex items-start gap-3 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                        </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 id="delete-page-title" className="text-[14px] font-semibold text-[#111315]">Delete landing page?</h2>
                        <p className="mt-1 text-[12px] leading-relaxed text-[#5F656D]">
                            {name ? (
                                <>You're about to delete <strong className="text-[#111315]">{name}</strong>. This action cannot be undone.</>
                            ) : (
                                <>This action cannot be undone.</>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[#E4E7EB] bg-[#FAFBFC] px-5 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={deleting}
                        className="h-9 rounded-md px-4 text-[12px] font-medium text-[#5F656D] transition-colors hover:bg-[#F3F4F6] hover:text-[#111315] disabled:opacity-40"
                    >
                        No
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={deleting}
                        className="h-9 rounded-md bg-[#DC2626] px-5 text-[12px] font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
                    >
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
