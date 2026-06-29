import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, useForm } from '@inertiajs/react';

interface Props {
    companies: { id: number; name: string }[];
    tags: { id: number; name: string; color: string }[];
    leadTypes: string[];
    contactStatuses: string[];
    customFields: { key: string; label: string; type: 'text' | 'number' | 'date' | 'select' }[];
}

function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ContactCreate({ companies, tags, leadTypes, contactStatuses, customFields }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile: '',
        type: leadTypes?.[0] || 'buyer',
        status: 'new_lead',
        source: 'manual',
        company_id: '',
        address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        description: '',
        custom_fields: {} as Record<string, string>,
        tags: [] as number[],
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('crm.contacts.store'));
    }

    function setCustomField(key: string, value: string) {
        setData('custom_fields', { ...data.custom_fields, [key]: value });
    }

    const inputClass = 'block w-full h-9 px-3 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] placeholder-[#C4C9D1] rounded-[4px] focus:outline-none focus:border-[#111315] focus:ring-0';
    const labelClass = 'block text-xs font-medium text-[#5F656D] mb-1.5';

    return (
        <CrmLayout>
            <Head title="Add Contact" />

            <div className="bg-white border-b border-[#E4E7EB]">
                <div className="flex items-center h-12 px-5">
                    <Link href={route('crm.contacts.index')} className="text-[#8B9096] hover:text-[#111315] transition-colors mr-3">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <h1 className="text-sm font-semibold text-[#111315]">New Contact</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto py-8 px-4">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>First Name *</label>
                            <input type="text" value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} className={inputClass} placeholder="John" required autoFocus />
                            {errors.first_name && <p className="mt-1 text-[11px] text-red-500">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Last Name *</label>
                            <input type="text" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} className={inputClass} placeholder="Doe" required />
                            {errors.last_name && <p className="mt-1 text-[11px] text-red-500">{errors.last_name}</p>}
                        </div>
                    </div>

                    {/* Contact info */}
                    <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={inputClass} placeholder="john@example.com" />
                        {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Phone</label>
                            <input type="text" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className={inputClass} placeholder="(555) 123-4567" />
                        </div>
                        <div>
                            <label className={labelClass}>Mobile</label>
                            <input type="text" value={data.mobile} onChange={(e) => setData('mobile', e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    {/* Type, Status & Source */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>Type *</label>
                            <select value={data.type} onChange={(e) => setData('type', e.target.value)} className={inputClass}>
                                {(leadTypes || []).map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={inputClass}>
                                {(contactStatuses || []).map((s) => <option key={s} value={s}>{capitalize(s)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Source *</label>
                            <select value={data.source} onChange={(e) => setData('source', e.target.value)} className={inputClass}>
                                <option value="manual">Manual</option>
                                <option value="website">Website</option>
                                <option value="referral">Referral</option>
                                <option value="open_house">Open House</option>
                                <option value="social_media">Social Media</option>
                                <option value="cold_call">Cold Call</option>
                                <option value="idx">IDX</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Company */}
                    {companies.length > 0 && (
                        <div>
                            <label className={labelClass}>Company</label>
                            <select value={data.company_id} onChange={(e) => setData('company_id', e.target.value)} className={inputClass}>
                                <option value="">None</option>
                                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Address */}
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

                    {/* Custom fields */}
                    {customFields && customFields.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {customFields.map((cf) => (
                                <div key={cf.key}>
                                    <label className={labelClass}>{cf.label}</label>
                                    <input
                                        type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text'}
                                        value={data.custom_fields[cf.key] || ''}
                                        onChange={(e) => setCustomField(cf.key, e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div>
                            <label className={labelClass}>Tags</label>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => setData('tags', data.tags.includes(tag.id) ? data.tags.filter((id) => id !== tag.id) : [...data.tags, tag.id])}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full transition-all ${data.tags.includes(tag.id) ? 'text-white shadow-sm' : 'hover:opacity-100'}`}
                                        style={data.tags.includes(tag.id) ? { backgroundColor: tag.color, color: '#fff' } : { backgroundColor: tag.color + '15', color: tag.color }}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: data.tags.includes(tag.id) ? 'rgba(255,255,255,0.5)' : tag.color }} />
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} className="block w-full px-3 py-2 text-[13px] border border-[#ECEEF1] bg-white text-[#111315] placeholder-[#C4C9D1] rounded-[4px] focus:outline-none focus:border-[#111315] focus:ring-0 resize-none" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E4E7EB]">
                        <Link href={route('crm.contacts.index')} className="h-9 px-4 flex items-center text-xs font-medium text-[#5F656D] hover:text-[#111315] rounded-[4px] transition-colors">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="h-9 px-6 bg-[#1693C9] text-white text-xs font-medium rounded-[4px] hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                        >
                            {processing ? 'Saving...' : 'Save Contact'}
                        </button>
                    </div>
                </form>
            </div>
        </CrmLayout>
    );
}
