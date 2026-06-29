import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import SearchInput from '@/Components/Crm/SearchInput';
import { BLOCK_DEFINITIONS, BLOCK_CATEGORY_ORDER } from '@/website-editor/block-definitions';
import { EditorCapabilities } from '@/website-editor/types';

interface Props {
    onClose: () => void;
    onSelect: (type: string) => void;
    /** Hidden template sections that can be re-shown (optional). */
    hiddenSections?: { id: string; label: string }[];
    onRestoreSection?: (id: string) => void;
    /** Editor capabilities — blocks with an unmet `requires` are hidden. */
    capabilities?: EditorCapabilities;
}

/** Right-side slide-over listing the blocks you can insert, grouped by category. */
export default function BlockPaletteModal({ onClose, onSelect, hiddenSections = [], onRestoreSection, capabilities = {} }: Props) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const matches = (...haystacks: string[]) => q === '' || haystacks.some((h) => h.toLowerCase().includes(q));
    // A block requiring a capability (e.g. MLS sold comps for the AVM) is only
    // offered when that capability is available for this site.
    const allowed = (req?: string) => !req || capabilities[req as keyof EditorCapabilities] === true;

    // Group definitions by category, preserving each block's order within a group.
    const groups = BLOCK_CATEGORY_ORDER
        .map((category) => ({ category, blocks: BLOCK_DEFINITIONS.filter((d) => d.category === category && allowed(d.requires) && matches(d.label, d.type, d.category)) }))
        .filter((g) => g.blocks.length > 0);

    const visibleHidden = hiddenSections.filter((s) => matches(s.label));
    const noResults = groups.length === 0 && visibleHidden.length === 0;

    const groupLabel = 'text-[10px] font-semibold text-[#111315] uppercase tracking-wider px-1';

    return (
        <SlideOverModal title="Add a Block" onClose={onClose} width={360}>
            <div className="shrink-0 border-b border-[#E4E7EB] bg-white px-4 py-3">
                <SearchInput value={query} onChange={setQuery} placeholder="Search blocks…" autoFocus width="w-full" />
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5">
                {q === '' && <p className="text-[12px] text-[#8B9096] px-1">Pick a block to insert it at the chosen spot.</p>}

                {visibleHidden.length > 0 && onRestoreSection && (
                    <div className="space-y-2">
                        <p className={groupLabel}>Hidden Sections</p>
                        {visibleHidden.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => onRestoreSection(s.id)}
                                className="w-full flex items-center gap-3 p-2.5 text-left border border-[#E4E7EB] rounded-lg hover:border-[#1693C9] hover:bg-[#F3FAFD] transition-colors"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                </span>
                                <span className="text-[13px] font-medium text-[#111315] leading-snug">{s.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {groups.map((group) => (
                    <div key={group.category} className="space-y-2">
                        <p className={groupLabel}>{group.category}</p>
                        {group.blocks.map((def) => (
                            <button
                                key={def.type}
                                type="button"
                                onClick={() => onSelect(def.type)}
                                className="w-full flex items-center gap-3 p-2.5 text-left border border-[#E4E7EB] rounded-lg hover:border-[#1693C9] hover:bg-[#F3FAFD] transition-colors"
                            >
                                <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]"
                                    dangerouslySetInnerHTML={{ __html: def.icon }}
                                />
                                <span className="text-[13px] font-medium text-[#111315] leading-snug">{def.label}</span>
                            </button>
                        ))}
                    </div>
                ))}

                {noResults && (
                    <p className="text-[12px] text-[#8B9096] px-1 py-4 text-center">No blocks match &ldquo;{query.trim()}&rdquo;</p>
                )}
            </div>
        </SlideOverModal>
    );
}
