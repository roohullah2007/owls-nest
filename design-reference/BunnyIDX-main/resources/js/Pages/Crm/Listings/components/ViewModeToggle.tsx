import type { ListingsView } from '../types';

interface Props {
    value: ListingsView;
    onChange: (view: ListingsView) => void;
    className?: string;
}

const VIEW_OPTIONS: { key: ListingsView; label: string; icon: JSX.Element }[] = [
    {
        key: 'list',
        label: 'List',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />,
    },
    {
        key: 'grid',
        label: 'Grid',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />,
    },
    {
        key: 'map',
        label: 'Map',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />,
    },
];

export default function ViewModeToggle({ value, onChange, className = '' }: Props) {
    return (
        <div className={`hidden md:flex items-center bg-white border border-[#C8CCD1] rounded-[4px] p-0.5 shrink-0 ${className}`}>
            {VIEW_OPTIONS.map((opt) => (
                <button
                    key={opt.key}
                    type="button"
                    onClick={() => onChange(opt.key)}
                    title={opt.label}
                    className={`flex items-center gap-1 px-3 h-8 text-xs font-medium rounded-[4px] transition-colors ${
                        value === opt.key ? 'bg-[#1693C9] text-white' : 'text-[#5F656D] hover:text-[#111315]'
                    }`}
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">{opt.icon}</svg>
                    <span>{opt.label}</span>
                </button>
            ))}
        </div>
    );
}
