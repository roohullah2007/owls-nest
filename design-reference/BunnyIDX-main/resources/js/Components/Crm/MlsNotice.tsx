import { Link } from '@inertiajs/react';

/**
 * Amber "No MLS connected" notice with a link to Settings → MLS Connections.
 * Used wherever a screen needs live MLS data but the user has no integrated
 * feed yet (MLS Listings tab, community editor, …).
 */
export default function MlsNotice({ description }: { description?: string }) {
    return (
        <div className="rounded-xl border border-[#FCD9A8] bg-[#FFF8EE] p-4 flex items-start gap-3">
            <svg className="h-5 w-5 shrink-0 text-[#B45309] mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#92400E]">No MLS connected</p>
                <p className="mt-0.5 text-[12px] leading-[18px] text-[#A16207]">
                    {description ?? 'Connect an MLS to search live listings and pull market data into your CRM.'}
                </p>
                <Link href={route('crm.settings.tab', 'mls')} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#B45309] hover:text-[#92400E]">
                    Integrate your MLS
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                </Link>
            </div>
        </div>
    );
}
