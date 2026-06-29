import { forwardRef, InputHTMLAttributes, useEffect, useRef } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    isFocused?: boolean;
}

export default forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
    { className = '', isFocused = false, ...props },
    ref,
) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isFocused) {
            (ref as any)?.current?.focus() || inputRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            ref={ref || inputRef}
            className={
                'w-full h-11 px-3.5 py-2.5 border border-[#E4E7EB] hover:border-[#D1D5DB] rounded-lg ' +
                'focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9] focus:outline-none ' +
                'transition-all duration-200 text-[#303030] text-sm ' +
                'placeholder:text-[#8B9096] disabled:opacity-50 disabled:cursor-not-allowed ' +
                className
            }
        />
    );
});
