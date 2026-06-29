import { useState, useEffect } from 'react';

interface Brand {
    id: number;
    company_name: string;
    entity_type: string;
    vertical: string;
    website: string | null;
    status: 'pending' | 'verified' | 'failed' | 'rejected';
    rejection_reasons: string[] | null;
}

interface Campaign {
    id: number;
    use_case: string;
    description: string;
    status: 'pending' | 'active' | 'failed' | 'rejected';
    rejection_reasons: string[] | null;
}

type Step = 'brand' | 'campaign' | 'status';

const entityTypes = [
    { value: 'PRIVATE_PROFIT', label: 'Private Company' },
    { value: 'PUBLIC_PROFIT', label: 'Public Company' },
    { value: 'NON_PROFIT', label: 'Non-Profit' },
    { value: 'SOLE_PROPRIETOR', label: 'Sole Proprietor' },
    { value: 'GOVERNMENT', label: 'Government' },
];

const useCases = [
    { value: 'MIXED', label: 'Mixed (General)' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'CUSTOMER_CARE', label: 'Customer Care' },
    { value: 'ACCOUNT_NOTIFICATION', label: 'Account Notifications' },
];

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; text: string }> = {
        pending: { bg: '#FEF3C7', text: '#D97706' },
        verified: { bg: '#F0FDF4', text: '#16A34A' },
        active: { bg: '#F0FDF4', text: '#16A34A' },
        failed: { bg: '#FEF2F2', text: '#DC2626' },
        rejected: { bg: '#FEF2F2', text: '#DC2626' },
    };
    const c = colors[status] || colors.pending;
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: c.bg, color: c.text }}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export default function TenDlcTab() {
    const [step, setStep] = useState<Step>('brand');
    const [brand, setBrand] = useState<Brand | null>(null);
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Brand form
    const [companyName, setCompanyName] = useState('');
    const [ein, setEin] = useState('');
    const [entityType, setEntityType] = useState('PRIVATE_PROFIT');
    const [vertical, setVertical] = useState('REAL_ESTATE');
    const [website, setWebsite] = useState('');

    // Campaign form
    const [useCase, setUseCase] = useState('MIXED');
    const [description, setDescription] = useState('Communication with real estate leads and clients regarding property inquiries, showing schedules, and transaction updates.');
    const [sampleMessage1, setSampleMessage1] = useState('');
    const [sampleMessage2, setSampleMessage2] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const csrf = () => document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    const checkStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(route('crm.10dlc.status'));
            const data = await res.json();
            if (data.brand) {
                setBrand(data.brand);
                setStep(data.campaign ? 'status' : 'campaign');
            }
            if (data.campaign) {
                setCampaign(data.campaign);
                setStep('status');
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const submitBrand = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(route('crm.10dlc.brand.store'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({ company_name: companyName, ein: ein || null, entity_type: entityType, vertical, website: website || null }),
            });
            const data = await res.json();
            if (data.brand) {
                setBrand(data.brand);
                setStep('campaign');
            } else {
                alert('Failed to submit brand registration.');
            }
        } catch {
            alert('Failed to submit brand registration.');
        } finally {
            setSubmitting(false);
        }
    };

    const submitCampaign = async () => {
        if (!brand) return;
        setSubmitting(true);
        try {
            const res = await fetch(route('crm.10dlc.campaign.store'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf() },
                body: JSON.stringify({
                    telnyx_brand_id: brand.id,
                    use_case: useCase,
                    description,
                    sample_message_1: sampleMessage1,
                    sample_message_2: sampleMessage2 || null,
                }),
            });
            const data = await res.json();
            if (data.campaign) {
                setCampaign(data.campaign);
                setStep('status');
            } else {
                alert('Failed to submit campaign.');
            }
        } catch {
            alert('Failed to submit campaign.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-xl mx-auto text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-[#E4E7EB] border-t-[#1693C9] rounded-full animate-spin" />
                <p className="mt-2 text-xs text-[#8B9096]">Loading 10DLC status...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
                {(['brand', 'campaign', 'status'] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            step === s ? 'bg-[#1693C9] text-white' :
                            (s === 'brand' && brand) || (s === 'campaign' && campaign) ? 'bg-[#059669] text-white' :
                            'bg-[#F3F4F6] text-[#8B9096]'
                        }`}>
                            {(s === 'brand' && brand) || (s === 'campaign' && campaign) ? '✓' : i + 1}
                        </div>
                        <span className={`text-xs font-medium ${step === s ? 'text-[#111315]' : 'text-[#8B9096]'}`}>
                            {s === 'brand' ? 'Brand' : s === 'campaign' ? 'Campaign' : 'Status'}
                        </span>
                        {i < 2 && <div className="w-8 h-px bg-[#E4E7EB]" />}
                    </div>
                ))}
            </div>

            {/* Step 1: Brand */}
            {step === 'brand' && (
                <div className="bg-white border border-[#E4E7EB] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#111315] mb-1">Register Your Brand</h3>
                    <p className="text-xs text-[#5F656D] mb-4">10DLC registration is required by carriers for A2P SMS. Register your business to start sending messages.</p>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Company Name *</label>
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">EIN (Tax ID)</label>
                            <input type="text" value={ein} onChange={(e) => setEin(e.target.value)} placeholder="XX-XXXXXXX" className="w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Entity Type *</label>
                            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]">
                                {entityTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Industry Vertical *</label>
                            <input type="text" value={vertical} onChange={(e) => setVertical(e.target.value)} className="w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Website</label>
                            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                        </div>
                    </div>

                    <button onClick={submitBrand} disabled={submitting || !companyName} className="mt-4 h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors">
                        {submitting ? 'Submitting...' : 'Register Brand'}
                    </button>
                </div>
            )}

            {/* Step 2: Campaign */}
            {step === 'campaign' && brand && (
                <div className="bg-white border border-[#E4E7EB] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[#111315] mb-1">Create Campaign</h3>
                    <p className="text-xs text-[#5F656D] mb-4">Describe how you will use SMS messaging. This is reviewed by carriers.</p>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Use Case *</label>
                            <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-md focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]">
                                {useCases.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Description *</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Sample Message 1 *</label>
                            <textarea value={sampleMessage1} onChange={(e) => setSampleMessage1(e.target.value)} rows={2} placeholder="e.g. Hi {name}, I have a new listing at 123 Main St that matches your search criteria. Would you like to schedule a showing?" className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5F656D] mb-1">Sample Message 2</label>
                            <textarea value={sampleMessage2} onChange={(e) => setSampleMessage2(e.target.value)} rows={2} placeholder="Optional second sample" className="w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]" />
                        </div>
                    </div>

                    <button onClick={submitCampaign} disabled={submitting || !description || !sampleMessage1} className="mt-4 h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-md hover:bg-[#1380AF] disabled:opacity-50 transition-colors">
                        {submitting ? 'Submitting...' : 'Submit Campaign'}
                    </button>
                </div>
            )}

            {/* Step 3: Status */}
            {step === 'status' && (
                <div className="space-y-4">
                    {brand && (
                        <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-[#111315]">Brand Registration</h3>
                                <StatusBadge status={brand.status} />
                            </div>
                            <div className="text-xs text-[#5F656D] space-y-1">
                                <p><span className="font-medium text-[#5F656D]">Company:</span> {brand.company_name}</p>
                                <p><span className="font-medium text-[#5F656D]">Type:</span> {brand.entity_type}</p>
                                <p><span className="font-medium text-[#5F656D]">Vertical:</span> {brand.vertical}</p>
                            </div>
                            {brand.rejection_reasons && brand.rejection_reasons.length > 0 && (
                                <div className="mt-3 p-2 bg-[#FEF2F2] rounded-md">
                                    <p className="text-[11px] font-medium text-[#DC2626]">Rejection reasons:</p>
                                    {brand.rejection_reasons.map((r, i) => (
                                        <p key={i} className="text-[11px] text-[#DC2626]">- {r}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {campaign && (
                        <div className="bg-white border border-[#E4E7EB] rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-[#111315]">Campaign</h3>
                                <StatusBadge status={campaign.status} />
                            </div>
                            <div className="text-xs text-[#5F656D] space-y-1">
                                <p><span className="font-medium text-[#5F656D]">Use Case:</span> {campaign.use_case}</p>
                                <p><span className="font-medium text-[#5F656D]">Description:</span> {campaign.description}</p>
                            </div>
                            {campaign.rejection_reasons && campaign.rejection_reasons.length > 0 && (
                                <div className="mt-3 p-2 bg-[#FEF2F2] rounded-md">
                                    <p className="text-[11px] font-medium text-[#DC2626]">Rejection reasons:</p>
                                    {campaign.rejection_reasons.map((r, i) => (
                                        <p key={i} className="text-[11px] text-[#DC2626]">- {r}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button onClick={checkStatus} className="h-8 px-4 text-xs font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors">
                        Refresh Status
                    </button>
                </div>
            )}
        </div>
    );
}
