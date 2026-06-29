import { ButtonHTMLAttributes } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'default' | 'lg';
}

const variants = {
    primary: 'bg-[#1693C9] hover:bg-[#1380AF] active:bg-[#106E97] text-white',
    secondary: 'bg-[#F3F4F6] hover:bg-[#E4E7EB] text-[#303030]',
    outline: 'border border-[#E4E7EB] hover:border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] text-[#303030]',
    ghost: 'hover:bg-[#F3F4F6] text-[#303030]',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
};

const sizes = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-[44px] px-5 text-sm',
    lg: 'h-12 px-6 text-base',
};

export default function PrimaryButton({
    variant = 'primary',
    size = 'default',
    className = '',
    disabled,
    children,
    ...props
}: PrimaryButtonProps) {
    return (
        <button
            {...props}
            disabled={disabled}
            className={
                'inline-flex items-center justify-center font-medium transition-all duration-200 ' +
                'disabled:opacity-50 disabled:cursor-not-allowed ' +
                variants[variant] + ' ' +
                sizes[size] + ' ' +
                className
            }
            style={props.style}
        >
            {children}
        </button>
    );
}
