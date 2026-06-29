import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@inertiajs/react';

export interface RowAction {
    label: string;
    href?: string;
    onClick?: () => void;
    danger?: boolean;
}

/**
 * Three-dot action menu for rows inside a scrolling list. The menu is rendered
 * in a portal with fixed positioning so it is never clipped by an ancestor's
 * `overflow` — unlike the shared `Dropdown`, which positions absolutely within
 * the scroll container.
 */
export default function RowActionMenu({ actions }: { actions: RowAction[] }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        function onDoc(e: MouseEvent) {
            if (
                btnRef.current?.contains(e.target as Node) ||
                menuRef.current?.contains(e.target as Node)
            )
                return;
            setOpen(false);
        }
        function onScrollOrResize() {
            setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        window.addEventListener('resize', onScrollOrResize);
        window.addEventListener('scroll', onScrollOrResize, true);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            window.removeEventListener('resize', onScrollOrResize);
            window.removeEventListener('scroll', onScrollOrResize, true);
        };
    }, [open]);

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#8B9096] hover:bg-[#F3F4F6] hover:text-[#111315] transition-colors"
                aria-label="More actions"
            >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 6.75a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 20.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg>
            </button>

            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 1001 }}
                        className="w-44 py-1 bg-white border border-[#E4E7EB] rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                    >
                        {actions.map((action) => {
                            const cls = `block w-full px-4 py-1.5 text-start text-xs leading-5 transition duration-150 ease-in-out focus:outline-none ${
                                action.danger
                                    ? 'text-[#DC2626] hover:bg-[#FEF2F2] focus:bg-[#FEF2F2]'
                                    : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100'
                            }`;
                            if (action.href) {
                                return (
                                    <Link key={action.label} href={action.href} className={cls} onClick={() => setOpen(false)}>
                                        {action.label}
                                    </Link>
                                );
                            }
                            return (
                                <button
                                    key={action.label}
                                    type="button"
                                    className={cls}
                                    onClick={() => {
                                        setOpen(false);
                                        action.onClick?.();
                                    }}
                                >
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>,
                    document.body,
                )}
        </>
    );
}
