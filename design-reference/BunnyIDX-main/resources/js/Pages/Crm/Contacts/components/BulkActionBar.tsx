import { RefObject, useEffect, useRef, useState } from 'react';

/**
 * Bottom-fixed action bar that appears whenever the user has multi-selected contacts.
 * Exposes the four bulk operations: Tag (dropdown), Email, Power Dial, Delete.
 *
 * The bar is purely presentational — all state (selection, tag dropdown open/closed,
 * delete confirmation) and side effects (router.patch, etc) live in the parent page.
 */
interface Props {
    selectedCount: number;
    allTags: { id: number; name: string; color: string }[];
    leadTypes?: string[];
    actionPlans?: { id: number; name: string }[];
    showTagDropdown: boolean;
    setShowTagDropdown: (open: boolean) => void;
    tagDropdownRef: RefObject<HTMLDivElement>;
    confirmDelete: boolean;
    onTag: (tagId: number) => void;
    onChangeType?: (type: string) => void;
    onEnrollPlan?: (planId: number) => void;
    onSendEmail: () => void;
    onPowerDial: () => void;
    onDelete: () => void;
    onClear: () => void;
}

function titleCase(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BulkActionBar({
    selectedCount,
    allTags,
    leadTypes = [],
    actionPlans = [],
    showTagDropdown,
    setShowTagDropdown,
    tagDropdownRef,
    confirmDelete,
    onTag,
    onChangeType,
    onEnrollPlan,
    onSendEmail,
    onPowerDial,
    onDelete,
    onClear,
}: Props) {
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);
    const planDropdownRef = useRef<HTMLDivElement>(null);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const typeDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showPlanDropdown) return;
        function onDoc(e: globalThis.MouseEvent) {
            if (planDropdownRef.current && !planDropdownRef.current.contains(e.target as Node)) {
                setShowPlanDropdown(false);
            }
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [showPlanDropdown]);

    useEffect(() => {
        if (!showTypeDropdown) return;
        function onDoc(e: globalThis.MouseEvent) {
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
                setShowTypeDropdown(false);
            }
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [showTypeDropdown]);

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-12 bg-[#111315]">
            <div className="flex items-stretch h-full">
                <div className="flex items-center px-3 sm:px-5 border-r border-white/10 shrink-0">
                    <span className="text-xs font-medium text-white">{selectedCount} selected</span>
                </div>

                {/* Tag — opens a dropdown of available tags above the bar */}
                <div className="relative flex items-stretch shrink-0" ref={tagDropdownRef}>
                    <button
                        onClick={() => setShowTagDropdown(!showTagDropdown)}
                        className="flex items-center px-3 sm:px-4 text-xs font-medium text-white/60 border-r border-white/10 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <svg className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                        </svg>
                        <span className="hidden sm:inline">Tag</span>
                        <svg className="h-3 w-3 ml-1 hidden sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                    {showTagDropdown && (
                        <div className="absolute bottom-full mb-1 left-0 w-48 bg-white border border-[#E4E7EB] shadow-lg rounded-[4px] max-h-[250px] overflow-y-auto">
                            <div className="px-3 py-2 border-b border-[#E4E7EB]">
                                <span className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Apply Tag</span>
                            </div>
                            {allTags.length === 0 ? (
                                <p className="px-3 py-3 text-xs text-[#8B9096]">No tags created yet</p>
                            ) : (
                                allTags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => onTag(tag.id)}
                                        className="flex items-center w-full px-3 py-2 text-xs hover:bg-[#F9FAFB] transition-colors"
                                    >
                                        <span className="h-2.5 w-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: tag.color }} />
                                        <span className="text-[#5F656D] font-medium">{tag.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Change Type — sets the lead type on all selected contacts */}
                {onChangeType && leadTypes.length > 0 && (
                    <div className="relative flex items-stretch shrink-0" ref={typeDropdownRef}>
                        <button
                            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                            className="flex items-center px-3 sm:px-4 text-xs font-medium text-white/60 border-r border-white/10 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                            <span className="hidden sm:inline">Type</span>
                            <svg className="h-3 w-3 ml-1 hidden sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {showTypeDropdown && (
                            <div className="absolute bottom-full mb-1 left-0 w-48 bg-white border border-[#E4E7EB] shadow-lg rounded-[4px] max-h-[250px] overflow-y-auto">
                                <div className="px-3 py-2 border-b border-[#E4E7EB]">
                                    <span className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Change Type</span>
                                </div>
                                {leadTypes.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => { onChangeType(type); setShowTypeDropdown(false); }}
                                        className="flex items-center w-full px-3 py-2 text-xs text-[#5F656D] font-medium hover:bg-[#F9FAFB] transition-colors text-left"
                                    >
                                        {titleCase(type)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Send Email */}
                <button
                    onClick={onSendEmail}
                    className="flex items-center px-3 sm:px-4 text-xs font-medium text-white/60 border-r border-white/10 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                    <svg className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <span className="hidden sm:inline">Send Email</span>
                </button>

                {/* Power Dial — kicks off a session with the selected contacts */}
                <button
                    onClick={onPowerDial}
                    className="flex items-center px-3 sm:px-4 text-xs font-medium text-white/60 border-r border-white/10 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                    <svg className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    <span className="hidden sm:inline">Power Dial</span>
                </button>

                {/* Action Plan — enroll selected contacts into a plan */}
                {onEnrollPlan && (
                    <div className="relative flex items-stretch shrink-0" ref={planDropdownRef}>
                        <button
                            onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                            className="flex items-center px-3 sm:px-4 text-xs font-medium text-white/60 border-r border-white/10 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <svg className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                            </svg>
                            <span className="hidden sm:inline">Action Plan</span>
                            <svg className="h-3 w-3 ml-1 hidden sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {showPlanDropdown && (
                            <div className="absolute bottom-full mb-1 left-0 w-56 bg-white border border-[#E4E7EB] shadow-lg rounded-[4px] max-h-[250px] overflow-y-auto">
                                <div className="px-3 py-2 border-b border-[#E4E7EB]">
                                    <span className="text-[10px] font-semibold text-[#8B9096] tracking-wider">Enroll In Plan</span>
                                </div>
                                {actionPlans.length === 0 ? (
                                    <p className="px-3 py-3 text-xs text-[#8B9096]">No active action plans</p>
                                ) : (
                                    actionPlans.map((plan) => (
                                        <button
                                            key={plan.id}
                                            onClick={() => { onEnrollPlan(plan.id); setShowPlanDropdown(false); }}
                                            className="flex items-center w-full px-3 py-2 text-xs text-[#5F656D] font-medium hover:bg-[#F9FAFB] transition-colors text-left"
                                        >
                                            {plan.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Delete — two-click confirm (first click sets confirmDelete=true in parent) */}
                <button
                    onClick={onDelete}
                    className={`flex items-center px-3 sm:px-4 text-xs font-medium border-r border-white/10 transition-colors shrink-0 ${confirmDelete ? 'bg-red-600 text-white' : 'text-red-400 hover:text-red-300 hover:bg-white/10'}`}
                >
                    <svg className="h-4 w-4 sm:mr-1.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    <span className="hidden sm:inline">{confirmDelete ? 'Confirm Delete' : 'Delete'}</span>
                </button>

                <div className="flex-1" />
                <button
                    onClick={onClear}
                    className="flex items-center px-3 sm:px-5 text-xs font-medium text-white/40 border-l border-white/10 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                    Clear
                </button>
            </div>
        </div>
    );
}
