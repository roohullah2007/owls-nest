import { useState } from 'react';
import { StepProps } from '../types';
import StepShell from '../components/StepShell';

/**
 * Step 5 (conditional — skipped when the user already has an MLS feed) —
 * "Will you integrate your MLS?" Picking one files a connection request on submit;
 * the admin reviews it from the MLS Requests queue.
 */
export default function MlsStep({ data, set, page }: StepProps) {
    const [search, setSearch] = useState('');
    const providers = page.mlsProviders.filter((p) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || (p.region || '').toLowerCase().includes(q);
    });

    return (
        <StepShell
            title="Want to show MLS listings on your website?"
            subtitle="Pick the MLS you belong to and we’ll power live property search, featured listings and home valuations from it — plus suggest the communities it covers in the next step. Search and select yours below, or skip and add it later."
            maxWidth="max-w-2xl"
        >
            {page.mlsProviders.length > 6 && (
                <div className="mb-4">
                    <input
                        type="text"
                        data-enter-self
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or region…"
                        className="block w-full h-10 px-3 text-[13px] border border-[#C8CCD1] rounded-lg text-[#111315] bg-white placeholder-[#C4C9D1] focus:outline-none focus:border-[#1693C9]"
                    />
                </div>
            )}

            {providers.length === 0 ? (
                <p className="text-[13px] text-[#8B9096] py-8 text-center">No matching MLS found. You can integrate one later from the IDX page.</p>
            ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {providers.map((p) => {
                        const selected = data.mls_provider_id === p.id;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => set('mls_provider_id', selected ? null : p.id)}
                                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                    selected ? 'border-[#1693C9] bg-[#F0F9FE] ring-1 ring-[#1693C9]' : 'border-[#E4E7EB] bg-white hover:border-[#1693C9]/50'
                                }`}
                            >
                                <span className="h-11 w-11 shrink-0 rounded-lg border border-[#E4E7EB] bg-white flex items-center justify-center overflow-hidden">
                                    {p.logo ? (
                                        <img src={p.logo} alt={p.name} className="h-full w-full object-contain p-1" />
                                    ) : (
                                        <span className="text-[14px] font-semibold text-[#8B9096]">{p.name.charAt(0)}</span>
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-semibold text-[#111315] truncate">{p.name}</span>
                                    <span className="block text-[11px] text-[#8B9096] truncate">
                                        {[p.region, p.monthly_fee].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                {selected && (
                                    <svg className="h-5 w-5 shrink-0 text-[#1693C9]" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.42.006l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.79 2.79 6.796-6.886a1 1 0 0 1 1.414-.006Z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </StepShell>
    );
}
