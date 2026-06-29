import { Link } from '@inertiajs/react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';

/**
 * Modal shown when a user clicks Email or Call on a contact row before the underlying
 * channel is configured. Routes them to the relevant settings tab (phone provisioning
 * or email connection) instead of failing silently.
 */
export default function ChannelSetupPromptModal({ kind, onClose }: { kind: 'phone' | 'email'; onClose: () => void }) {
    const isPhone = kind === 'phone';
    const title = isPhone ? 'Set up calling' : 'Connect your email';
    const heading = isPhone ? "You don't have a phone number yet" : "You haven't connected an email account yet";
    const blurb = isPhone
        ? 'Calls go out through our Telnyx integration. Pick a local number so contacts see a real caller ID, then call straight from any lead.'
        : 'Connect a Gmail or Outlook account to send and receive from BunnyIDX. Or buy a custom-domain inbox so every send lands as you@yourbrokerage.com.';
    const primaryLabel = isPhone ? 'Buy a number' : 'Connect email';
    const settingsTab = isPhone ? 'phone' : 'email';

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Not now
            </button>
            <Link
                href={route('crm.settings.tab', settingsTab)}
                className="inline-flex items-center gap-1.5 h-8 px-5 text-[12px] font-medium text-white bg-[#1693C9] rounded hover:bg-[#1380AF] transition-colors"
            >
                {primaryLabel}
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
        </>
    );

    return (
        <SlideOverModal title={title} onClose={onClose} footer={footer}>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-start gap-3">
                    <div className="shrink-0 h-10 w-10 inline-flex items-center justify-center rounded-full bg-[#EBF5FF] text-[#1693C9]">
                        {isPhone ? (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                            </svg>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#111315] font-medium">{heading}</p>
                        <p className="text-[12px] text-[#5F656D] mt-1 leading-relaxed">{blurb}</p>
                    </div>
                </div>
            </div>
        </SlideOverModal>
    );
}
