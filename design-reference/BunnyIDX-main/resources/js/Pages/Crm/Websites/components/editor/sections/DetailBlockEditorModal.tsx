import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel } from '@/Components/Crm/FormField';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import { inputClass } from '../../../constants';
import { DetailBlock, BLOCK_POSITIONS, MERGE_FIELDS } from './detailBlocks';

interface Props {
    block: DetailBlock;
    onChange: (patch: Partial<DetailBlock>) => void;
    onClose: () => void;
}

/** Slide-over editor for one custom listing-detail block. Edits live; the outer
 *  IDX-settings Save button persists everything. */
export default function DetailBlockEditorModal({ block, onChange, onClose }: Props) {
    const statuses = block.statuses ?? [];
    const toggleStatus = (st: string) =>
        onChange({ statuses: statuses.includes(st) ? statuses.filter((x) => x !== st) : [...statuses, st] });

    return (
        <SlideOverModal
            title="Edit Content Block"
            onClose={onClose}
            width={460}
            footer={<PrimaryButton type="button" onClick={onClose} icon={null} label="Done" />}
        >
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <FieldLabel>Title</FieldLabel>
                    <input type="text" value={block.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} className={inputClass} placeholder="Block title — e.g. Living in {{city}}" />
                </div>
                <div>
                    <FieldLabel>Body</FieldLabel>
                    <textarea rows={5} value={block.body ?? ''} onChange={(e) => onChange({ body: e.target.value })} className={inputClass} placeholder={'Thinking about {{address}}? Homes in {{city}} are moving fast — call {{agent_name}} at {{agent_phone}}.'} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <FieldLabel>CTA label</FieldLabel>
                        <input type="text" value={block.cta_text ?? ''} onChange={(e) => onChange({ cta_text: e.target.value })} className={inputClass} placeholder="Optional" />
                    </div>
                    <div>
                        <FieldLabel help="Use a full URL, or #tour to open the tour modal and #register for the signup modal.">CTA link</FieldLabel>
                        <input type="text" value={block.cta_url ?? ''} onChange={(e) => onChange({ cta_url: e.target.value })} className={inputClass} placeholder="URL, #tour or #register" />
                    </div>
                </div>
                <div>
                    <FieldLabel>Placement</FieldLabel>
                    <select value={block.position ?? 'after_description'} onChange={(e) => onChange({ position: e.target.value })} className={inputClass}>
                        {BLOCK_POSITIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                </div>
                <div>
                    <FieldLabel>Show when listing is</FieldLabel>
                    <div className="flex flex-wrap items-center gap-4">
                        {['active', 'pending', 'sold'].map((st) => (
                            <label key={st} className="flex items-center gap-1.5 text-[13px] font-medium text-[#111315] capitalize">
                                <input type="checkbox" checked={!statuses.length || statuses.includes(st)} onChange={() => toggleStatus(st)} className="rounded border-[#C8CCD1]" />
                                {st}
                            </label>
                        ))}
                        <span className="text-[11px] text-[#8B9096]">(all checked = every status)</span>
                    </div>
                </div>
                <div className="rounded-lg bg-[#F8FAFB] border border-[#E4E7EB] p-3">
                    <p className="text-[11px] leading-relaxed text-[#8B9096]"><span className="font-semibold text-[#5F656D]">Merge fields:</span> {MERGE_FIELDS}</p>
                </div>
            </div>
        </SlideOverModal>
    );
}
