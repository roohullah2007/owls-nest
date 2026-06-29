import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { router } from '@inertiajs/react';
import { Contact } from '../types';
import { typeColors, defaultTypeColor } from '../constants';
import { capitalize } from '../utils';

/**
 * Inline type badge that opens a dropdown to change the lead's type.
 * Mirrors InlineStatusCell — same UX, different field + colors. The menu renders
 * in a portal with fixed positioning so it is never clipped by the table's
 * horizontal scroll `overflow`.
 */
export default function InlineTypeCell({ contact, types }: { contact: Contact; types: string[] }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const colors = typeColors[contact.type] || defaultTypeColor;

    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left });
    }, [open]);

    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        function onScrollOrResize() { setOpen(false); }
        if (open) {
            document.addEventListener('mousedown', onDoc);
            document.addEventListener('keydown', onKey);
            window.addEventListener('resize', onScrollOrResize);
            window.addEventListener('scroll', onScrollOrResize, true);
            return () => {
                document.removeEventListener('mousedown', onDoc);
                document.removeEventListener('keydown', onKey);
                window.removeEventListener('resize', onScrollOrResize);
                window.removeEventListener('scroll', onScrollOrResize, true);
            };
        }
    }, [open]);

    function changeType(next: string) {
        if (next === contact.type) { setOpen(false); return; }
        setSaving(true);
        router.patch(route('crm.contacts.update', contact.uuid), {
            first_name: contact.first_name,
            last_name: contact.last_name,
            type: next,
            source: contact.source,
            status: contact.status,
        }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => { setSaving(false); setOpen(false); },
        });
    }

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                disabled={saving || types.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: colors.bg, color: colors.text }}
            >
                {capitalize(contact.type)}
                <svg className="h-3 w-3 opacity-70" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
            </button>
            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1001 }}
                        className="min-w-[160px] bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden"
                    >
                        {types.map((t) => {
                            const isCurrent = contact.type === t;
                            const c = typeColors[t] || defaultTypeColor;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); changeType(t); }}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-left transition-colors ${isCurrent ? 'bg-[#F9FAFB]' : 'hover:bg-[#F9FAFB]'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.bg }} />
                                        <span className="text-[#111315]">{capitalize(t)}</span>
                                    </span>
                                    {isCurrent && (
                                        <svg className="h-3 w-3 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>,
                    document.body,
                )}
        </>
    );
}
