import CrmSidebar, {
    CrmSidebarDashedButton,
    CrmSidebarSection,
    useSidebarContext,
} from '@/Components/Crm/CrmSidebar';
import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import type { Hotsheet, ListingsTab } from '../types';

const TAB_LABELS: Record<ListingsTab, string> = {
    mine: 'My Listings',
    office: 'Office Listings',
    all: 'MLS Listings',
};

const tabIcons: Record<ListingsTab, JSX.Element> = {
    mine: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045c.439-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
    ),
    office: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
        </svg>
    ),
    all: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
        </svg>
    ),
};

interface Props {
    tab: ListingsTab;
    onSwitchTab: (tab: ListingsTab) => void;

    hotsheets: Hotsheet[];
    activeHotsheetId: number | null;

    onApplyHotsheet: (h: Hotsheet) => void;
    onDeleteHotsheet: (id: number) => void;
    onAddHotsheetClick: () => void;
    /** Rename a hotsheet and/or overwrite its filters with the current state. */
    onUpdateHotsheet: (id: number, payload: { name?: string; filters?: 'current' }) => void;
}

export default function ListingsSidebar(props: Props) {
    const {
        tab, onSwitchTab,
        hotsheets, activeHotsheetId,
        onApplyHotsheet, onDeleteHotsheet, onAddHotsheetClick, onUpdateHotsheet,
    } = props;

    return (
        <CrmSidebar>
            <CrmSidebarSection title="Properties">
                <ListingsNav tab={tab} onSwitchTab={onSwitchTab} />

                <HotsheetGroup
                    hotsheets={hotsheets}
                    activeHotsheetId={activeHotsheetId}
                    onApplyHotsheet={onApplyHotsheet}
                    onDeleteHotsheet={onDeleteHotsheet}
                    onAddHotsheetClick={onAddHotsheetClick}
                    onUpdateHotsheet={onUpdateHotsheet}
                />
            </CrmSidebarSection>
        </CrmSidebar>
    );
}

interface ListingsNavProps {
    tab: ListingsTab;
    onSwitchTab: (tab: ListingsTab) => void;
}

function ListingsNav({ tab, onSwitchTab }: ListingsNavProps) {
    const { collapsed } = useSidebarContext();
    const tabs = (Object.keys(TAB_LABELS) as ListingsTab[]);
    return (
        <nav className={collapsed ? 'space-y-0.5' : '-mx-3'}>
            {tabs.map((t) => {
                const isActive = tab === t;
                return (
                    <button
                        key={t}
                        onClick={() => onSwitchTab(t)}
                        title={collapsed ? TAB_LABELS[t] : undefined}
                        className={`flex items-center gap-2.5 w-full h-9 ${collapsed ? 'justify-center px-0 rounded-md' : 'px-5'} text-[14px] font-normal capitalize transition-colors text-[#1f2530] [&_svg]:h-4 [&_svg]:w-4 ${
                            isActive ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'
                        }`}
                    >
                        <span className="shrink-0 text-[#1f2530]">{tabIcons[t]}</span>
                        {!collapsed && <span className="flex-1 text-left truncate">{TAB_LABELS[t]}</span>}
                    </button>
                );
            })}
        </nav>
    );
}

interface HotsheetGroupProps {
    hotsheets: Hotsheet[];
    activeHotsheetId: number | null;
    onApplyHotsheet: (h: Hotsheet) => void;
    onDeleteHotsheet: (id: number) => void;
    onAddHotsheetClick: () => void;
    onUpdateHotsheet: (id: number, payload: { name?: string; filters?: 'current' }) => void;
}

function HotsheetGroup({ hotsheets, activeHotsheetId, onApplyHotsheet, onDeleteHotsheet, onAddHotsheetClick, onUpdateHotsheet }: HotsheetGroupProps) {
    const { collapsed } = useSidebarContext();

    if (collapsed) {
        return (
            <div className="mt-3 pt-3 border-t border-[#E4E7EB] space-y-0.5">
                {hotsheets.map((h) => {
                    const isActive = activeHotsheetId === h.id;
                    return (
                        <button
                            key={h.id}
                            onClick={() => onApplyHotsheet(h)}
                            title={h.name}
                            className={`flex items-center justify-center w-full h-9 rounded-md transition-colors ${
                                isActive ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'
                            }`}
                        >
                            <svg className="h-4 w-4 text-[#7C36EE]" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                            </svg>
                        </button>
                    );
                })}
                <div className="pt-1">
                    <CrmSidebarDashedButton onClick={onAddHotsheetClick}>Add a Sheet</CrmSidebarDashedButton>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-5">
            <div className="px-2 mb-1.5 text-[10px] font-semibold text-[#8B9096] tracking-wider">
                Hotsheets
            </div>

            {hotsheets.length === 0 ? (
                <p className="px-2 mb-2 text-[11px] text-[#8B9096] italic leading-snug">
                    Save MLS searches you run often.
                </p>
            ) : (
                <nav className="-mx-3 mb-2">
                    {hotsheets.map((h) => (
                        <HotsheetItem
                            key={h.id}
                            hotsheet={h}
                            isActive={activeHotsheetId === h.id}
                            onApply={() => onApplyHotsheet(h)}
                            onDelete={() => onDeleteHotsheet(h.id)}
                            onRename={(name) => onUpdateHotsheet(h.id, { name })}
                            onSaveCurrentFilters={() => onUpdateHotsheet(h.id, { filters: 'current' })}
                        />
                    ))}
                </nav>
            )}

            <CrmSidebarDashedButton onClick={onAddHotsheetClick}>Add a Sheet</CrmSidebarDashedButton>
        </div>
    );
}

interface HotsheetItemProps {
    hotsheet: Hotsheet;
    isActive: boolean;
    onApply: () => void;
    onDelete: () => void;
    onRename: (name: string) => void;
    onSaveCurrentFilters: () => void;
}

function HotsheetItem({ hotsheet, isActive, onApply, onDelete, onRename, onSaveCurrentFilters }: HotsheetItemProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(hotsheet.name);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync external rename results back into the editable draft so the input
    // doesn't go stale after a successful PATCH round-trip.
    useEffect(() => { if (!editing) setDraft(hotsheet.name); }, [hotsheet.name, editing]);
    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

    function commit() {
        const next = draft.trim();
        setEditing(false);
        if (next && next !== hotsheet.name) onRename(next);
        else setDraft(hotsheet.name);
    }
    function cancel() {
        setEditing(false);
        setDraft(hotsheet.name);
    }
    function onKey(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    }

    return (
        <div className={`group relative flex items-center transition-colors ${
            isActive ? 'bg-[#F3F4F6]' : 'hover:bg-[#F9FAFB]'
        }`}>
            {editing ? (
                <div className="flex-1 flex items-center gap-2.5 h-9 px-5">
                    <svg className="h-3.5 w-3.5 shrink-0 text-[#7C36EE]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={onKey}
                        className="flex-1 min-w-0 bg-white border border-[#1693C9] rounded-[3px] px-1.5 py-0 text-[13px] text-[#111315] focus:outline-none"
                    />
                </div>
            ) : (
                <button
                    onClick={onApply}
                    className={`flex-1 flex items-center gap-2.5 h-9 px-5 text-[13px] font-normal text-left truncate transition-colors ${
                        isActive ? 'text-[#111315]' : 'text-[#1f2530]'
                    }`}
                >
                    <svg className="h-3.5 w-3.5 shrink-0 text-[#7C36EE]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                    </svg>
                    <span className="truncate">{hotsheet.name}</span>
                </button>
            )}
            {!editing && (
                <div className="flex items-center gap-0.5 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isActive && (
                        <button
                            onClick={onSaveCurrentFilters}
                            title="Save current filters into this hotsheet"
                            className="p-1 text-[#8B9096] hover:text-[#1693C9] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={() => setEditing(true)}
                        title="Rename"
                        className="p-1 text-[#8B9096] hover:text-[#111315] transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                    </button>
                    <button
                        onClick={onDelete}
                        title="Delete"
                        className="p-1 text-[#8B9096] hover:text-[#EF4444] transition-colors"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
