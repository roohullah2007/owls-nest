import { router } from '@inertiajs/react';
import { useState } from 'react';
import AddCustomFieldModal from '@/Components/Crm/AddCustomFieldModal';
import { titleCase as humanizeSlug } from '@/utils/text';

export type ModuleKey = 'contact' | 'deal' | 'listing';

export interface ModuleCustomField {
    key: string;
    label: string;
    type: string;
    section?: string;
    required?: boolean;
    searchable?: boolean;
    api?: boolean;
    quick_create?: boolean;
    unique?: boolean;
}

interface ModuleEntry {
    key: ModuleKey;
    label: string;
    icon: JSX.Element;
}

export interface ListingTaxonomy {
    types: string[];
    statuses: string[];
    default_types: string[];
    default_statuses: string[];
}

interface Props {
    module: ModuleKey;
    fields: ModuleCustomField[];
    modules: ModuleEntry[];
    onSwitchModule: (next: ModuleKey) => void;
    listingTaxonomy?: ListingTaxonomy;
}

const moduleLabels: Record<ModuleKey, string> = {
    contact: 'Contact',
    deal: 'Deal',
    listing: 'Listing',
};

function routeFor(module: ModuleKey, action: 'store' | 'update' | 'destroy', key?: string): string {
    const name = module === 'contact'
        ? `crm.contacts.custom-fields.${action}`
        : module === 'listing'
            ? `crm.listings.custom-fields.${action}`
            : `crm.deals.custom-fields.${action}`;
    return key ? route(name, key) : route(name);
}

const TypeIcon = ({ type }: { type: string }) => {
    const cls = 'h-4 w-4 text-[#111315]';
    switch (type) {
        case 'number':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75 6 19.5m6-15.75-1.5 15.75M3.75 9h15.75M3.375 15h15.75" />
                </svg>
            );
        case 'date':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
            );
        case 'email':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
            );
        case 'url':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
            );
        case 'select':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
                </svg>
            );
        case 'textarea':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
            );
        case 'checkbox':
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
            );
        case 'text':
        default:
            return (
                <svg className={cls} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
                </svg>
            );
    }
};

const FIELD_TYPES: { value: string; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Multi-line text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'select', label: 'Picklist' },
    { value: 'checkbox', label: 'Checkbox' },
];

function typeLabel(type: string) {
    return FIELD_TYPES.find((t) => t.value === type)?.label || type;
}

function TaxonomyEditor({ title, description, slug, items, defaults, storeRoute, destroyRoute }: {
    title: string;
    description: string;
    slug: 'type' | 'status';
    items: string[];
    defaults: string[];
    storeRoute: string;
    destroyRoute: string;
}) {
    const [value, setValue] = useState('');
    const [error, setError] = useState('');
    const defaultsSet = new Set(defaults);

    function add(e: React.FormEvent) {
        e.preventDefault();
        const raw = value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!raw) return;
        if (items.includes(raw)) {
            setError('Already exists.');
            return;
        }
        setError('');
        router.post(route(storeRoute), { [slug]: raw }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setValue(''),
            onError: (errs) => setError((errs[slug] as string) || 'Could not add.'),
        });
    }

    function destroy(item: string) {
        if (defaultsSet.has(item)) return;
        if (!confirm(`Remove "${humanizeSlug(item)}"? Existing properties using this ${slug} will keep it but it won't be selectable for new listings.`)) return;
        router.delete(route(destroyRoute, item), { preserveScroll: true, preserveState: true });
    }

    return (
        <div className="border border-[#E4E7EB] bg-white rounded-[4px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E7EB]">
                <h2 className="text-[13px] font-semibold text-[#111315]">{title}</h2>
                <p className="text-[11px] text-[#8B9096] mt-0.5">{description}</p>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
                {items.map((item) => {
                    const isDefault = defaultsSet.has(item);
                    return (
                        <span
                            key={item}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[4px] ${
                                isDefault ? 'bg-[#F3F4F6] text-[#5F656D]' : 'bg-[#EBF5FF] text-[#1693C9] border border-[#BFDBFE]'
                            }`}
                        >
                            {humanizeSlug(item)}
                            {!isDefault && (
                                <button
                                    type="button"
                                    onClick={() => destroy(item)}
                                    className="ml-0.5 text-[#1693C9]/70 hover:text-[#DC2626] transition-colors"
                                    title="Remove"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </span>
                    );
                })}
            </div>
            <form onSubmit={add} className="flex items-center gap-2 px-4 py-3 border-t border-[#E4E7EB] bg-[#FAFBFC]">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(''); }}
                    placeholder={`Add new ${slug}…`}
                    className="flex-1 h-8 px-2 text-[12px] border border-[#C8CCD1] rounded-[4px] bg-white focus:outline-none focus:border-[#1693C9]"
                />
                <button
                    type="submit"
                    disabled={!value.trim()}
                    className="h-8 px-3 text-[11px] font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-40 transition-colors"
                >
                    Add
                </button>
            </form>
            {error && <p className="px-4 pb-2 text-[11px] text-[#DC2626]">{error}</p>}
        </div>
    );
}

function ToggleCell({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-[18px] w-8 items-center rounded-full transition-colors ${value ? 'bg-[#1693C9]' : 'bg-[#E4E7EB]'}`}
        >
            <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
        </button>
    );
}

export default function ModulesTab({ module, fields, modules, onSwitchModule, listingTaxonomy }: Props) {
    const [showAdd, setShowAdd] = useState(false);

    function toggle(field: ModuleCustomField, flag: 'required' | 'searchable' | 'api' | 'quick_create' | 'unique') {
        const fallback = flag === 'api' || flag === 'quick_create';
        const next = !(field[flag] ?? fallback);
        router.patch(routeFor(module, 'update', field.key), { [flag]: next }, {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function destroy(field: ModuleCustomField) {
        if (!confirm(`Delete the "${field.label}" field? Existing data on this field will remain on records but will no longer appear in forms.`)) return;
        router.delete(routeFor(module, 'destroy', field.key), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    return (
        <div className="flex-1 flex items-stretch min-w-0">
            {/* Inner sub-sidebar */}
            <aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r border-[#E4E7EB] bg-[#F7F8FB] min-h-[calc(100vh-56px)]">
                <div className="h-[49px] flex items-center px-5 py-3 border-b border-[#E4E7EB]">
                    <span className="text-[16px] font-bold text-[#1f2530]">Custom Fields</span>
                </div>
                <nav className="py-2">
                    {modules.map((m) => {
                        const mActive = module === m.key;
                        return (
                            <button
                                key={m.key}
                                onClick={() => onSwitchModule(m.key)}
                                className={`group flex items-center gap-2.5 w-full h-9 px-5 text-[14px] transition-colors [&_svg]:h-4 [&_svg]:w-4 ${
                                    mActive
                                        ? 'text-[#1693C9] font-medium'
                                        : 'text-[#374151] hover:text-[#1693C9] font-normal'
                                }`}
                            >
                                <span className={`shrink-0 ${mActive ? 'text-[#1693C9]' : 'text-[#374151] group-hover:text-[#1693C9]'}`}>
                                    {m.icon}
                                </span>
                                <span className="flex-1 text-left truncate capitalize">{m.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Content area */}
            <div className="flex-1 overflow-auto p-5 sm:p-6 lg:p-8 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-[18px] font-semibold text-[#111315]">{moduleLabels[module]} Fields</h1>
                    <p className="text-[13px] text-[#5F656D] mt-0.5">
                        Customize fields shown on the {moduleLabels[module].toLowerCase()} form and across the app.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="h-9 px-4 bg-[#1693C9] text-white text-[13px] font-medium rounded-md hover:bg-[#1380AF] transition-colors inline-flex items-center gap-1.5"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New Field
                </button>
            </div>

            {showAdd && (
                <AddCustomFieldModal
                    moduleLabel={moduleLabels[module]}
                    submitUrl={routeFor(module, 'store')}
                    onClose={() => setShowAdd(false)}
                />
            )}

            {/* Listing-specific: Transaction types + statuses */}
            {module === 'listing' && listingTaxonomy && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TaxonomyEditor
                        title="Transaction types"
                        description="Used as the property's transaction type when listing a new property."
                        slug="type"
                        items={listingTaxonomy.types}
                        defaults={listingTaxonomy.default_types}
                        storeRoute="crm.listings.listing-types.store"
                        destroyRoute="crm.listings.listing-types.destroy"
                    />
                    <TaxonomyEditor
                        title="Property statuses"
                        description="Used as the listing's status (active, pending, sold, etc.)."
                        slug="status"
                        items={listingTaxonomy.statuses}
                        defaults={listingTaxonomy.default_statuses}
                        storeRoute="crm.listings.listing-statuses.store"
                        destroyRoute="crm.listings.listing-statuses.destroy"
                    />
                </div>
            )}

            {/* Table */}
            <div className="border border-[#E4E7EB] bg-white shadow-sm overflow-hidden">
                <table className="w-full text-[13px]">
                    <thead>
                        <tr className="bg-white border-b border-[#E4E7EB] text-left text-[11px] font-semibold tracking-wider text-[#5F656D]">
                            <th className="px-4 py-3 font-semibold">Field Name</th>
                            <th className="px-4 py-3 font-semibold">Type</th>
                            <th className="px-4 py-3 font-semibold">Section</th>
                            <th className="px-3 py-3 font-semibold text-center w-[90px]">Required</th>
                            <th className="px-3 py-3 font-semibold text-center w-[90px]">Searchable</th>
                            <th className="px-3 py-3 font-semibold text-center w-[100px]">Quick&nbsp;Create</th>
                            <th className="px-3 py-3 font-semibold text-center w-[80px]">Unique</th>
                            <th className="px-3 py-3 font-semibold text-center w-[70px]">API</th>
                            <th className="px-3 py-3 w-[50px]"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-10 text-center text-[#8B9096]">
                                    No custom fields yet. Click <span className="font-medium text-[#111315]">New Field</span> to add one.
                                </td>
                            </tr>
                        )}
                        {fields.map((f) => (
                            <tr key={f.key} className="border-t border-[#E4E7EB] hover:bg-[#F9FAFB]">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <TypeIcon type={f.type} />
                                        <div>
                                            <div className="text-[#111315] font-medium">{f.label}</div>
                                            <div className="text-[11px] text-[#8B9096] font-mono">{f.key}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-[#374151]">{typeLabel(f.type)}</td>
                                <td className="px-4 py-3 text-[#374151]">{f.section || 'General'}</td>
                                <td className="px-3 py-3 text-center">
                                    <ToggleCell value={f.required ?? false} onChange={() => toggle(f, 'required')} />
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <ToggleCell value={f.searchable ?? false} onChange={() => toggle(f, 'searchable')} />
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <ToggleCell value={f.quick_create ?? true} onChange={() => toggle(f, 'quick_create')} />
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <ToggleCell value={f.unique ?? false} onChange={() => toggle(f, 'unique')} />
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <ToggleCell value={f.api ?? true} onChange={() => toggle(f, 'api')} />
                                </td>
                                <td className="px-3 py-3 text-right">
                                    <button
                                        type="button"
                                        onClick={() => destroy(f)}
                                        className="text-[#8B9096] hover:text-[#DC2626]"
                                        title="Delete field"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
        </div>
    );
}
