import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { PageProps } from '@/types';

interface ToastItem {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
}

const icons: Record<string, JSX.Element> = {
    success: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
    ),
    error: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
    ),
    info: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
    ),
};

const styles: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: 'bg-[#F0FDF4]', border: 'border-[#BBF7D0]', icon: 'text-[#16A34A]', text: 'text-[#166534]' },
    error: { bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]', icon: 'text-[#DC2626]', text: 'text-[#991B1B]' },
    warning: { bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', icon: 'text-[#D97706]', text: 'text-[#92400E]' },
    info: { bg: 'bg-[#E6F0FF]', border: 'border-[#BFDBFE]', icon: 'text-[#1693C9]', text: 'text-[#1E40AF]' },
};

let nextId = 0;

export default function Toast() {
    const { flash } = usePage<PageProps>().props;
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const types = ['success', 'error', 'warning', 'info'] as const;
        types.forEach((type) => {
            if (flash[type]) {
                const id = ++nextId;
                setToasts((prev) => [...prev, { id, type, message: flash[type]! }]);
                setTimeout(() => {
                    setToasts((prev) => prev.filter((t) => t.id !== id));
                }, type === 'error' ? 6000 : 4000);
            }
        });
    }, [flash]);

    function dismiss(id: number) {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            {toasts.map((toast) => {
                const s = styles[toast.type];
                return (
                    <div
                        key={toast.id}
                        className={`flex items-start gap-2.5 px-4 py-3 border ${s.bg} ${s.border} shadow-lg animate-slide-in`}
                    >
                        <span className={`shrink-0 mt-0.5 ${s.icon}`}>{icons[toast.type]}</span>
                        <p className={`flex-1 text-sm ${s.text}`}>{toast.message}</p>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className={`shrink-0 ${s.icon} opacity-50 hover:opacity-100 transition-opacity`}
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
