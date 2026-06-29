import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel } from '@/Components/Crm/FormField';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import { inputClass } from '../../../constants';
import { GridCard } from './marketingCards';

interface Props {
    card: GridCard;
    onChange: (patch: Partial<GridCard>) => void;
    onClose: () => void;
    onUploadImage: (file: File) => void;
    uploading: boolean;
    imagePreviewUrl: (v: string) => string;
}

/** Slide-over editor for one search-grid marketing card. */
export default function MarketingCardEditorModal({ card, onChange, onClose, onUploadImage, uploading, imagePreviewUrl }: Props) {
    return (
        <SlideOverModal
            title="Edit Marketing Card"
            onClose={onClose}
            width={460}
            footer={<PrimaryButton type="button" onClick={onClose} icon={null} label="Done" />}
        >
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                    <FieldLabel>Background image</FieldLabel>
                    {card.image ? (
                        <div className="relative h-[120px] w-full overflow-hidden rounded-md border border-[#E4E7EB]">
                            <img src={imagePreviewUrl(card.image)} alt="" className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onChange({ image: undefined })}
                                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                                aria-label="Remove image"
                                title="Remove image"
                            >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                            </button>
                        </div>
                    ) : (
                        <label className="flex h-[96px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-[#C8CCD1] text-[#8B9096] transition-colors hover:border-[#1693C9] hover:text-[#1693C9]">
                            {uploading ? (
                                <span className="text-[12px] font-medium">Uploading…</span>
                            ) : (
                                <>
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></svg>
                                    <span className="text-[12px] font-medium">Upload an image (optional)</span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploading}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    if (file) onUploadImage(file);
                                }}
                            />
                        </label>
                    )}
                    <p className="mt-1 text-[11px] text-[#8B9096]">JPG/PNG/WebP under 10 MB.</p>
                </div>
                <div>
                    <FieldLabel>Tag</FieldLabel>
                    <input type="text" value={card.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} className={inputClass} placeholder="e.g. Free Home Valuation" />
                </div>
                <div>
                    <FieldLabel>Body</FieldLabel>
                    <textarea rows={3} value={card.body ?? ''} onChange={(e) => onChange({ body: e.target.value })} className={inputClass} placeholder="What's your home worth? Get a free, no-obligation valuation in minutes." />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <FieldLabel>Button label</FieldLabel>
                        <input type="text" value={card.cta_text ?? ''} onChange={(e) => onChange({ cta_text: e.target.value })} className={inputClass} placeholder="Get my valuation" />
                    </div>
                    <div>
                        <FieldLabel>Button link</FieldLabel>
                        <input type="text" value={card.cta_url ?? ''} onChange={(e) => onChange({ cta_url: e.target.value })} className={inputClass} placeholder="/home-valuation" />
                    </div>
                </div>
                <div>
                    <FieldLabel help="1-based position in the results grid. The card slots in at this spot on page 1.">Grid position</FieldLabel>
                    <input type="number" min={1} max={40} value={card.slot ?? 3} onChange={(e) => onChange({ slot: Number(e.target.value) || 3 })} className={`${inputClass} max-w-[140px]`} />
                </div>
            </div>
        </SlideOverModal>
    );
}
