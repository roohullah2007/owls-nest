import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { BLOCK_DEFS, DESIGN_BLOCKS } from '../blockSchema';

interface Props {
    existingTypes: string[];
    design?: string;
    onSelect: (type: string) => void;
    onClose: () => void;
}

const groupLabel = 'text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]';
const CATEGORY_ORDER = ['Lead Capture', 'Content'];

/** "Add a Block" palette — mirrors the Websites block palette slide-over. */
export default function BlockPaletteModal({ existingTypes, design, onSelect, onClose }: Props) {
    // Only offer blocks the page's Design can actually render.
    const allowed = (design && DESIGN_BLOCKS[design]) || null;
    const defs = allowed ? BLOCK_DEFS.filter((d) => allowed.includes(d.type)) : BLOCK_DEFS;
    const groups = CATEGORY_ORDER.map((category) => ({
        category,
        blocks: defs.filter((d) => d.category === category),
    })).filter((g) => g.blocks.length > 0);

    return (
        <SlideOverModal title="Add a Block" onClose={onClose} width={380}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-5">
                {groups.map((group) => (
                    <div key={group.category} className="space-y-2">
                        <p className={groupLabel}>{group.category}</p>
                        {group.blocks.map((def) => {
                            const disabled = def.singleton && existingTypes.includes(def.type);
                            return (
                                <button
                                    key={def.type}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onSelect(def.type)}
                                    className="w-full flex items-center gap-3 p-2.5 text-left border border-[#E4E7EB] rounded-lg hover:border-[#1693C9] hover:bg-[#F3FAFD] disabled:opacity-40 disabled:hover:border-[#E4E7EB] disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                >
                                    <span
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-[#E0F2FE] text-[#1693C9]"
                                        dangerouslySetInnerHTML={{ __html: def.icon }}
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-[13px] font-medium text-[#111315]">{def.label}</span>
                                        {disabled && <span className="block text-[11px] text-[#8B9096]">Already added</span>}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </SlideOverModal>
    );
}
