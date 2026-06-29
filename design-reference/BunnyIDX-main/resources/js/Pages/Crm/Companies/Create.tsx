import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function CompanyCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        notes: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('crm.companies.store'));
    }

    const inputClass = 'mt-1 block w-full h-9 px-3 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-0';
    const labelClass = 'block text-xs font-medium text-[#5F656D]';

    return (
        <CrmLayout>
            <Head title="Add Company" />

            <div className="bg-white border-b border-[#E4E7EB]">
                <div className="flex items-center h-12 px-5">
                    <Link href={route('crm.companies.index')} className="text-[#8B9096] hover:text-[#111315] transition-colors mr-3">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <h1 className="text-sm font-semibold text-[#111315]">New Company</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto py-8 px-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className={labelClass}>Company Name *</label>
                        <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} className={inputClass} required autoFocus />
                        {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Email</label>
                            <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Phone</label>
                            <input type="text" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Website</label>
                        <input type="url" value={data.website} onChange={(e) => setData('website', e.target.value)} placeholder="https://" className={inputClass} />
                    </div>

                    <div>
                        <label className={labelClass}>Address</label>
                        <input type="text" value={data.address} onChange={(e) => setData('address', e.target.value)} className={inputClass} />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>City</label>
                            <input type="text" value={data.city} onChange={(e) => setData('city', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>State</label>
                            <input type="text" value={data.state_province} onChange={(e) => setData('state_province', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Zip</label>
                            <input type="text" value={data.postal_code} onChange={(e) => setData('postal_code', e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Notes</label>
                        <textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] rounded-lg focus:outline-none focus:border-[#111315] focus:ring-0 resize-none" />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4E7EB]">
                        <Link href={route('crm.companies.index')} className="h-9 px-4 flex items-center text-xs font-medium text-[#5F656D] hover:text-[#111315] rounded-lg transition-colors">
                            Cancel
                        </Link>
                        <button type="submit" disabled={processing} className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                            {processing ? 'Saving...' : 'Save Company'}
                        </button>
                    </div>
                </form>
            </div>
        </CrmLayout>
    );
}
