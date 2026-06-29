import { ReactNode } from 'react';
import { formInputClass } from '@/Components/Crm/FormField';

/**
 * Form-field tokens for NewListingModal — re-export the global formInputClass
 * so every input/select/textarea in the modal matches the design system
 * (same look as Add Person modal, settings panes, etc.).
 */

export const INPUT_CLASS = formInputClass;

export const SELECT_CLASS = formInputClass + ' cursor-pointer';

export const TEXTAREA_CLASS = formInputClass + ' resize-y min-h-[80px]';

export const LABEL_CLASS = 'block text-[13px] font-normal text-[#5F656D] leading-[18px] mb-1';

export function Field({
    label,
    error,
    required,
    children,
    className = '',
}: {
    label: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <label className={LABEL_CLASS}>
                {label}
                {required && <span className="ml-0.5 text-[#DC2626]">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-[11px] text-[#DC2626]">{error}</p>}
        </div>
    );
}

export function SectionTitle({ children }: { children: ReactNode }) {
    return <h3 className="text-sm font-semibold text-[#111315]">{children}</h3>;
}
