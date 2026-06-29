import { Link } from '@inertiajs/react';
import { ReactNode, MouseEvent, useEffect, useRef, useState } from 'react';

export type PrimaryButtonMenuItem = {
    label: string;
    icon?: ReactNode;
    href?: string;
    onClick?: () => void;
    divider?: false;
} | {
    divider: true;
    label?: undefined;
    icon?: undefined;
    href?: undefined;
    onClick?: undefined;
};

interface CommonProps {
    label: ReactNode;
    icon?: ReactNode | null;
    labelClassName?: string;
    className?: string;
    disabled?: boolean;
    title?: string;
    menuItems?: PrimaryButtonMenuItem[];
}

interface ButtonProps extends CommonProps {
    href?: undefined;
    type?: 'button' | 'submit' | 'reset';
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}

interface LinkProps extends CommonProps {
    href: string;
    type?: undefined;
    onClick?: undefined;
}

type Props = ButtonProps | LinkProps;

const PLUS_ICON = (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const DOTS_ICON = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
);

const HOVER = 'hover:bg-[#1380AF]';
const BG = 'bg-[#1693C9] text-white';
const COMMON =
    'inline-flex items-center justify-center gap-1.5 h-9 text-xs font-medium disabled:opacity-40 transition-colors shrink-0';

export default function PrimaryButton(props: Props) {
    const {
        label,
        icon = PLUS_ICON,
        labelClassName = 'hidden sm:inline',
        className = '',
        disabled,
        title,
        menuItems,
    } = props;

    const [menuOpen, setMenuOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function onDoc(e: globalThis.MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [menuOpen]);

    const content = (
        <>
            {icon}
            <span className={labelClassName}>{label}</span>
        </>
    );

    const hasMenu = !!menuItems && menuItems.length > 0;
    const primaryShape = hasMenu ? 'rounded-l-[4px] px-3.5' : 'rounded-[4px] px-3.5';
    const primaryClasses = `${COMMON} ${BG} ${HOVER} ${primaryShape} ${className}`;

    const primary =
        'href' in props && props.href !== undefined ? (
            <Link href={props.href} className={primaryClasses} title={title}>
                {content}
            </Link>
        ) : (
            <button
                type={props.type ?? 'button'}
                onClick={props.onClick}
                disabled={disabled}
                title={title}
                className={primaryClasses}
            >
                {content}
            </button>
        );

    if (!hasMenu) return primary;

    return (
        <div ref={wrapperRef} className="relative inline-flex shrink-0">
            {primary}
            <span className="w-px h-9 bg-white/25" aria-hidden />
            <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className={`${COMMON} ${BG} ${HOVER} rounded-r-[4px] px-2.5`}
            >
                {DOTS_ICON}
            </button>
            {menuOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 z-50 w-48 bg-white border border-[#E4E7EB] rounded-lg shadow-lg overflow-hidden"
                >
                    {menuItems!.map((item, i) => {
                        if (item.divider) {
                            return <div key={`d-${i}`} className="h-px bg-[#E4E7EB]" />;
                        }
                        const inner = (
                            <>
                                {item.icon && <span className="text-[#8B9096]">{item.icon}</span>}
                                <span>{item.label}</span>
                            </>
                        );
                        const cls =
                            'flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-[#111315] hover:bg-[#F9FAFB] transition-colors text-left';
                        if (item.href) {
                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={cls}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {inner}
                                </Link>
                            );
                        }
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                    setMenuOpen(false);
                                    item.onClick?.();
                                }}
                                className={cls}
                            >
                                {inner}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
