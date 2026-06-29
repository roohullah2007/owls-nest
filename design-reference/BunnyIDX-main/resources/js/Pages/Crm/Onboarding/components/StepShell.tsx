import { ReactNode } from 'react';

/**
 * Shared layout for a wizard step: the spec'd 24/32 bold title and 14/24 normal
 * subtitle (both rgb(24,24,26) = #18181A), with the step body below.
 */
export default function StepShell({
    title,
    subtitle,
    children,
    maxWidth = 'max-w-xl',
}: {
    title: string;
    subtitle?: ReactNode;
    children: ReactNode;
    maxWidth?: string;
}) {
    return (
        <div className={`w-full ${maxWidth} mx-auto`}>
            <h1 className="text-[24px] font-bold leading-[32px] text-[#18181A] tracking-[-0.01em]">{title}</h1>
            {subtitle && (
                <p className="mt-2 text-[14px] font-normal leading-[24px] text-[#18181A]">{subtitle}</p>
            )}
            <div className="mt-8">{children}</div>
        </div>
    );
}
