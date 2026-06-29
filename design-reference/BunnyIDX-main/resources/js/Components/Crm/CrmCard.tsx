import { Link } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

interface Props {
    title?: string;
    action?: { label: string; href: string };
    headerRight?: ReactNode;
    className?: string;
    noPadding?: boolean;
}

export default function CrmCard({ title, action, headerRight, className = '', noPadding, children }: PropsWithChildren<Props>) {
    const hasHeader = title || action || headerRight;

    return (
        <div className={`border border-[#E4E7EB] bg-white rounded-xl shadow-sm ${className}`}>
            {hasHeader && (
                <div className="flex items-center justify-between border-b border-[#E4E7EB] px-5 py-3">
                    {title && <h2 className="text-sm font-semibold text-[#111315]">{title}</h2>}
                    {action && (
                        <Link href={action.href} className="text-xs font-medium text-[#1693C9] hover:text-[#1693C9]">
                            {action.label}
                        </Link>
                    )}
                    {headerRight}
                </div>
            )}
            <div className={noPadding ? '' : 'px-5 py-4'}>
                {children}
            </div>
        </div>
    );
}
