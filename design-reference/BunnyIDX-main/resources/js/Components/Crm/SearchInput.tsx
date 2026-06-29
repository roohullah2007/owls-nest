import { FormEvent, KeyboardEvent } from 'react';

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
    className?: string;
    inputClassName?: string;
    autoFocus?: boolean;
    width?: string;
}

const ICON = (
    <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8B9096] pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
    </svg>
);

const INPUT_BASE =
    'h-9 pl-9 pr-3 text-xs bg-white text-[#303030] placeholder-[#8B9096] border border-[#C8CCD1] rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] transition-colors';

export default function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    onSubmit,
    onKeyDown,
    className = '',
    inputClassName = '',
    autoFocus = false,
    width = 'w-40 sm:w-52',
}: Props) {
    const input = (
        <div className={`relative ${className}`}>
            {ICON}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className={`${INPUT_BASE} ${width} ${inputClassName}`}
            />
        </div>
    );

    if (onSubmit) {
        return (
            <form onSubmit={onSubmit} className="relative">
                {input}
            </form>
        );
    }

    return input;
}
