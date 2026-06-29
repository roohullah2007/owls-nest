import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

/**
 * Shared left-sidebar used across the app.
 *
 * Tokens:
 * - Title bar: h-[49px], px-5 py-3, border-b #E4E7EB, title is 16px font-bold #1f2530
 * - Menu item: h-9 (36px), px-5 (20px), text-[14px] font-normal capitalize, color #1f2530
 * - Expanded width: 200px. Collapsed width: 56px (icons only).
 *
 * Expanded by default; collapse toggle in the bottom-left of the sidebar
 * persists in localStorage so each browser remembers user preference.
 */

interface SidebarContextValue {
    collapsed: boolean;
    toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false, toggle: () => {} });

export function useSidebarContext() {
    return useContext(SidebarContext);
}

const STORAGE_KEY = 'sidebar:collapsed';

function readPersisted(): boolean {
    if (typeof window === 'undefined') return false;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'true';
}

export default function CrmSidebar({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState<boolean>(readPersisted);

    useEffect(() => {
        try { window.localStorage.setItem(STORAGE_KEY, collapsed ? 'true' : 'false'); } catch {}
    }, [collapsed]);

    const toggle = () => setCollapsed((c) => !c);

    return (
        <SidebarContext.Provider value={{ collapsed, toggle }}>
            <aside
                className={`hidden md:flex shrink-0 flex-col border-r border-[#E4E7EB] bg-white min-h-[calc(100vh-56px)] transition-[width] duration-200 ${
                    collapsed ? 'w-14' : 'w-[200px]'
                }`}
            >
                {children}
                <CollapseToggle />
            </aside>
        </SidebarContext.Provider>
    );
}

function CollapseToggle() {
    const { collapsed, toggle } = useContext(SidebarContext);
    return (
        <button
            onClick={toggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mt-auto flex items-center justify-center h-10 border-t border-[#E4E7EB] text-[#8B9096] hover:text-[#1f2530] hover:bg-[#F9FAFB] transition-colors"
        >
            <svg
                className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
        </button>
    );
}

interface SectionProps {
    title?: string;
    onBack?: () => void;
    children: ReactNode;
    border?: boolean;
    flex?: boolean;
}

export function CrmSidebarSection({ title, onBack, children, border = true, flex = false }: SectionProps) {
    const { collapsed } = useContext(SidebarContext);
    return (
        <div className={`${flex ? 'flex-1 flex flex-col' : ''}`}>
            {title && (
                <div className={`h-[49px] flex items-center ${collapsed ? 'px-0 justify-center' : 'px-5 py-3'} border-b border-[#E4E7EB]`}>
                    {onBack && !collapsed && (
                        <button
                            type="button"
                            onClick={onBack}
                            title="Back"
                            className="-ml-1 mr-2 inline-flex items-center justify-center h-7 w-7 rounded text-[#1f2530] hover:bg-[#F3F4F6] transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                    )}
                    {!collapsed && (
                        <span className="text-[16px] font-bold text-[#1f2530] truncate">{title}</span>
                    )}
                </div>
            )}
            <div className={`${collapsed ? 'px-1 py-2' : 'px-3 py-2'} ${border && !title ? 'border-b border-[#E4E7EB]' : ''} ${flex ? 'flex-1' : ''}`}>
                {children}
            </div>
        </div>
    );
}

export interface SidebarNavItem<K extends string> {
    key: K;
    label: string;
    count?: number;
    icon?: ReactNode;
    locked?: boolean;
}

interface NavProps<K extends string> {
    items: SidebarNavItem<K>[];
    activeKey: K;
    onSelect: (key: K) => void;
}

const LockIcon = (
    <svg className="h-4 w-4 text-[#C4C9D1]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
);

export function CrmSidebarNav<K extends string>({ items, activeKey, onSelect }: NavProps<K>) {
    const { collapsed } = useContext(SidebarContext);
    return (
        <nav className={`${collapsed ? 'space-y-0.5' : '-mx-3'}`}>
            {items.map((item) => {
                const isActive = activeKey === item.key;
                return (
                    <button
                        key={item.key}
                        onClick={() => onSelect(item.key)}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-2.5 w-full h-9 ${collapsed ? 'justify-center px-0 rounded-md' : 'px-5'} text-[14px] font-normal capitalize transition-colors text-[#1f2530] [&_svg]:h-4 [&_svg]:w-4 ${
                            isActive
                                ? 'bg-[#F3F4F6]'
                                : 'hover:bg-[#F9FAFB]'
                        }`}
                    >
                        {item.icon && (
                            <span className="shrink-0 text-[#1f2530]">
                                {item.icon}
                            </span>
                        )}
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left truncate">{item.label}</span>
                                {item.count !== undefined && item.count > 0 && (
                                    <span
                                        className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[11px] font-semibold rounded-full ${
                                            isActive ? 'bg-[#1f2530] text-white' : 'bg-[#E4E7EB] text-[#5F656D]'
                                        }`}
                                    >
                                        {item.count}
                                    </span>
                                )}
                                {item.locked && LockIcon}
                            </>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

interface DashedButtonProps {
    onClick: () => void;
    children: ReactNode;
}

export function CrmSidebarDashedButton({ onClick, children }: DashedButtonProps) {
    const { collapsed } = useContext(SidebarContext);
    if (collapsed) {
        return (
            <button
                onClick={onClick}
                title={typeof children === 'string' ? children : 'Add'}
                className="flex items-center justify-center w-10 h-10 mx-auto text-[#5F656D] border border-dashed border-[#C8CCD1] hover:border-[#1f2530] hover:text-[#1f2530] hover:bg-[#F9FAFB] rounded-md transition-colors"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>
        );
    }
    return (
        <button
            onClick={onClick}
            className="flex items-center justify-center gap-1.5 w-full h-9 text-[13px] font-medium border border-dashed border-[#C8CCD1] text-[#5F656D] rounded-md hover:border-[#1f2530] hover:text-[#1f2530] hover:bg-[#F9FAFB] transition-colors"
        >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {children}
        </button>
    );
}
