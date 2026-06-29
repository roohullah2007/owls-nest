import { PropsWithChildren, ReactNode } from 'react';

interface Props {
    title: string;
    subtitle?: string;
    right?: ReactNode;
    className?: string;
    bodyClassName?: string;
}

/** Section card with a titled header — the building block of each report tab. */
export default function Panel({ title, subtitle, right, className = '', bodyClassName = 'p-5', children }: PropsWithChildren<Props>) {
    return (
        <div className={`rounded-xl border border-[#E4E7EB] bg-white shadow-sm ${className}`}>
            <div className="flex items-start justify-between gap-3 border-b border-[#E4E7EB] px-5 py-3.5">
                <div>
                    <h2 className="text-sm font-semibold text-[#111315]">{title}</h2>
                    {subtitle && <p className="mt-0.5 text-[11px] text-[#8B9096]">{subtitle}</p>}
                </div>
                {right}
            </div>
            <div className={bodyClassName}>{children}</div>
        </div>
    );
}
