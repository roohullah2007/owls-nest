import { useMemo, useState } from 'react';
import axios from 'axios';
import { inputClass, labelClass, sectionLabel } from '../../constants';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import RichTextField from '@/Components/Crm/RichTextField';
import MediaField from '../MediaField';
import { MlsTaxonomy } from '@/hooks/useMlsTaxonomy';
import TaxonomyMultiSelect from './TaxonomyMultiSelect';
import OptionToggleChips from './OptionToggleChips';
import MlsNotice from '@/Components/Crm/MlsNotice';
import TogglePagesSection from './TogglePagesSection';
import { AreaData, CommunityFilters, EMPTY_FILTERS, LifestyleDef, LifestylePageRow, PropertyPageRow, SubAreaRow, criteriaToForm, formToCriteria } from './types';

interface Props {
    websiteId: number;
    area: AreaData | null;
    mlsIntegrated: boolean;
    taxonomy: MlsTaxonomy & { loading: boolean };
    hotsheets: { id: number; name: string }[];
    lifestyles: LifestyleDef[];
    onSaved: () => void;
    onCancel: () => void;
    onDeleted: () => void;
}

/** Min/Max numeric input pair, kept tidy since the editor has many of them. */
function NumberField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <input type="number" value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder={placeholder} />
        </div>
    );
}

/** Plain text (legacy descriptions / AI output) → simple paragraph HTML. */
function textToHtml(text: string): string {
    if (!text || /<[a-z][\s\S]*>/i.test(text)) return text; // already HTML
    return text
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

const SCOPES = [
    { value: 'all', label: 'All MLS listings', desc: 'Every matching listing in the MLS.' },
    { value: 'office', label: "My office's listings only", desc: 'Restrict to your brokerage/office.' },
    { value: 'agent', label: 'My listings only', desc: 'Restrict to your own listings.' },
] as const;

export default function CommunityEditor({ websiteId, area, mlsIntegrated, taxonomy, hotsheets, lifestyles, onSaved, onCancel, onDeleted }: Props) {
    const initialFilters = area ? criteriaToForm(area.search_criteria) : { ...EMPTY_FILTERS };
    const [name, setName] = useState(area?.name || '');
    const [descriptionHeading, setDescriptionHeading] = useState(area?.description_heading || '');
    const [description, setDescription] = useState(textToHtml(area?.description || ''));
    const [image, setImage] = useState(area?.image || '');
    const [isActive, setIsActive] = useState(area?.is_active ?? true);
    const [filters, setFilters] = useState<CommunityFilters>(initialFilters);
    const [mode, setMode] = useState<'filters' | 'hotsheet'>(initialFilters.hotsheet_id ? 'hotsheet' : 'filters');
    const [lifestylePages, setLifestylePages] = useState<LifestylePageRow[]>(area?.lifestyle_pages || []);
    const [propertyPages, setPropertyPages] = useState<PropertyPageRow[]>(area?.property_pages || []);
    const [copyEditing, setCopyEditing] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiCopyKey, setAiCopyKey] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const set = <K extends keyof CommunityFilters>(key: K, value: CommunityFilters[K]) =>
        setFilters((prev) => ({ ...prev, [key]: value }));

    function switchMode(next: 'filters' | 'hotsheet') {
        setMode(next);
        if (next === 'filters') set('hotsheet_id', ''); // manual filters take over
    }

    function toggleLifestyle(key: string) {
        setLifestylePages((prev) => (prev.some((r) => r.key === key) ? prev.filter((r) => r.key !== key) : [...prev, { key }]));
        setCopyEditing((cur) => (cur === key ? null : cur));
    }

    function setLifestyleCopy(key: string, copy: string) {
        setLifestylePages((prev) => prev.map((r) => (r.key === key ? { ...r, copy } : r)));
    }

    // Property type / sub-type pages share the TogglePagesSection UI; their
    // rows are keyed `kind:value` (MLS enum verbatim) inside the editor.
    const propertyRowKey = (r: PropertyPageRow) => `${r.kind}:${r.value}`;
    const parsePropertyKey = (key: string): PropertyPageRow => {
        const i = key.indexOf(':');
        return { kind: key.slice(0, i) as PropertyPageRow['kind'], value: key.slice(i + 1) };
    };

    function togglePropertyPage(key: string) {
        setPropertyPages((prev) => (prev.some((r) => propertyRowKey(r) === key)
            ? prev.filter((r) => propertyRowKey(r) !== key)
            : [...prev, parsePropertyKey(key)]));
        setCopyEditing((cur) => (cur === key ? null : cur));
    }

    function setPropertyPageCopy(key: string, copy: string) {
        setPropertyPages((prev) => prev.map((r) => (propertyRowKey(r) === key ? { ...r, copy } : r)));
    }

    // Subtypes can repeat across parent types (gateway dedupes, but stay safe).
    const propertyTypeDefs = useMemo(
        () => taxonomy.propertyTypes.map((t) => ({ key: `property_type:${t.value}`, label: t.label })),
        [taxonomy.propertyTypes],
    );
    const propertySubtypeDefs = useMemo(() => {
        const seen = new Set<string>();
        return taxonomy.propertySubtypes
            .filter((t) => (seen.has(t.value) ? false : (seen.add(t.value), true)))
            .map((t) => ({ key: `property_subtype:${t.value}`, label: t.label }));
    }, [taxonomy.propertySubtypes]);

    // SEO sub-pages derive straight from the Location filters — every city,
    // neighborhood and ZIP picked above (all MLS-taxonomy values) becomes its
    // own indexed page. No separate editing UI.
    const derivedSubAreas = useMemo(() => {
        const out: SubAreaRow[] = [];
        filters.cities.forEach((c) => { const label = c.replace(/,\s*[A-Z]{2}$/, ''); out.push({ type: 'city', label, value: label }); });
        filters.neighborhoods.forEach((n) => out.push({ type: 'neighborhood', label: n, value: n }));
        filters.zips.forEach((z) => out.push({ type: 'zip', label: z, value: z }));
        return out;
    }, [filters.cities, filters.neighborhoods, filters.zips]);

    // Flatten the taxonomy neighborhoods map (keyed by area heading) into one list.
    const neighborhoodOptions = useMemo(
        () => Object.values(taxonomy.neighborhoods || {}).flat(),
        [taxonomy.neighborhoods],
    );

    async function writeWithAi() {
        if (!name.trim()) { setError('Add a community title first.'); return; }
        setAiLoading(true);
        setError(null);
        try {
            // Send the full community configuration so the AI grounds the SEO
            // copy in real data and weaves in the live merge variables.
            const location = [...filters.cities, ...filters.counties].join(', ');
            const { data } = await axios.post(`/api/website-editor/${websiteId}/areas/ai-description`, {
                name,
                location: location || null,
                current_value: description || null,
                criteria: {
                    cities: filters.cities,
                    counties: filters.counties,
                    neighborhoods: filters.neighborhoods,
                    zips: filters.zips,
                    property_types: filters.property_types,
                    min_price: filters.min_price || null,
                    max_price: filters.max_price || null,
                },
                lifestyle_keys: lifestylePages.map((r) => r.key),
                sub_area_labels: derivedSubAreas.map((r) => r.label),
            });
            if (data.value) setDescription(textToHtml(data.value));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Could not generate a description.');
        } finally {
            setAiLoading(false);
        }
    }

    /** "Write with AI" for one lifestyle page's intro copy. */
    async function writeLifestyleCopyWithAi(key: string) {
        if (!name.trim()) { setError('Add a community title first.'); return; }
        setAiCopyKey(key);
        setError(null);
        try {
            const row = lifestylePages.find((r) => r.key === key);
            const { data } = await axios.post(`/api/website-editor/${websiteId}/areas/ai-lifestyle-copy`, {
                name,
                lifestyle_key: key,
                current_value: row?.copy || null,
                criteria: {
                    cities: filters.cities,
                    counties: filters.counties,
                    neighborhoods: filters.neighborhoods,
                    zips: filters.zips,
                    min_price: filters.min_price || null,
                    max_price: filters.max_price || null,
                },
            });
            if (data.value) setLifestyleCopy(key, textToHtml(data.value));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Could not generate page copy.');
        } finally {
            setAiCopyKey(null);
        }
    }

    /** "Write with AI" for one property type / sub-type page's intro copy. */
    async function writePropertyCopyWithAi(key: string) {
        if (!name.trim()) { setError('Add a community title first.'); return; }
        setAiCopyKey(key);
        setError(null);
        try {
            const { kind, value } = parsePropertyKey(key);
            const def = (kind === 'property_type' ? propertyTypeDefs : propertySubtypeDefs).find((d) => d.key === key);
            const row = propertyPages.find((r) => propertyRowKey(r) === key);
            const { data } = await axios.post(`/api/website-editor/${websiteId}/areas/ai-lifestyle-copy`, {
                name,
                property_kind: kind,
                property_value: value,
                property_label: def?.label || value,
                current_value: row?.copy || null,
                criteria: {
                    cities: filters.cities,
                    counties: filters.counties,
                    neighborhoods: filters.neighborhoods,
                    zips: filters.zips,
                    min_price: filters.min_price || null,
                    max_price: filters.max_price || null,
                },
            });
            if (data.value) setPropertyPageCopy(key, textToHtml(data.value));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Could not generate page copy.');
        } finally {
            setAiCopyKey(null);
        }
    }

    async function save() {
        if (!name.trim()) { setError('A title is required.'); return; }
        setSaving(true);
        setError(null);
        // Treat toolbar residue (<p></p>, <br>) with no actual text as empty.
        const descriptionEmpty = !description || !description.replace(/<[^>]+>/g, '').trim();
        const payload = {
            name,
            description: descriptionEmpty ? null : description,
            description_heading: descriptionHeading.trim() || null,
            is_active: isActive,
            image: image || null,
            search_criteria: formToCriteria(filters),
            sub_areas: derivedSubAreas.map((r) => ({ type: r.type, label: r.label, value: r.value || null })),
            lifestyle_pages: lifestylePages.map((r) => ({ key: r.key, copy: (r.copy || '').replace(/<[^>]+>/g, '').trim() ? r.copy : null })),
            property_pages: propertyPages.map((r) => ({ kind: r.kind, value: r.value, copy: (r.copy || '').replace(/<[^>]+>/g, '').trim() ? r.copy : null })),
        };
        try {
            if (area) await axios.patch(`/api/website-editor/${websiteId}/areas/${area.id}`, payload);
            else await axios.post(`/api/website-editor/${websiteId}/areas`, payload);
            onSaved();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Could not save this community. Please try again.');
            setSaving(false);
        }
    }

    async function remove() {
        if (!area || !confirm('Delete this community? This cannot be undone.')) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/website-editor/${websiteId}/areas/${area.id}`);
            onDeleted();
        } catch {
            setError('Could not delete this community.');
            setDeleting(false);
        }
    }

    const footer = (
        <>
            {area && (
                <button type="button" onClick={remove} disabled={deleting} className="mr-auto h-9 px-3 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                    Delete
                </button>
            )}
            <button type="button" onClick={onCancel} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors">Cancel</button>
            <button type="button" onClick={save} disabled={saving || !name.trim()} className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                {saving ? 'Saving…' : area ? 'Update' : 'Create'}
            </button>
        </>
    );

    return (
        <SlideOverModal title={area ? 'Edit Community' : 'New Community'} onClose={onCancel} width={580} footer={footer}>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600">{error}</div>
                )}

                {/* Basics */}
                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Title *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Brickell, Coral Gables, Miami-Dade County" />
                    </div>
                    <div>
                        <label className={labelClass}>Cover Image</label>
                        <MediaField websiteId={websiteId} value={image} onChange={setImage} size="lg" />
                    </div>
                    <div>
                        <label className={labelClass}>Description Heading</label>
                        <input type="text" value={descriptionHeading} onChange={(e) => setDescriptionHeading(e.target.value)} className={inputClass} placeholder={`Welcome to ${name || 'your community'}`} />
                        <p className="mt-1 text-[11px] text-[#8B9096]">Shown in uppercase above the description on the public page. Leave empty for the default.</p>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className={labelClass + ' mb-0'}>Description</label>
                            <button type="button" onClick={writeWithAi} disabled={aiLoading} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2zm6 9l.9 2.6L21 14l-2.1.7L18 17l-.9-2.3L15 14l2.1-.4L18 11zM6 13l.9 2.6L9 16l-2.1.7L6 19l-.9-2.3L3 16l2.1-.4L6 13z" /></svg>
                                {aiLoading ? 'Writing…' : 'Write with AI'}
                            </button>
                        </div>
                        <RichTextField value={description} onChange={setDescription} minHeight={120} placeholder="A short, inviting paragraph about this community…" />
                        <p className="mt-1 text-[11px] text-[#8B9096]">
                            Variables like <code>{'{listings_count}'}</code>, <code>{'{community}'}</code>, <code>{'{price_range}'}</code>, <code>{'{property_links}'}</code>, <code>{'{sub_area_links}'}</code> and <code>{'{search_link}'}</code> are replaced with live MLS data and internal links on the public page. Left empty, a written-for-you SEO description is shown instead.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-[#E4E7EB] text-[#1693C9] focus:ring-0" />
                        <span className="text-[13px] text-[#111315]">Active (visible on site)</span>
                    </label>
                </div>

                {!mlsIntegrated && <MlsNotice description="Connect an MLS to pull live cities, neighborhoods and listings for your communities. You can still set up communities now — the filters will activate once your MLS is integrated." />}

                {/* Listing source */}
                <div className="border-t border-[#E4E7EB] pt-5 space-y-4">
                    <p className={sectionLabel + ' mb-0'}>Listing source</p>
                    <div className="inline-flex rounded-lg border border-[#E4E7EB] bg-[#F3F4F6] p-0.5">
                        {([['filters', 'Custom filters'], ['hotsheet', 'Saved search']] as const).map(([m, lbl]) => (
                            <button key={m} type="button" onClick={() => switchMode(m)} className={`h-8 px-3 text-[12px] font-medium rounded-md transition-colors ${mode === m ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D]'}`}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                    {mode === 'hotsheet' && (
                        hotsheets.length === 0 ? (
                            <p className="text-[12px] text-[#8B9096]">You haven’t saved any searches in the Properties tab yet. Create one there, or use custom filters.</p>
                        ) : (
                            <div>
                                <label className={labelClass}>Saved search (Hotsheet)</label>
                                <select value={filters.hotsheet_id} onChange={(e) => set('hotsheet_id', e.target.value)} className={inputClass}>
                                    <option value="">Select a saved search…</option>
                                    {hotsheets.map((h) => <option key={h.id} value={String(h.id)}>{h.name}</option>)}
                                </select>
                                <p className="mt-1 text-[11px] text-[#8B9096]">This community will reuse the filters from your saved Properties search.</p>
                            </div>
                        )
                    )}
                </div>

                {mode === 'filters' && (
                <>
                {/* Location — also drives the auto-generated SEO sub-pages */}
                <div className="border-t border-[#E4E7EB] pt-5 space-y-4">
                    <div>
                        <p className={sectionLabel + ' mb-1'}>Location &amp; SEO Sub-Pages</p>
                        <p className="text-[11px] text-[#5F656D]">
                            Define the community by any mix of cities, counties, neighborhoods, subdivisions or ZIPs. Every city, neighborhood and ZIP also becomes its own indexed SEO page under <span className="font-medium">/neighborhoods/{area?.slug || 'community'}/…</span> (ZIPs found in live listings are added automatically too).
                        </p>
                    </div>
                    <TaxonomyMultiSelect label="Cities" options={taxonomy.cities} value={filters.cities} onChange={(v) => set('cities', v)} allowCustom placeholder="Type to search cities…" />
                    <TaxonomyMultiSelect label="Counties" options={taxonomy.counties} value={filters.counties} onChange={(v) => set('counties', v)} allowCustom placeholder="Type to search counties…" />
                    <TaxonomyMultiSelect label="Neighborhoods" options={neighborhoodOptions} value={filters.neighborhoods} onChange={(v) => set('neighborhoods', v)} allowCustom placeholder="Type to search neighborhoods…" />
                    <TaxonomyMultiSelect label="Subdivisions" options={taxonomy.subdivisions} value={filters.subdivisions} onChange={(v) => set('subdivisions', v)} allowCustom placeholder="Type to search subdivisions…" />
                    <TaxonomyMultiSelect
                        label="Zip Codes"
                        help="Type to search the ZIPs your MLS covers. Each one gets its own SEO sub-page."
                        options={taxonomy.zipCodes}
                        value={filters.zips}
                        onChange={(v) => set('zips', v)}
                        allowCustom
                        sanitize={(raw) => raw.replace(/[^0-9A-Za-z]/g, '').slice(0, 10)}
                        placeholder="e.g. 33139"
                    />
                </div>

                {/* Filters */}
                <div className="border-t border-[#E4E7EB] pt-5 space-y-4">
                    <div>
                        <p className={sectionLabel + ' mb-1'}>Listing Filters</p>
                        <p className="text-[11px] text-[#5F656D]">These map directly to your MLS search, just like the Properties tab.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField label="Min Price" value={filters.min_price} onChange={(v) => set('min_price', v)} placeholder="e.g. 500000" />
                        <NumberField label="Max Price" value={filters.max_price} onChange={(v) => set('max_price', v)} placeholder="e.g. 2000000" />
                        <NumberField label="Min Beds" value={filters.min_beds} onChange={(v) => set('min_beds', v)} placeholder="e.g. 2" />
                        <NumberField label="Max Beds" value={filters.max_beds} onChange={(v) => set('max_beds', v)} placeholder="Any" />
                        <NumberField label="Min Baths" value={filters.min_baths} onChange={(v) => set('min_baths', v)} placeholder="e.g. 1.5" />
                        <NumberField label="Min Sqft" value={filters.min_sqft} onChange={(v) => set('min_sqft', v)} placeholder="e.g. 1000" />
                        <NumberField label="Max Sqft" value={filters.max_sqft} onChange={(v) => set('max_sqft', v)} placeholder="Any" />
                        <NumberField label="Min Year Built" value={filters.min_year_built} onChange={(v) => set('min_year_built', v)} placeholder="e.g. 1990" />
                        <NumberField label="Max Year Built" value={filters.max_year_built} onChange={(v) => set('max_year_built', v)} placeholder="Any" />
                    </div>
                    <OptionToggleChips label="Property Types" options={taxonomy.propertyTypes} value={filters.property_types} onChange={(v) => set('property_types', v)} emptyHint="Connect an MLS to choose property types." />
                    <p className="text-[11px] text-[#8B9096]">Only active listings are shown.</p>
                </div>
                </>
                )}

                {/* Toggleable SEO pages: property types / sub-types (from the
                    connected MLS taxonomy) + genuine lifestyles (Waterfront, 55+, …) */}
                <TogglePagesSection
                    title="Property Type Pages"
                    description="Each enabled property type (Residential, Land, Commercial…) gets its own indexed page under this community; the intro copy is editable per page."
                    options={propertyTypeDefs}
                    rows={propertyPages.filter((r) => r.kind === 'property_type').map((r) => ({ key: propertyRowKey(r), copy: r.copy }))}
                    onToggle={togglePropertyPage}
                    onCopyChange={setPropertyPageCopy}
                    copyEditingKey={copyEditing}
                    onCopyEditingChange={setCopyEditing}
                    onAiWrite={writePropertyCopyWithAi}
                    aiBusyKey={aiCopyKey}
                    emptyHint="Connect an MLS to offer property type pages."
                />
                <TogglePagesSection
                    title="Property Sub-Type Pages"
                    description="Each enabled sub-type (Single Family, Condominium, Townhouse…) gets its own indexed page under this community."
                    options={propertySubtypeDefs}
                    rows={propertyPages.filter((r) => r.kind === 'property_subtype').map((r) => ({ key: propertyRowKey(r), copy: r.copy }))}
                    onToggle={togglePropertyPage}
                    onCopyChange={setPropertyPageCopy}
                    copyEditingKey={copyEditing}
                    onCopyEditingChange={setCopyEditing}
                    onAiWrite={writePropertyCopyWithAi}
                    aiBusyKey={aiCopyKey}
                    emptyHint="Connect an MLS to offer property sub-type pages."
                />
                <TogglePagesSection
                    title="Lifestyle Pages"
                    description="Toggle the lifestyle pages shown on this community (Waterfront, Golf, 55+…). Each gets its own indexed page; the intro copy is editable per page."
                    options={lifestyles}
                    rows={lifestylePages}
                    onToggle={toggleLifestyle}
                    onCopyChange={setLifestyleCopy}
                    copyEditingKey={copyEditing}
                    onCopyEditingChange={setCopyEditing}
                    onAiWrite={writeLifestyleCopyWithAi}
                    aiBusyKey={aiCopyKey}
                />

                {/* Scope */}
                <div className="border-t border-[#E4E7EB] pt-5 space-y-4">
                    <p className={sectionLabel + ' mb-0'}>Which listings to show</p>
                    <div className="space-y-2">
                        {SCOPES.map((o) => (
                            <label key={o.value} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all ${filters.scope === o.value ? 'border-[#1693C9] bg-[#F0F9FE]' : 'border-[#E4E7EB] hover:border-[#1693C9]/40'}`}>
                                <input type="radio" name="scope" checked={filters.scope === o.value} onChange={() => set('scope', o.value)} className="mt-0.5 h-4 w-4 text-[#1693C9] focus:ring-0" />
                                <span>
                                    <span className="block text-[13px] font-medium text-[#111315]">{o.label}</span>
                                    <span className="block text-[12px] text-[#5F656D]">{o.desc}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                    <div className="max-w-[160px]">
                        <NumberField label="Max listings to feature" value={filters.limit} onChange={(v) => set('limit', v)} placeholder="e.g. 12" />
                    </div>
                </div>
            </div>
        </SlideOverModal>
    );
}
