/** Terminal screen shown while the server creates the site + generates AI copy. */
export default function BuildingStep() {
    return (
        <div className="w-full max-w-md mx-auto text-center">
            <div className="mx-auto mb-6 h-14 w-14 flex items-center justify-center">
                <svg className="h-10 w-10 animate-spin text-[#1693C9]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
            <h1 className="text-[24px] font-bold leading-[32px] text-[#18181A]">Building your website…</h1>
            <p className="mt-2 text-[14px] font-normal leading-[24px] text-[#18181A]">
                We’re writing your copy, setting up your pages and applying your choices. This takes a few seconds.
            </p>
        </div>
    );
}
