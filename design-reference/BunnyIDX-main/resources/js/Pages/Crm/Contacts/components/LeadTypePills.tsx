import { Ref } from 'react';

/**
 * Pill-style filter for the Contact `type` column (Buyer / Seller / All / custom).
 * Includes an inline "+ Add type" affordance that pops a small text input.
 *
 * Active state is dark-filled (`bg-[#111315] text-white`) to match the original
 * lead-type tabs the user expects.
 */

interface Props {
    leadTypes: string[];
    activeType: string | null;
    showAddLeadType: boolean;
    newLeadType: string;
    leadTypeRef: Ref<HTMLDivElement>;
    onTypeChange: (type: string) => void;
    onToggleAddLeadType: (show: boolean) => void;
    onNewLeadTypeChange: (value: string) => void;
    onAddLeadType: (e: React.FormEvent) => void;
}

function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LeadTypePills({
    leadTypes, activeType, showAddLeadType, newLeadType, leadTypeRef,
    onTypeChange, onToggleAddLeadType, onNewLeadTypeChange, onAddLeadType,
}: Props) {
    const pillCls = (isActive: boolean) =>
        `px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors whitespace-nowrap ${
            isActive ? 'bg-[#1693C9] text-white' : 'text-[#5F656D] hover:text-[#111315]'
        }`;

    return (
        <div className="hidden sm:flex items-center gap-0.5 ml-2 bg-white border border-[#C8CCD1] rounded-[4px] p-1">
            <button onClick={() => onTypeChange('')} className={pillCls(!activeType)}>
                All
            </button>
            {leadTypes.map((type) => (
                <button key={type} onClick={() => onTypeChange(type)} className={pillCls(activeType === type)}>
                    {capitalize(type)}
                </button>
            ))}

            <div className="flex items-center" ref={leadTypeRef}>
                {!showAddLeadType ? (
                    <button
                        onClick={() => onToggleAddLeadType(true)}
                        title="Add lead type"
                        className="flex items-center justify-center w-6 h-6 rounded-[4px] text-[#8B9096] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                ) : (
                    <form onSubmit={onAddLeadType} className="flex items-center">
                        <input
                            type="text"
                            value={newLeadType}
                            onChange={(e) => onNewLeadTypeChange(e.target.value)}
                            placeholder="e.g. investor"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Escape') { onToggleAddLeadType(false); onNewLeadTypeChange(''); } }}
                            className="w-28 h-7 px-3 text-xs border border-[#C8CCD1] rounded-[4px] bg-white text-[#111315] placeholder-[#8B9096] focus:outline-none focus:ring-1 focus:ring-[#1693C9]"
                        />
                        <button type="submit" disabled={!newLeadType.trim()} title="Save" className="ml-1 p-1 text-[#8B9096] hover:text-[#111315] disabled:opacity-30 transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                        </button>
                        <button type="button" onClick={() => { onToggleAddLeadType(false); onNewLeadTypeChange(''); }} title="Cancel" className="p-1 text-[#8B9096] hover:text-[#111315] transition-colors">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
