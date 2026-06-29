import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FieldLabel as SharedFieldLabel, formInputClass } from './FormField';

interface Props {
    title: string;
    onClose: () => void;
    headerRight?: ReactNode;
    footer?: ReactNode;
    width?: number;
    children: ReactNode;
}

/**
 * Right-side slide-in modal. Backdrop fades, panel slides from the right edge.
 * ESC + backdrop click both close. Animations run for ~200ms.
 *
 * Header bg #F3F4F6 + #E0E2E7 border; body white scrollable; footer pinned.
 *
 * Use for forms or detail panes where a full-screen modal is too much but a
 * popover is too little.
 */
export default function SlideOverModal({
    title,
    onClose,
    headerRight,
    footer,
    width = 400,
    children,
}: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));

        function handleEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') handleClose();
        }
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, []);

    function handleClose() {
        setMounted(false);
        setTimeout(onClose, 200);
    }

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div
                onClick={handleClose}
                className={`absolute inset-0 bg-[#07090f33] transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
            />

            <div
                style={{ width: `min(${width}px, 100vw)` }}
                className={`absolute top-0 right-0 h-full max-w-full bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
                    mounted ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#E0E2E7] bg-[#F3F4F6]">
                    <h2 className="text-[14px] font-semibold text-[#111315]">{title}</h2>
                    <div className="flex items-center gap-3">
                        {headerRight}
                        <button
                            type="button"
                            onClick={handleClose}
                            className="text-[#5F656D] hover:text-[#111315] transition-colors"
                            aria-label="Close"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-3 border-t border-[#E0E2E7] bg-white">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

/** Re-exports for backward compat — prefer importing from `FormField.tsx`. */
export const FieldLabel = SharedFieldLabel;
export const slideOverInputClass = formInputClass;
