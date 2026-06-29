import CrmLayout from '@/Layouts/CrmLayout';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import SearchInput from '@/Components/Crm/SearchInput';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Company {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    contacts_count: number;
}

interface Props {
    companies: {
        data: Company[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: { search?: string };
}

export default function CompaniesIndex({ companies, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get(route('crm.companies.index'), { search }, { preserveState: true });
    }

    return (
        <CrmLayout
            header={
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-[#111315]">Companies</h1>
                    <PrimaryButton href={route('crm.companies.create')} label="Add Company" />
                </div>
            }
        >
            <Head title="Companies" />

            <div className="mb-4">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    onSubmit={handleSearch}
                    placeholder="Search companies..."
                    width="w-full sm:max-w-xs"
                />
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">City</th>
                            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contacts</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {companies.data.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                                    No companies found.{' '}
                                    <Link href={route('crm.companies.create')} className="text-indigo-600 hover:text-indigo-500">Add your first company</Link>
                                </td>
                            </tr>
                        ) : (
                            companies.data.map((company) => (
                                <tr key={company.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <Link href={route('crm.companies.show', company.id)} className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                                            {company.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{company.email || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{company.phone || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{company.city || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{company.contacts_count}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CrmLayout>
    );
}
