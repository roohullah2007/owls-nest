import { ButtonHTMLAttributes } from 'react';

/**
 * Primary auth-screen submit button — the teal brand style used across the
 * login / register / password screens. Pass standard button props
 * (type, disabled, onClick, …) through.
 */
export default function AuthButton({
    className = '',
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                'h-11 w-full rounded-lg bg-[#1693C9] text-sm font-semibold text-white shadow-sm ' +
                'transition-all duration-200 hover:bg-[#1380AF] active:bg-[#0F6E96] ' +
                'disabled:cursor-not-allowed disabled:opacity-50 ' +
                className
            }
        >
            {children}
        </button>
    );
}
