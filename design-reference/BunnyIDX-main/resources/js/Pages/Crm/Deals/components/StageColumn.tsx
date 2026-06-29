import DealCard from './DealCard';
import { Deal, PipelineStage } from './types';
import { chevronClip, formatCurrency, tint } from './utils';

interface Props {
    stage: PipelineStage;
    deals: Deal[];
    isFirst: boolean;
    isLast: boolean;
    isDragOver: boolean;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
    onAddDeal: () => void;
    onEditDeal?: (deal: Deal) => void;
}

export default function StageColumn({
    stage,
    deals,
    isFirst,
    isLast,
    isDragOver,
    onDragOver,
    onDragLeave,
    onDrop,
    onAddDeal,
    onEditDeal,
}: Props) {
    const stageColor = stage.color || '#0891b2';
    const headerBg = tint(stageColor, 0.22);
    const headerClip = chevronClip(!isFirst, !isLast);
    const stageValue = deals.reduce((sum, d) => sum + Number(d.value), 0);

    return (
        <div
            className="min-w-[280px] w-[280px] flex-shrink-0 xl:flex-1 xl:w-auto flex flex-col"
            onDragOver={(e) => { e.preventDefault(); onDragOver(e); }}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {/* Stage header — stage-tinted bg, two-line layout, chevron-clipped to chain stages together */}
            <div
                className={`relative ${isFirst ? 'pl-4' : 'pl-7'} ${isLast ? 'pr-4' : 'pr-7'} py-3`}
                style={{ backgroundColor: headerBg, clipPath: headerClip }}
            >
                <h3 className="text-[16px] font-semibold text-[#111315] truncate leading-tight">{stage.name}</h3>
                <p className="text-[12px] text-[#5F656D] mt-0.5 leading-tight">
                    {formatCurrency(stageValue)} · {deals.length} deal{deals.length === 1 ? '' : 's'}
                </p>
            </div>

            {/* Cards container — visible darker grey so the stage body reads as a distinct band under the header */}
            <div className={`mt-2 p-2 space-y-2 flex-1 overflow-y-auto min-h-[80px] rounded-lg bg-[#EBECEF] transition-colors ${isDragOver ? 'ring-2 ring-[#1693C9]/40' : ''}`}>
                {deals.map((deal) => (
                    <DealCard
                        key={deal.id}
                        deal={deal}
                        onDragStart={(e) => { e.dataTransfer.setData('dealId', deal.id.toString()); }}
                        onEdit={onEditDeal ? () => onEditDeal(deal) : undefined}
                    />
                ))}
                {deals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-xs text-[#8B9096] mb-3">No deals</p>
                        <button
                            onClick={onAddDeal}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1693C9] bg-[#EBF5FF] border border-[#1693C9]/20 rounded-full hover:bg-[#DBEAFE] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Add deal
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onAddDeal}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-[#8B9096] hover:text-[#1693C9] hover:bg-white/60 rounded-md transition-colors"
                        title="Add deal to this stage"
                    >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add deal
                    </button>
                )}
            </div>
        </div>
    );
}
