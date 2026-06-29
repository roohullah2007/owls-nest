import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link } from '@inertiajs/react';

interface Props {
    company: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
        website: string | null;
        address: string | null;
        city: string | null;
        state_province: string | null;
        postal_code: string | null;
        notes: string | null;
        contacts: { id: number; uuid: string; first_name: string; last_name: string; email: string | null; type: string }[];
        deals: { id: number; title: string; stage: string; value: string }[];
    };
}

export default function CompanyShow({ company }: Props) {
    return (
        <CrmLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-x-3">
                        <Link href={route('crm.companies.index')} className="text-gray-400 hover:text-gray-600">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                            </svg>
                        </Link>
                        <h1 className="text-lg font-semibold text-gray-900">{company.name}</h1>
                    </div>
                    <Link href={route('crm.companies.edit', company.id)} className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50">
                        Edit
                    </Link>
                </div>
            }
        >
            <Head title={company.name} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Details</h3>
                    <dl className="space-y-3 text-sm">
                        {company.email && <div><dt className="text-gray-500">Email</dt><dd className="text-gray-900">{company.email}</dd></div>}
                        {company.phone && <div><dt className="text-gray-500">Phone</dt><dd className="text-gray-900">{company.phone}</dd></div>}
                        {company.website && <div><dt className="text-gray-500">Website</dt><dd><a href={company.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">{company.website}</a></dd></div>}
                        {company.city && <div><dt className="text-gray-500">Location</dt><dd className="text-gray-900">{[company.city, company.state_province].filter(Boolean).join(', ')}</dd></div>}
                    </dl>
                    {company.notes && <div className="mt-4 border-t border-gray-200 pt-4"><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{company.notes}</p></div>}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Contacts ({company.contacts.length})</h3>
                    {company.contacts.length === 0 ? (
                        <p className="text-sm text-gray-500">No contacts</p>
                    ) : (
                        <ul className="space-y-2">
                            {company.contacts.map((c) => (
                                <li key={c.id}>
                                    <Link href={route('crm.contacts.show', c.uuid)} className="flex items-center justify-between text-sm hover:bg-gray-50 -mx-2 px-2 py-1 rounded">
                                        <span className="text-indigo-600">{c.first_name} {c.last_name}</span>
                                        <span className="text-xs text-gray-400">{c.type}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-5">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Deals ({company.deals.length})</h3>
                    {company.deals.length === 0 ? (
                        <p className="text-sm text-gray-500">No deals</p>
                    ) : (
                        <ul className="space-y-2">
                            {company.deals.map((d) => (
                                <li key={d.id}>
                                    <Link href={route('crm.deals.show', d.id)} className="flex items-center justify-between text-sm hover:bg-gray-50 -mx-2 px-2 py-1 rounded">
                                        <span className="text-indigo-600">{d.title}</span>
                                        <span className="text-gray-500">${Number(d.value).toLocaleString()}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </CrmLayout>
    );
}
