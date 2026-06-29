import { PropsWithChildren } from 'react';

interface Props {
    className?: string;
}

export default function CrmToolbar({ className = '', children }: PropsWithChildren<Props>) {
    return (
        <div className={`bg-white border-b border-[#E4E7EB] ${className}`}>
            <div className="flex items-stretch h-11">
                {children}
            </div>
        </div>
    );
}

/* Toolbar sub-components */

export function ToolbarTitle({ children, count }: PropsWithChildren<{ count?: number }>) {
    return (
        <div className="flex items-center px-5 border-r border-[#E4E7EB] shrink-0">
            <span className="text-xs font-semibold text-[#111315] tracking-wider">{children}</span>
            {count !== undefined && (
                <span className="ml-2 text-[10px] text-[#5F656D] font-medium">{count}</span>
            )}
        </div>
    );
}

export function ToolbarFilter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode; width?: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                active ? 'bg-[#E4E7EB] text-[#111315] font-semibold' : 'text-[#5F656D] hover:bg-[#F9FAFB] hover:text-[#111315]'
            }`}
        >
            {children}
        </button>
    );
}

export function ToolbarSpacer() {
    return <div className="flex-1" />;
}

export function ToolbarAction({ onClick, href, children, className = '' }: { onClick?: () => void; href?: string; children: React.ReactNode; className?: string }) {
    const base = `flex items-center gap-1.5 px-4 border-l border-[#E4E7EB] text-xs font-medium text-[#111315] hover:bg-[#F3F4F6] transition-colors shrink-0 ${className}`;

    if (href) {
        // Using native anchor to avoid importing Link here — pages can use Link wrapper
        return <a href={href} className={base}>{children}</a>;
    }

    return <button type="button" onClick={onClick} className={base}>{children}</button>;
}
