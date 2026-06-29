import { ReactNode, useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import SearchInput from '@/Components/Crm/SearchInput';

export interface PaletteItem {
    key: string;
    label: string;
    description?: string;
    icon: ReactNode;
}

interface Props {
    title: string;
    intro?: string;
    items: PaletteItem[];
    onSelect: (key: string) => void;
    onClose: () => void;
}

/**
 * Right-side block palette — mirrors PageBlockEditor's BlockPaletteModal so the
 * IDX detail / marketing tabs add blocks the exact same way the page editor does.
 * Picking an item inserts it at the end of the list and (caller's choice) opens
 * its editor.
 */
export default function PaletteSlideOver({ title, intro, items, onSelect, onClose }: Props) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const visible = items.filter((i) => q === '' || `${i.label} ${i.description ?? ''}`.toLowerCase().includes(q));

    return (
        <SlideOverModal title={title} onClose={onClose} width={380}>
            <div className="shrink-0 border-b border-[#E4E7EB] bg-white px-4 py-3">
                <SearchInput value={query} onChange={setQuery} placeholder="Search blocks…" autoFocus width="w-full" />
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2">
                {intro && q === '' && <p className="px-1 pb-1 text-[12px] text-[#8B9096]">{intro}</p>}
                {visible.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => onSelect(item.key)}
                        className="w-full flex items-start gap-3 p-2.5 text-left border border-[#E4E7EB] rounded-lg hover:border-[#1693C9] hover:bg-[#F3FAFD] transition-colors"
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]">{item.icon}</span>
                        <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-[#111315] leading-snug">{item.label}</span>
                            {item.description && <span className="mt-0.5 block text-[12px] text-[#8B9096] leading-snug">{item.description}</span>}
                        </span>
                    </button>
                ))}
                {visible.length === 0 && (
                    <p className="px-1 py-4 text-center text-[12px] text-[#8B9096]">No blocks match &ldquo;{query.trim()}&rdquo;</p>
                )}
            </div>
        </SlideOverModal>
    );
}
