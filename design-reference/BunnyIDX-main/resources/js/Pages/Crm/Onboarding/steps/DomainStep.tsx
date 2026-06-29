import { StepProps } from '../types';
import StepShell from '../components/StepShell';

/**
 * Step 1 — bring-your-own domain. We don't sell domains yet, so this just records
 * the host the agent intends to point at the site. "Use temporary domain" (the
 * footer skip link) leaves it blank and the site stays on its /site/{slug} URL.
 */
export default function DomainStep({ data, set, errors }: StepProps) {
    const value = data.custom_domain;

    return (
        <StepShell
            title="What domain would you like to use?"
            subtitle="Bring a domain you already own — enter it below and you’ll point it at your site later. Don’t have one yet? Use a temporary address and add a custom domain anytime."
        >
            <div className="rounded-xl border border-[#E4E7EB] bg-white p-2 shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)]">
                <div className="flex items-center gap-2.5 rounded-lg border border-[#E4E7EB] px-3 focus-within:border-[#1693C9] focus-within:ring-1 focus-within:ring-[#1693C9] transition-all">
                    <svg className="h-5 w-5 shrink-0 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    <input
                        type="text"
                        autoFocus
                        value={value}
                        onChange={(e) => set('custom_domain', e.target.value)}
                        placeholder="yourdomain.com"
                        className="h-11 w-full border-0 bg-transparent p-0 text-[14px] text-[#111315] placeholder:text-[#8B9096] focus:outline-none focus:ring-0"
                    />
                </div>

                {value.trim() !== '' && (
                    <div className="mt-2 px-1">
                        <div className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-[#F3F4F6]">
                            <p className="text-[14px] text-[#111315]">{value.trim().toLowerCase()}</p>
                            <span className="text-[12px] font-bold text-[#16A34A]">Your domain</span>
                        </div>
                    </div>
                )}
            </div>

            {errors.custom_domain && <p className="mt-2 text-[12px] text-red-500">{errors.custom_domain}</p>}
        </StepShell>
    );
}
