import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass as inputClass } from '@/Components/Crm/FormField';

interface Props {
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

export default function LostReasonModal({ onConfirm, onCancel }: Props) {
    const [reason, setReason] = useState('');

    const footer = (
        <>
            <button
                type="button"
                onClick={onCancel}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="button"
                onClick={() => onConfirm(reason)}
                className="h-8 px-5 bg-[#DC2626] text-white text-[12px] font-medium rounded hover:bg-[#B91C1C] transition-colors"
            >
                Mark as Lost
            </button>
        </>
    );

    return (
        <SlideOverModal title="Mark Deal as Lost" onClose={onCancel} footer={footer}>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
                <p className="text-[13px] text-[#5F656D]">Why was this deal lost? This is optional but helps the team learn from outcomes.</p>
                <div>
                    <FieldLabel htmlFor="lost_reason">Reason</FieldLabel>
                    <textarea
                        id="lost_reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Lost to competitor X, price, timing, etc."
                        rows={5}
                        autoFocus
                        className={inputClass + ' resize-none'}
                    />
                </div>
            </div>
        </SlideOverModal>
    );
}
