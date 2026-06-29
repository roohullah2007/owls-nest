import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { License } from '../Index';

const labelClass = 'block text-[12px] font-medium text-[#374151] mb-1.5';

function copyText(text: string) {
    navigator.clipboard.writeText(text);
}

interface Props {
    licenses: License[];
}

export default function LicensesTab({ licenses }: Props) {
    const [activateLicenseId, setActivateLicenseId] = useState<number | null>(null);
    const domainForm = useForm({ domain: '' });

    function activateLicense(licenseId: number) {
        domainForm.post(route('crm.idx.licenses.activate', licenseId), {
            preserveScroll: true,
            onSuccess: () => {
                domainForm.reset();
                setActivateLicenseId(null);
            },
        });
    }

    function deactivateLicense(licenseId: number) {
        if (confirm('Deactivate this license from its current domain?')) {
            router.post(route('crm.idx.licenses.deactivate', licenseId), {}, { preserveScroll: true });
        }
    }

    return (
        <div className="max-w-4xl">
            {licenses.length === 0 ? (
                <div className="bg-white border border-[#E4E7EB] rounded-xl px-6 py-12 text-center">
                    <svg className="h-10 w-10 mx-auto text-[#D1D5DB] mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                    </svg>
                    <p className="text-sm font-medium text-[#5F656D] mb-1">No IDX licenses</p>
                    <p className="text-xs text-[#8B9096] mb-1">A license is required to use the WordPress plugin and embed snippets</p>
                    <p className="text-xs text-[#8B9096] mb-4">One license = one domain. $299 one-time purchase.</p>
                    <button onClick={() => router.post(route('crm.idx.licenses.purchase'))} className="h-9 px-6 bg-[#111315] text-white text-xs font-medium rounded-lg hover:bg-[#2a2d30] transition-colors">
                        Purchase License — $299
                    </button>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-[#E4E7EB] rounded-xl divide-y divide-[#E4E7EB]">
                        {licenses.map((lic) => (
                            <div key={lic.id} className="px-4 py-4 sm:px-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <code className="text-sm font-mono font-medium text-[#111315]">{lic.key}</code>
                                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                                lic.status === 'active' ? 'bg-[#DCFCE7] text-[#166534]' :
                                                lic.status === 'suspended' ? 'bg-[#FEF3C7] text-[#92400E]' :
                                                'bg-[#FEE2E2] text-[#991B1B]'
                                            }`}>
                                                {lic.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[#8B9096]">
                                            <span>Purchased {new Date(lic.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            <span>via {lic.purchase_source}</span>
                                        </div>
                                        {lic.active_domain ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] shrink-0" />
                                                <span className="text-xs font-medium text-[#111315]">{lic.active_domain.domain}</span>
                                                <button onClick={() => deactivateLicense(lic.id)} className="text-[11px] text-[#8B9096] hover:text-[#EF4444] transition-colors">
                                                    Deactivate
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-2">
                                                {activateLicenseId === lic.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={domainForm.data.domain}
                                                            onChange={(e) => domainForm.setData('domain', e.target.value)}
                                                            placeholder="yourdomain.com"
                                                            className="h-8 px-3 text-xs border border-[#E4E7EB] rounded-full bg-white text-[#111315] placeholder-[#C4C9D1] focus:outline-none focus:border-[#111315] focus:ring-0 w-48"
                                                        />
                                                        <button
                                                            onClick={() => activateLicense(lic.id)}
                                                            disabled={!domainForm.data.domain || domainForm.processing}
                                                            className="h-8 px-3 bg-[#111315] text-white text-[11px] font-medium rounded-lg hover:bg-[#2a2d30] disabled:opacity-30 transition-colors"
                                                        >
                                                            Activate
                                                        </button>
                                                        <button onClick={() => setActivateLicenseId(null)} className="text-[11px] text-[#8B9096] hover:text-[#111315]">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setActivateLicenseId(lic.id)} className="text-xs font-medium text-[#1693C9] hover:underline">
                                                        Activate on a domain
                                                    </button>
                                                )}
                                                {domainForm.errors.domain && <p className="text-[11px] text-red-500 mt-1">{domainForm.errors.domain}</p>}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => copyText(lic.key)} className="shrink-0 h-7 px-2.5 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-full hover:bg-[#F3F4F6] transition-colors">
                                        Copy Key
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <button onClick={() => router.post(route('crm.idx.licenses.purchase'))} className="h-9 px-6 bg-[#111315] text-white text-xs font-medium rounded-lg hover:bg-[#2a2d30] transition-colors">
                            Purchase Another License — $299
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
