import AdminLayout from '@/Layouts/AdminLayout';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow, LogoSlot } from '@/Components/ui/DataTable';
import { router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

interface ComplianceRules {
    show_updated_at?: boolean;
    link_back_required?: boolean;
    fair_housing_required?: boolean;
    refresh_minutes?: number;
}

interface MlsProvider {
    id: number;
    slug: string;
    display_name: string;
    region: string | null;
    country: string;
    logo_url: string | null;
    data_source: 'bridge' | 'realtyna' | 'repliers' | 'paragon';
    data_source_config: Record<string, any> | null;
    has_idx_feed: boolean;
    has_vow_feed: boolean;
    monthly_fee_cents: number;
    visibility: 'draft' | 'visible';
    property_types: string[] | null;
    statuses: string[] | null;
    sort_order: number;
    disclaimer: string | null;
    attribution_template: string | null;
    compliance_logo_url: string | null;
    terms_url: string | null;
    compliance_rules: ComplianceRules | null;
    setup_notes_user: string | null;
}

interface Source {
    value: 'bridge' | 'realtyna' | 'repliers' | 'paragon';
    label: string;
}

interface Props {
    visible: MlsProvider[];
    draft: MlsProvider[];
    sources: Source[];
}

const blankProvider: Partial<MlsProvider> = {
    slug: '',
    display_name: '',
    region: '',
    country: 'US',
    logo_url: '',
    data_source: 'bridge',
    has_idx_feed: true,
    has_vow_feed: false,
    monthly_fee_cents: 0,
    visibility: 'draft',
    sort_order: 0,
    disclaimer: '',
    attribution_template: '',
    compliance_logo_url: '',
    terms_url: '',
    compliance_rules: { show_updated_at: false, link_back_required: false, fair_housing_required: false, refresh_minutes: 60 },
    setup_notes_user: '',
};

export default function MlsProvidersIndex({ visible, draft, sources }: Props) {
    const [editing, setEditing] = useState<MlsProvider | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    function toggleVisibility(p: MlsProvider) {
        router.post(route('admin.mls-providers.toggle-visibility', p.id), {}, { preserveScroll: true });
    }

    function destroy(p: MlsProvider) {
        if (!confirm(`Delete ${p.display_name}? This can't be undone (only allowed if no connections exist).`)) return;
        router.delete(route('admin.mls-providers.destroy', p.id), { preserveScroll: true });
    }

    return (
        <AdminLayout active="mls-providers" title="Admin · MLS Providers"
            header={
                <>
                    <h1 className="text-lg font-normal text-[#111315]">MLS Providers</h1>
                    <div className="flex-1" />
                    <button
                        onClick={() => setShowCreate(true)}
                        className="h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-lg hover:bg-[#1380AF] transition-colors"
                    >
                        Add MLS
                    </button>
                </>
            }
        >
            <section>
                <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Visible to users ({visible.length})</p>
                <ProviderTable providers={visible} sources={sources} onEdit={setEditing} onToggle={toggleVisibility} onDelete={destroy} emptyHint="No MLSes are visible to users yet. Flip an MLS below from draft → visible when it's ready." />
            </section>

            <section className="pt-6">
                <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider mb-2">Draft ({draft.length})</p>
                <ProviderTable providers={draft} sources={sources} onEdit={setEditing} onToggle={toggleVisibility} onDelete={destroy} emptyHint="No drafts." />
            </section>

            {showCreate && (
                <ProviderForm
                    mode="create"
                    sources={sources}
                    provider={blankProvider as MlsProvider}
                    onClose={() => setShowCreate(false)}
                />
            )}
            {editing && (
                <ProviderForm
                    mode="edit"
                    sources={sources}
                    provider={editing}
                    onClose={() => setEditing(null)}
                />
            )}
        </AdminLayout>
    );
}

function ProviderTable({ providers, sources, onEdit, onToggle, onDelete, emptyHint }: {
    providers: MlsProvider[];
    sources: Source[];
    onEdit: (p: MlsProvider) => void;
    onToggle: (p: MlsProvider) => void;
    onDelete: (p: MlsProvider) => void;
    emptyHint: string;
}) {
    if (providers.length === 0) {
        return (
            <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-8 text-center">
                <p className="text-xs text-[#8B9096]">{emptyHint}</p>
            </div>
        );
    }

    return (
        <DataTable>
            <DataTableHead>
                <DataTableHeadCell>MLS</DataTableHeadCell>
                <DataTableHeadCell>Region</DataTableHeadCell>
                <DataTableHeadCell>Data source</DataTableHeadCell>
                <DataTableHeadCell>Feeds</DataTableHeadCell>
                <DataTableHeadCell>Fee</DataTableHeadCell>
                <DataTableHeadCell align="right" last>Actions</DataTableHeadCell>
            </DataTableHead>
            <tbody>
                {providers.map((p) => (
                    <DataTableRow key={p.id}>
                        <DataTableCell>
                            <div className="flex items-center gap-3">
                                <LogoSlot src={p.logo_url} alt={p.display_name} />
                                <div>
                                    <p className="text-[13px] font-medium text-[#111315]">{p.display_name}</p>
                                    <p className="text-[10px] text-[#8B9096]">{p.slug}</p>
                                </div>
                            </div>
                        </DataTableCell>
                        <DataTableCell className="text-xs text-[#5F656D]">
                            {[p.region, p.country].filter(Boolean).join(' · ')}
                        </DataTableCell>
                        <DataTableCell>
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#F3F4F6] text-[#5F656D]">
                                {sources.find((s) => s.value === p.data_source)?.label || p.data_source}
                            </span>
                        </DataTableCell>
                        <DataTableCell>
                            <div className="flex items-center gap-1">
                                {p.has_idx_feed && <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#E6F0FF] text-[#1693C9]">IDX</span>}
                                {p.has_vow_feed && <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#FEF3C7] text-[#D97706]">VOW</span>}
                            </div>
                        </DataTableCell>
                        <DataTableCell className="text-xs text-[#111315]">
                            {p.monthly_fee_cents === 0 ? <span className="text-[#059669] font-medium">Free</span> : `$${(p.monthly_fee_cents / 100).toFixed(2)}/mo`}
                        </DataTableCell>
                        <DataTableCell align="right" last>
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => onToggle(p)}
                                        className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors ${
                                            p.visibility === 'visible'
                                                ? 'text-[#D97706] border border-[#FDE68A] hover:bg-[#FFFBEB]'
                                                : 'text-[#059669] border border-[#A7F3D0] hover:bg-[#ECFDF5]'
                                        }`}
                                    >
                                        {p.visibility === 'visible' ? 'Make draft' : 'Make visible'}
                                    </button>
                                    <button
                                        onClick={() => onEdit(p)}
                                        className="px-2.5 py-1 text-[10px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB] transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => onDelete(p)}
                                        className="px-2.5 py-1 text-[10px] font-medium text-[#DC2626] border border-[#FEE2E2] rounded-md hover:bg-[#FEF2F2] transition-colors"
                                    >
                                        Delete
                                    </button>
                            </div>
                        </DataTableCell>
                    </DataTableRow>
                ))}
            </tbody>
        </DataTable>
    );
}

function ProviderForm({ mode, provider, sources, onClose }: {
    mode: 'create' | 'edit';
    provider: MlsProvider;
    sources: Source[];
    onClose: () => void;
}) {
    const { data, setData, post, patch, processing, errors } = useForm({
        slug: provider.slug || '',
        display_name: provider.display_name || '',
        region: provider.region || '',
        country: provider.country || 'US',
        logo_url: provider.logo_url || '',
        data_source: provider.data_source || 'bridge',
        data_source_config: provider.data_source_config || { dataset_slug: provider.slug || '' },
        has_idx_feed: provider.has_idx_feed ?? true,
        has_vow_feed: provider.has_vow_feed ?? false,
        monthly_fee_dollars: ((provider.monthly_fee_cents || 0) / 100).toString(),
        visibility: provider.visibility || 'draft',
        sort_order: provider.sort_order || 0,
        disclaimer: provider.disclaimer || '',
        attribution_template: provider.attribution_template || '',
        compliance_logo_url: provider.compliance_logo_url || '',
        terms_url: provider.terms_url || '',
        compliance_rules: provider.compliance_rules || { show_updated_at: false, link_back_required: false, fair_housing_required: false, refresh_minutes: 60 },
        setup_notes_user: provider.setup_notes_user || '',
    });

    function setRule<K extends keyof ComplianceRules>(key: K, value: ComplianceRules[K]) {
        setData('compliance_rules', { ...data.compliance_rules, [key]: value });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const payload = { ...data, monthly_fee_cents: Math.round(parseFloat(data.monthly_fee_dollars || '0') * 100) };
        if (mode === 'create') {
            post(route('admin.mls-providers.store'), { onSuccess: onClose });
        } else {
            patch(route('admin.mls-providers.update', provider.id), { onSuccess: onClose });
        }
    }

    const inputClass = 'block w-full h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9]';
    const labelClass = 'block text-xs font-medium text-[#5F656D] mb-1.5';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-xl max-h-[84vh] bg-white shadow-xl border border-[#E4E7EB] rounded-xl flex flex-col">
                <div className="flex items-center justify-between px-5 h-12 border-b border-[#E4E7EB] shrink-0">
                    <h2 className="text-sm font-semibold text-[#111315]">{mode === 'create' ? 'Add MLS provider' : `Edit · ${provider.display_name}`}</h2>
                    <button onClick={onClose} className="text-[#8B9096] hover:text-[#111315]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={submit} className="flex-1 overflow-y-auto">
                    <div className="p-5 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Slug *</label>
                                <input type="text" value={data.slug} onChange={(e) => setData('slug', e.target.value)} placeholder="miamire" required className={inputClass} />
                                {errors.slug && <p className="mt-1 text-[11px] text-red-500">{errors.slug}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Display name *</label>
                                <input type="text" value={data.display_name} onChange={(e) => setData('display_name', e.target.value)} required className={inputClass} />
                                {errors.display_name && <p className="mt-1 text-[11px] text-red-500">{errors.display_name}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className={labelClass}>Region</label>
                                <input type="text" value={data.region} onChange={(e) => setData('region', e.target.value)} placeholder="FL" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Country *</label>
                                <select value={data.country} onChange={(e) => setData('country', e.target.value)} className={inputClass}>
                                    <option value="US">US</option>
                                    <option value="CA">CA</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Sort order</label>
                                <input type="number" value={data.sort_order} onChange={(e) => setData('sort_order', parseInt(e.target.value || '0', 10))} className={inputClass} />
                            </div>
                        </div>

                        <LogoUpload provider={mode === 'edit' ? provider : null} currentUrl={data.logo_url} onUploaded={(url) => setData('logo_url', url)} />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Data source *</label>
                                <select value={data.data_source} onChange={(e) => setData('data_source', e.target.value as any)} className={inputClass}>
                                    {sources.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Pass-through fee ($/mo)</label>
                                <input type="number" min="0" step="0.01" value={data.monthly_fee_dollars} onChange={(e) => setData('monthly_fee_dollars', e.target.value)} className={inputClass} />
                            </div>
                        </div>

                        {/* Data-source-specific config */}
                        {data.data_source === 'realtyna' && (
                            <div>
                                <label className={labelClass}>
                                    Realtyna OriginatingSystemName *
                                    <span className="text-[10px] text-[#8B9096] font-normal ml-1">(found in your Realtyna dashboard)</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.data_source_config?.originating_system_name || ''}
                                    onChange={(e) => setData('data_source_config', {
                                        ...(data.data_source_config || {}),
                                        originating_system_name: e.target.value,
                                    })}
                                    placeholder="e.g. NWMLS, Demo, MIAMIRE"
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">
                                    Realtyna proxies many MLSes through one account. This is the value we use to filter listings to this MLS via <code>$filter=OriginatingSystemName eq '…'</code>.
                                </p>
                            </div>
                        )}

                        {data.data_source === 'bridge' && (
                            <div>
                                <label className={labelClass}>Bridge dataset slug</label>
                                <input
                                    type="text"
                                    value={data.data_source_config?.dataset_slug || data.slug || ''}
                                    onChange={(e) => setData('data_source_config', {
                                        ...(data.data_source_config || {}),
                                        dataset_slug: e.target.value,
                                    })}
                                    placeholder="e.g. miamire, actris"
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">Defaults to the MLS slug. Override if Bridge's dataset key differs.</p>
                            </div>
                        )}

                        {data.data_source === 'paragon' && (
                            <div>
                                <label className={labelClass}>
                                    Paragon OData base URL *
                                    <span className="text-[10px] text-[#8B9096] font-normal ml-1">(service root)</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.data_source_config?.base_url || ''}
                                    onChange={(e) => setData('data_source_config', {
                                        ...(data.data_source_config || {}),
                                        base_url: e.target.value,
                                    })}
                                    placeholder="https://PrimeMLS.paragonrels.com/OData/PrimeMLS"
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">
                                    Each Paragon MLS has its own service root. We use it for the OAuth token endpoint (<code>/identity/connect/token</code>) and the RESO data resources (<code>/DD1.7/Property</code>). Must match the dataset class.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2 p-3 border border-[#E4E7EB] rounded-lg cursor-pointer">
                                <input type="checkbox" checked={data.has_idx_feed} onChange={(e) => setData('has_idx_feed', e.target.checked)} className="rounded text-[#1693C9]" />
                                <span className="text-xs font-medium text-[#111315]">IDX feed available</span>
                            </label>
                            <label className="flex items-center gap-2 p-3 border border-[#E4E7EB] rounded-lg cursor-pointer">
                                <input type="checkbox" checked={data.has_vow_feed} onChange={(e) => setData('has_vow_feed', e.target.checked)} className="rounded text-[#1693C9]" />
                                <span className="text-xs font-medium text-[#111315]">VOW feed available</span>
                            </label>
                        </div>

                        <div>
                            <label className={labelClass}>Visibility *</label>
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { v: 'draft', label: 'Draft', desc: 'Hidden from users while configuring' },
                                    { v: 'visible', label: 'Visible', desc: 'Users can request connection' },
                                ] as const).map((opt) => (
                                    <button type="button" key={opt.v} onClick={() => setData('visibility', opt.v as any)}
                                        className={`text-left p-3 rounded-lg border transition-colors ${data.visibility === opt.v ? 'border-[#1693C9] bg-[#EBF5FF]' : 'border-[#E4E7EB] hover:bg-[#F9FAFB]'}`}>
                                        <p className={`text-xs font-medium ${data.visibility === opt.v ? 'text-[#1693C9]' : 'text-[#111315]'}`}>{opt.label}</p>
                                        <p className="text-[10px] text-[#8B9096] mt-0.5">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ─── User setup notice ─── */}
                        <div>
                            <label className={labelClass}>Setup notice shown to user <span className="text-[#8B9096] font-normal">(when they request this MLS)</span></label>
                            <textarea
                                value={data.setup_notes_user}
                                onChange={(e) => setData('setup_notes_user', e.target.value)}
                                rows={3}
                                placeholder='e.g. "Your MLS requires a one-time membership verification. We handle the paperwork on your behalf — expect 1–3 business days for activation."'
                                className="block w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9] resize-none"
                            />
                            <p className="text-[10px] text-[#8B9096] mt-1">Surfaced on the request modal + pending request card. Use this for paperwork warnings, expected turnaround, prerequisites, etc.</p>
                        </div>

                        {/* ─── Compliance section ─── */}
                        <div className="pt-4 border-t border-[#E4E7EB] space-y-3">
                            <div>
                                <p className="text-[11px] font-semibold text-[#8B9096] tracking-wider">MLS Compliance</p>
                                <p className="text-[11px] text-[#5F656D] mt-0.5">Legal text + assets the MLS requires. Surfaced on every listing view in CRM, widgets, and websites.</p>
                            </div>

                            <div>
                                <label className={labelClass}>Disclaimer</label>
                                <textarea
                                    value={data.disclaimer}
                                    onChange={(e) => setData('disclaimer', e.target.value)}
                                    rows={4}
                                    placeholder='e.g. "Information is deemed reliable but not guaranteed. Copyright © 2026 Miami Association of REALTORS®."'
                                    className="block w-full px-3 py-2 text-[13px] border border-[#E4E7EB] rounded-lg bg-white text-[#111315] focus:outline-none focus:border-[#1693C9] focus:ring-1 focus:ring-[#1693C9] resize-none"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Per-listing attribution template</label>
                                <input
                                    type="text"
                                    value={data.attribution_template}
                                    onChange={(e) => setData('attribution_template', e.target.value)}
                                    placeholder="Listing courtesy of {agent} · {office}"
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">Placeholders: <code>{`{agent}`}</code>, <code>{`{office}`}</code>, <code>{`{updated_at}`}</code>, <code>{`{mls_name}`}</code></p>
                            </div>

                            {mode === 'edit' && (
                                <ComplianceLogoUpload provider={provider} currentUrl={data.compliance_logo_url} onUploaded={(url) => setData('compliance_logo_url', url)} />
                            )}

                            <div>
                                <label className={labelClass}>Terms-of-use URL</label>
                                <input
                                    type="url"
                                    value={data.terms_url}
                                    onChange={(e) => setData('terms_url', e.target.value)}
                                    placeholder="https://…"
                                    className={inputClass}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Required display rules</label>
                                {[
                                    { key: 'show_updated_at' as const, label: 'Show "Last updated" timestamp on every listing' },
                                    { key: 'link_back_required' as const, label: 'Must link back to MLS-of-record on each listing' },
                                    { key: 'fair_housing_required' as const, label: 'Display Fair Housing logo' },
                                ].map((r) => (
                                    <label key={r.key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!data.compliance_rules?.[r.key]}
                                            onChange={(e) => setRule(r.key, e.target.checked)}
                                            className="rounded text-[#1693C9]"
                                        />
                                        <span className="text-xs text-[#111315]">{r.label}</span>
                                    </label>
                                ))}
                            </div>

                            <div>
                                <label className={labelClass}>Max data freshness (minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1440"
                                    value={data.compliance_rules?.refresh_minutes ?? 60}
                                    onChange={(e) => setRule('refresh_minutes', parseInt(e.target.value || '60', 10))}
                                    className={inputClass}
                                />
                                <p className="text-[10px] text-[#8B9096] mt-1">Cached listings older than this trigger a refresh.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-[#E4E7EB] shrink-0">
                        <button type="button" onClick={onClose} className="h-8 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] rounded-lg">Cancel</button>
                        <button type="submit" disabled={processing} className="h-8 px-5 bg-[#1693C9] text-white text-xs font-semibold rounded-lg hover:bg-[#1380AF] disabled:opacity-50">
                            {processing ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ComplianceLogoUpload({ provider, currentUrl, onUploaded }: { provider: MlsProvider; currentUrl: string; onUploaded: (url: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentUrl || null);

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        setUploading(true);
        const form = new FormData();
        form.append('logo', file);
        router.post(route('admin.mls-providers.upload-compliance-logo', provider.id), form, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onUploaded(preview || ''),
            onError: () => alert('Upload failed.'),
            onFinish: () => setUploading(false),
        });
    }

    return (
        <div>
            <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Compliance logo <span className="text-[#8B9096] font-normal">(required by some MLSes)</span></label>
            <div className="flex items-center gap-3">
                <div className="h-14 w-20 rounded border border-[#E4E7EB] bg-[#FAFBFC] flex items-center justify-center overflow-hidden shrink-0">
                    {preview ? <img src={preview} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] text-[#C4C9D1]">none</span>}
                </div>
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={handleFile} />
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="h-8 px-3 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                    {uploading ? 'Uploading…' : (preview ? 'Replace' : 'Upload')}
                </button>
            </div>
        </div>
    );
}

function LogoUpload({ provider, currentUrl, onUploaded }: { provider: MlsProvider | null; currentUrl: string; onUploaded: (url: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentUrl || null);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreview(URL.createObjectURL(file));
        setUploading(true);

        const form = new FormData();
        form.append('logo', file);

        // EDIT mode → attach directly to the existing provider via Inertia.
        // CREATE mode → upload to the pending endpoint, get a URL, store it in
        //               the form state so it gets sent with the eventual create.
        if (provider) {
            router.post(route('admin.mls-providers.upload-logo', provider.id), form, {
                forceFormData: true,
                preserveScroll: true,
                onError: () => alert('Upload failed.'),
                onFinish: () => setUploading(false),
            });
        } else {
            try {
                const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
                const res = await fetch(route('admin.mls-providers.upload-pending-logo'), {
                    method: 'POST',
                    headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
                    body: form,
                });
                if (!res.ok) throw new Error('Upload failed');
                const data = await res.json();
                onUploaded(data.url);
                setPreview(data.url);
            } catch {
                alert('Upload failed.');
                setPreview(currentUrl || null);
            } finally {
                setUploading(false);
            }
        }
    }

    return (
        <div>
            <label className="block text-xs font-medium text-[#5F656D] mb-1.5">Logo</label>
            <div className="flex items-center gap-3">
                <div className="h-14 w-20 rounded border border-[#E4E7EB] bg-[#FAFBFC] flex items-center justify-center overflow-hidden shrink-0">
                    {preview ? (
                        <img src={preview} alt="logo preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                        <svg className="h-6 w-6 text-[#C4C9D1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 19.5h18M3 19.5V4.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 4.5v15" />
                        </svg>
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={handleFile} />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="h-8 px-3 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB] disabled:opacity-50"
                    >
                        {uploading ? 'Uploading…' : (preview ? 'Replace logo' : 'Choose file')}
                    </button>
                    <p className="text-[10px] text-[#8B9096]">PNG, JPG, SVG, or WebP. Max 1MB.</p>
                </div>
            </div>
        </div>
    );
}
