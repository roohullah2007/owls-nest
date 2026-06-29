import { SelectHTMLAttributes } from 'react';

/**
 * Native <select> with consistent styling across the CRM (matches the contacts
 * page form selects). Includes a custom chevron because `appearance-none`
 * removes the browser-native indicator.
 *
 * Use `size="sm"` for table/inline usage, `size="md"` for forms.
 */

interface Props extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    size?: 'sm' | 'md';
    fullWidth?: boolean;
    chevron?: 'down' | 'up-down';
}

export default function NativeSelect({ size = 'md', fullWidth = false, chevron = 'down', className = '', children, ...rest }: Props) {
    const sizing = size === 'sm'
        ? 'py-1.5 pl-2 pr-7 text-[12px]'
        : 'py-2 pl-3 pr-9 text-[13px]';
    const chevronOffset = size === 'sm' ? 'right-1.5 w-3 h-3' : 'right-3 w-4 h-4';

    return (
        <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`}>
            <select
                className={`appearance-none ${sizing} font-medium text-[#111315] bg-white border border-[#E4E7EB] rounded-[4px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1693C9] focus:border-[#1693C9] disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''} ${className}`}
                {...rest}
            >
                {children}
            </select>
            <svg className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-[#8B9096] ${chevronOffset}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {chevron === 'up-down' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
            </svg>
        </div>
    );
}
