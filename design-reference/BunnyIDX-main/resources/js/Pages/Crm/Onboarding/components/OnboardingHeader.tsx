import Logo from '@/Components/ui/Logo';

/** Fixed 64px white top bar: brand logo on the left, close (→ leave confirm) on the right. */
export default function OnboardingHeader({ onClose }: { onClose: () => void }) {
    return (
        <header className="h-16 shrink-0 bg-white border-b border-[#E4E7EB] flex items-center justify-between px-5 sm:px-8">
            <Logo variant="full" size="default" />
            <button
                type="button"
                onClick={onClose}
                aria-label="Close onboarding"
                className="h-9 w-9 flex items-center justify-center rounded-full text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315] transition-colors"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </header>
    );
}
