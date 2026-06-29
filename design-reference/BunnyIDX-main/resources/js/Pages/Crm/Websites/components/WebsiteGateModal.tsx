import Modal from '@/Components/Modal';
import { router } from '@inertiajs/react';

export type WebsiteGateReason = 'restricted' | 'limit';

interface Props {
    reason: WebsiteGateReason;
    onClose: () => void;
}

/**
 * Friendly explainer shown when "Create website" can't proceed:
 *  - 'restricted' → the user's plan doesn't include the websites feature.
 *  - 'limit'      → the user has used all websites their plan allows.
 * Keeps the existing create flow; this only fronts it with a clear message.
 */
export default function WebsiteGateModal({ reason, onClose }: Props) {
    const subscription = () => { onClose(); router.visit(route('crm.settings.tab', 'subscription')); };
    const viewPlans = () => { onClose(); router.visit(route('pricing')); };

    const content = reason === 'limit'
        ? {
            title: 'Website Limit Reached',
            message: 'You have already used all websites available in your current plan.',
            iconColor: '#B45309',
            iconBg: '#FFFBEB',
        }
        : {
            title: 'Website Creation Not Available',
            message: 'Your current plan does not include additional websites.',
            iconColor: '#1693C9',
            iconBg: '#E6F0FF',
        };

    return (
        <Modal show onClose={onClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: content.iconBg }}>
                        <svg className="h-5 w-5" style={{ color: content.iconColor }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[15px] font-semibold text-[#111315]">{content.title}</h2>
                        <p className="mt-1 text-[13px] text-[#5F656D] leading-relaxed">{content.message}</p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                    {reason === 'limit' ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={subscription}
                                className="h-9 px-4 text-xs font-medium border border-[#E4E7EB] text-[#5F656D] rounded-[4px] hover:bg-[#F3F4F6] transition-colors"
                            >
                                Manage Subscription
                            </button>
                            <button
                                type="button"
                                onClick={subscription}
                                className="h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                            >
                                Upgrade Plan
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={viewPlans}
                                className="h-9 px-4 text-xs font-medium border border-[#E4E7EB] text-[#5F656D] rounded-[4px] hover:bg-[#F3F4F6] transition-colors"
                            >
                                View Plans
                            </button>
                            <button
                                type="button"
                                onClick={subscription}
                                className="h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                            >
                                Upgrade
                            </button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}
