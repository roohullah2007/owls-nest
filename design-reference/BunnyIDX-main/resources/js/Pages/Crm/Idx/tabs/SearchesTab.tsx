import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { IdxConnection, IdxSearch, IdxSearchData } from '../Index';
import SearchForm from '../components/SearchForm';
import SearchCard from '../components/SearchCard';

interface Props {
    searches: IdxSearch[];
    connections: IdxConnection[];
    showAddSearch: boolean;
    setShowAddSearch: (v: boolean) => void;
}

const defaultSearchData: IdxSearchData = {
    name: '',
    mls_slug: '',
    filters: {},
    sort_by: 'modification_ts',
    sort_dir: 'desc',
    per_page: 20,
};

export default function SearchesTab({ searches, connections, showAddSearch, setShowAddSearch }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const form = useForm<IdxSearchData>({ ...defaultSearchData });

    function setFilterData(key: string, value: any) {
        const filters = { ...form.data.filters };
        if (value === null || value === '' || value === undefined) {
            delete filters[key];
        } else {
            filters[key] = value;
        }
        form.setData('filters', filters);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editingId) {
            form.patch(route('crm.idx.searches.update', editingId), {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    setEditingId(null);
                },
            });
        } else {
            form.post(route('crm.idx.searches.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    form.reset();
                    setShowAddSearch(false);
                },
            });
        }
    }

    function startEdit(search: IdxSearch) {
        setEditingId(search.id);
        setShowAddSearch(false);
        form.setData({
            name: search.name,
            mls_slug: search.mls_slug,
            filters: search.filters || {},
            sort_by: search.sort_by || 'modification_ts',
            sort_dir: search.sort_dir || 'desc',
            per_page: search.per_page || 20,
        });
    }

    function cancelForm() {
        form.reset();
        setEditingId(null);
        setShowAddSearch(false);
    }

    function duplicateSearch(search: IdxSearch) {
        const data = {
            name: `${search.name} (copy)`,
            mls_slug: search.mls_slug,
            filters: search.filters,
            sort_by: search.sort_by,
            sort_dir: search.sort_dir,
            per_page: search.per_page,
        };
        router.post(route('crm.idx.searches.store'), data, { preserveScroll: true });
    }

    const isFormOpen = showAddSearch || editingId;

    return (
        <div className="max-w-4xl">
            {/* Toolbar */}
            {!isFormOpen && searches.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[12px] text-[#8B9096]">
                        {searches.length} saved search{searches.length !== 1 ? 'es' : ''}
                    </p>
                    {connections.length > 0 && (
                        <button
                            onClick={() => setShowAddSearch(true)}
                            className="h-8 px-4 bg-[#111315] text-white text-[12px] font-medium rounded-lg hover:bg-[#2a2d30] transition-colors inline-flex items-center gap-1.5"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            New Search
                        </button>
                    )}
                </div>
            )}

            {/* Form */}
            {isFormOpen && (
                <SearchForm
                    data={form.data}
                    setData={(key, value) => form.setData(key as keyof IdxSearchData, value)}
                    setFilterData={setFilterData}
                    connections={connections}
                    errors={form.errors}
                    processing={form.processing}
                    onSubmit={handleSubmit}
                    onCancel={cancelForm}
                    isEdit={!!editingId}
                />
            )}

            {/* Empty State */}
            {searches.length === 0 && !isFormOpen && (
                <div className="bg-white border border-[#E4E7EB] rounded-xl px-6 py-14 text-center">
                    <div className="h-12 w-12 mx-auto rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    <p className="text-[13px] font-semibold text-[#111315] mb-1">No saved searches</p>
                    <p className="text-[12px] text-[#8B9096] mb-5 max-w-sm mx-auto">
                        Create reusable search filters to power your IDX widgets and embed them on your website.
                    </p>
                    {connections.length > 0 ? (
                        <button
                            onClick={() => setShowAddSearch(true)}
                            className="h-9 px-6 bg-[#111315] text-white text-[13px] font-medium rounded-lg hover:bg-[#2a2d30] transition-colors inline-flex items-center gap-1.5"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Create Search
                        </button>
                    ) : (
                        <p className="text-[12px] text-[#8B9096]">Connect an MLS first to create searches</p>
                    )}
                </div>
            )}

            {/* Search List */}
            {searches.length > 0 && (
                <div className="border border-[#E4E7EB] rounded-xl bg-white overflow-hidden">
                    {searches.map((search) => (
                        <SearchCard key={search.id} search={search} onEdit={startEdit} onDuplicate={duplicateSearch} />
                    ))}
                </div>
            )}
        </div>
    );
}
