import { ReactNode } from 'react';

/**
 * Underlined tab strip — used inside settings sub-tabs, profile sub-panes, and
 * anywhere the tabbed surface needs to feel light instead of pill-shaped.
 *
 * Active: weight 500, color rgb(7,9,15), 14px / 20px, 2px bottom border.
 * Inactive: same size, #5F656D, no border, hover darkens to #1f2530.
 */

export interface SimpleTab<T extends string = string> {
    key: T;
    label: string;
    icon?: ReactNode;
    count?: number;
}

interface Props<T extends string = string> {
    tabs: SimpleTab<T>[];
    active: T;
    onChange: (key: T) => void;
    className?: string;
}

export default function SimpleTabs<T extends string = string>({ tabs, active, onChange, className = '' }: Props<T>) {
    return (
        <div className={`flex items-center gap-6 border-b border-[#E4E7EB] ${className}`}>
            {tabs.map((t) => {
                const isActive = active === t.key;
                return (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => onChange(t.key)}
                        className={`relative -mb-px h-10 inline-flex items-center gap-2 border-b-2 transition-colors ${
                            isActive
                                ? 'border-[#1f2530] text-[rgb(7,9,15)]'
                                : 'border-transparent text-[#5F656D] hover:text-[#1f2530]'
                        }`}
                        style={{
                            fontSize: '14px',
                            lineHeight: '20px',
                            fontWeight: isActive ? 500 : 400,
                        }}
                    >
                        {t.icon && <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{t.icon}</span>}
                        <span>{t.label}</span>
                        {t.count !== undefined && t.count > 0 && (
                            <span className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full ${
                                isActive ? 'bg-[#1f2530] text-white' : 'bg-[#E4E7EB] text-[#5F656D]'
                            }`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
