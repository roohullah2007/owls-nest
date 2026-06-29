import { ReactNode, Ref } from 'react';

export type PillTab<T extends string = string> = {
    key: T;
    label?: string;
    icon?: ReactNode;
    /** Element rendered inside the pill button, after the label (e.g. star for default views). */
    iconRight?: ReactNode;
    count?: number;
    title?: string;
    /** Render a vertical divider before this tab (used to separate built-in views from saved views). */
    divider?: boolean;
    /**
     * Absolutely-positioned content rendered next to the pill button (e.g. a hover-revealed
     * kebab menu on saved views). The button gets wrapped in a `relative group` div so this
     * content can use group-hover / absolute positioning freely.
     */
    rightSlot?: ReactNode;
    /** Attach a ref to the wrapping div (only applies when rightSlot is set). Useful for click-outside detection. */
    wrapperRef?: Ref<HTMLDivElement>;
};

interface PillTabsProps<T extends string = string> {
    tabs: PillTab<T>[];
    active: T;
    onChange: (key: T) => void;
    className?: string;
    fullWidth?: boolean;
    size?: 'sm' | 'md';
    /** Optional content rendered after the last tab, inside the pill container (e.g. a "+ New view" button). */
    trailing?: ReactNode;
    /**
     * When set, the tab list scrolls horizontally inside this max-width. The
     * `trailing` element stays pinned outside the scroll so things like a "+ New
     * view" button never get pushed off-screen by too many tabs.
     * Pass a tailwind max-width class fragment like "480px" or "32rem".
     */
    maxTabsWidth?: string;
}

export default function PillTabs<T extends string = string>({
    tabs,
    active,
    onChange,
    className = '',
    fullWidth = false,
    size = 'md',
    trailing,
    maxTabsWidth,
}: PillTabsProps<T>) {
    const containerHeight = size === 'sm' ? 'h-8' : 'h-9';
    const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';

    const tabsList = (
        <>
            {renderTabs()}
        </>
    );

    // Wrap tabs in a horizontally scrollable area when maxTabsWidth is set.
    // The trailing slot stays OUTSIDE the scroll so it remains pinned at the end.
    // Use inline scrollbar styles to avoid relying on a tailwind plugin: hide
    // scrollbar visually but keep wheel/touch scrolling working on all browsers.
    const scrollableTabs = maxTabsWidth ? (
        <div
            className="flex items-center gap-0.5 overflow-x-auto min-w-0 [&::-webkit-scrollbar]:hidden"
            style={{ maxWidth: maxTabsWidth, scrollbarWidth: 'none' as const, msOverflowStyle: 'none' as const }}
        >
            {tabsList}
        </div>
    ) : tabsList;

    return (
        <div
            className={`inline-flex items-center gap-0.5 bg-white border border-[#E4E7EB] rounded-[4px] p-1 ${containerHeight} ${className}`}
        >
            {scrollableTabs}
            {trailing}
        </div>
    );

    function renderTabs() {
        return tabs.map((tab) => {
                const isActive = active === tab.key;
                const hasCount = typeof tab.count === 'number' && tab.count > 0;
                // Pad the right side more when there's a rightSlot (kebab) so the
                // slot can sit absolutely inside the pill without overlapping text.
                const paddingX = tab.rightSlot ? 'pl-3 pr-7' : 'px-3';
                const button = (
                    <button
                        type="button"
                        onClick={() => onChange(tab.key)}
                        title={tab.title}
                        className={`${fullWidth ? 'flex-1' : ''} h-full inline-flex items-center justify-center gap-1 ${paddingX} ${textSize} font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                            isActive
                                ? 'bg-[#1693C9] text-white shadow-sm'
                                : 'text-[#111315] hover:bg-[#F3F4F6]'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.iconRight}
                        {hasCount && (
                            <span
                                className={`ml-0.5 inline-flex items-center justify-center h-4 min-w-[16px] px-1.5 text-[10px] font-medium rounded-full ${
                                    isActive ? 'bg-white/25 text-white' : 'bg-[#F3F4F6] text-[#5F656D]'
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );

                return (
                    <span key={tab.key} className="contents">
                        {tab.divider && <span className="mx-1 h-4 w-px bg-[#E4E7EB]" aria-hidden />}
                        {tab.rightSlot ? (
                            <div
                                ref={tab.wrapperRef}
                                data-active={isActive || undefined}
                                className={`group/pill relative flex items-stretch h-full ${fullWidth ? 'flex-1' : ''}`}
                            >
                                {button}
                                {tab.rightSlot}
                            </div>
                        ) : (
                            button
                        )}
                    </span>
                );
        });
    }
}
