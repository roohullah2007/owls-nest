import type { SavedContactView } from './types';

/**
 * Full-width white subheader bar at the top of the Contacts page that hosts
 * built-in views (All / My Leads / etc.) + saved Smart Lists.
 *
 * Active tab is marked with a primary-color bottom border (no fill) — matches
 * the contact-show status-bar pattern. Smart lists get an inline kebab menu
 * (Edit / Set default / Delete). Scrolls horizontally when there are many.
 */

interface BuiltInView {
    key: string;
    label: string;
}

interface Props {
    builtInViews: BuiltInView[];
    savedViews: SavedContactView[];
    activeBuiltInView: string | null;
    activeSmartList: SavedContactView | null | undefined;
    onBuiltInViewClick: (key: string) => void;
    onSmartListClick: (id: number) => void;
    onAddView: () => void;
}

export default function SmartListsSubheader({
    builtInViews, savedViews, activeBuiltInView, activeSmartList,
    onBuiltInViewClick, onSmartListClick, onAddView,
}: Props) {
    return (
        <div className="shrink-0 bg-white border-b border-[#E4E7EB] px-3 sm:px-6 flex items-center gap-1 overflow-x-auto">
            {builtInViews.map((bv) => {
                const isActive = !activeSmartList && activeBuiltInView === bv.key;
                return (
                    <button
                        key={`bv:${bv.key}`}
                        type="button"
                        onClick={() => onBuiltInViewClick(bv.key)}
                        className={`inline-flex items-center gap-1.5 h-10 px-3 text-[12px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                            isActive
                                ? 'text-[#1693C9] border-[#1693C9]'
                                : 'text-[#5F656D] border-transparent hover:text-[#111315]'
                        }`}
                    >
                        {bv.label}
                    </button>
                );
            })}
            {savedViews.length > 0 && <span className="mx-1 h-4 w-px bg-[#E4E7EB] shrink-0" aria-hidden />}
            {savedViews.map((view) => {
                const isActive = activeSmartList?.id === view.id;
                return (
                    <button
                        key={`sv:${view.id}`}
                        type="button"
                        onClick={() => onSmartListClick(view.id)}
                        className={`inline-flex items-center gap-1.5 h-10 px-3 text-[12px] font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                            isActive
                                ? 'text-[#1693C9] border-[#1693C9]'
                                : 'text-[#5F656D] border-transparent hover:text-[#111315]'
                        }`}
                    >
                        {view.name}
                        {view.is_default && (
                            <svg className="h-3 w-3 text-[#D97706] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
                            </svg>
                        )}
                    </button>
                );
            })}
            <button
                onClick={onAddView}
                title="New smart list"
                className="inline-flex items-center gap-1 h-10 px-3 text-[12px] font-medium text-[#1693C9] hover:text-[#1380AF] whitespace-nowrap shrink-0 transition-colors border-b-2 border-transparent ml-2"
            >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add
            </button>
        </div>
    );
}
