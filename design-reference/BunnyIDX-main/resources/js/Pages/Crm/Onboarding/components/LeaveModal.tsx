import Modal from '@/Components/Modal';

/** Confirmation shown when the user tries to close the wizard mid-flow. */
export default function LeaveModal({
    show,
    onStay,
    onLeave,
}: {
    show: boolean;
    onStay: () => void;
    onLeave: () => void;
}) {
    return (
        <Modal show={show} maxWidth="sm" onClose={onStay}>
            <div className="p-6">
                <h2 className="text-[17px] font-semibold text-[#111315]">Leave onboarding?</h2>
                <p className="mt-2 text-[13px] leading-[20px] text-[#5F656D]">Your progress won’t be saved.</p>

                <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onStay}
                        className="h-9 px-4 text-[13px] font-medium text-[#5F656D] hover:text-[#111315] transition-colors"
                    >
                        Keep editing
                    </button>
                    <button
                        type="button"
                        onClick={onLeave}
                        className="h-9 px-5 rounded-lg bg-[#DC2626] text-white text-[13px] font-semibold hover:bg-[#B91C1C] transition-colors"
                    >
                        Leave
                    </button>
                </div>
            </div>
        </Modal>
    );
}
