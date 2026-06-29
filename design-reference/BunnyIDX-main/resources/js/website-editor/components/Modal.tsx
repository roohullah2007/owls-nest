import React, { useEffect, useRef } from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    wide?: boolean;
    tabs?: React.ReactNode;
}

export default function Modal({ open, onClose, title, children, footer, wide, tabs }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="we-modal-overlay"
            ref={overlayRef}
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            <div className={`we-modal${wide ? ' we-modal-wide' : ''}`}>
                <div className="we-modal-header">
                    <h3 className="we-modal-title">{title}</h3>
                    <button
                        type="button"
                        className="we-modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                {tabs}
                <div className="we-modal-body">{children}</div>
                {footer && <div className="we-modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
