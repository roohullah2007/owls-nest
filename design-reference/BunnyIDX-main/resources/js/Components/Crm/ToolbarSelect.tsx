import { ReactNode } from 'react';

export type SelectOption = {
    value: string;
    label: string;
};

interface Props {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[] | ReactNode;
    className?: string;
    title?: string;
    disabled?: boolean;
    width?: string;
}

const CHEVRON_BG =
    'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggc3Ryb2tlPSIjOEI5MDk2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=")] bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.25em_1.25em]';

const BASE = `h-9 appearance-none pl-3 pr-8 text-xs bg-white text-[#5F656D] border border-[#C8CCD1] rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] cursor-pointer ${CHEVRON_BG}`;

export default function ToolbarSelect({
    value,
    onChange,
    options,
    className = '',
    title,
    disabled = false,
    width = '',
}: Props) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            title={title}
            disabled={disabled}
            className={`${BASE} ${width} ${className}`}
        >
            {Array.isArray(options)
                ? options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                          {opt.label}
                      </option>
                  ))
                : options}
        </select>
    );
}
