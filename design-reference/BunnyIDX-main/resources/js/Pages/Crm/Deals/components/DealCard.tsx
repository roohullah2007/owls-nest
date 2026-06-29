import { Link } from '@inertiajs/react';
import { getAvatarColor, getInitials } from '@/utils/avatarColors';
import { Deal } from './types';
import { contactNames, formatCurrency, formatDate, getStaleDays, typeLabels } from './utils';

interface Props {
    deal: Deal;
    onDragStart?: (e: React.DragEvent) => void;
    onEdit?: () => void;
}

export default function DealCard({ deal, onDragStart, onEdit }: Props) {
    const primaryContact = deal.contacts?.[0];
    const stale = getStaleDays(deal.last_activity_at);
    const hasType = deal.type && deal.type !== 'buy';
    const hasMeta = primaryContact || deal.expected_close_date || hasType;

    return (
        <Link
            href={route('crm.deals.show', deal.id)}
            draggable
            onDragStart={onDragStart}
            className="block relative cursor-grab bg-white rounded-[4px] p-3 shadow-sm hover:shadow-md transition-all group"
        >
            {onEdit && (
                <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                    title="Edit deal"
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-all"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                </button>
            )}
            {stale >= 7 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" title={`Stalled ${stale}d`} />}
            {stale >= 3 && stale < 7 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-orange-400" title={`${stale}d since activity`} />}

            <p className="text-[15px] font-semibold text-[#111315] group-hover:text-[#1693C9] truncate pr-3">{deal.title}</p>
            <p className="text-sm font-medium text-[#059669] mt-0.5">{formatCurrency(deal.value)}</p>

            {hasMeta && (
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#F3F4F6]">
                    {primaryContact ? (
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span
                                className="shrink-0 h-5 w-5 flex items-center justify-center rounded-full text-[8px] font-bold text-white"
                                style={{ backgroundColor: getAvatarColor(primaryContact.id) }}
                            >
                                {getInitials(`${primaryContact.first_name} ${primaryContact.last_name}`)}
                            </span>
                            <span className="text-xs text-[#5F656D] truncate">{contactNames(deal.contacts)}</span>
                        </div>
                    ) : <span className="flex-1" />}

                    <div className="flex items-center gap-1.5 shrink-0">
                        {hasType && (
                            <span className="inline-flex px-1.5 py-0.5 text-[9px] font-medium text-[#5F656D] bg-[#F3F4F6] rounded uppercase">
                                {typeLabels[deal.type] || deal.type}
                            </span>
                        )}
                        {deal.expected_close_date && (
                            <span className="text-[10px] text-[#8B9096]">{formatDate(deal.expected_close_date)}</span>
                        )}
                    </div>
                </div>
            )}
        </Link>
    );
}
