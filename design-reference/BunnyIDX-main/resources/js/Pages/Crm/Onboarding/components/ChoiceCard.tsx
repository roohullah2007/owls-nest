import { ReactNode } from 'react';

/**
 * Selectable card used across feature/yes-no/single-choice steps. `multi` swaps
 * the indicator between a checkbox (multi-select) and a radio dot (single-select).
 */
export default function ChoiceCard({
    selected,
    onClick,
    title,
    description,
    icon,
    multi = false,
}: {
    selected: boolean;
    onClick: () => void;
    title: string;
    description?: string;
    icon?: ReactNode;
    multi?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left flex items-start gap-4 rounded-xl border p-4 transition-all ${
                selected
                    ? 'border-[#1693C9] bg-[#F0F9FE] ring-1 ring-[#1693C9]'
                    : 'border-[#E4E7EB] bg-white hover:border-[#1693C9]/50 hover:bg-[#FAFBFC]'
            }`}
        >
            {icon && (
                <span
                    className={`mt-0.5 h-10 w-10 shrink-0 flex items-center justify-center rounded-lg ${
                        selected ? 'bg-[#1693C9] text-white' : 'bg-[#E8F4FB] text-[#1693C9]'
                    }`}
                >
                    {icon}
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#111315]">{title}</span>
                {description && <span className="mt-0.5 block text-[13px] font-light leading-[20px] text-[#18181A]">{description}</span>}
            </span>
            <span
                className={`mt-1 shrink-0 flex items-center justify-center transition-colors ${
                    multi ? 'h-5 w-5 rounded-[5px]' : 'h-5 w-5 rounded-full'
                } ${selected ? 'bg-[#1693C9] border-[#1693C9]' : 'border-2 border-[#D1D5DB] bg-white'} border`}
            >
                {selected && (
                    multi ? (
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                    ) : (
                        <span className="h-2 w-2 rounded-full bg-white" />
                    )
                )}
            </span>
        </button>
    );
}
