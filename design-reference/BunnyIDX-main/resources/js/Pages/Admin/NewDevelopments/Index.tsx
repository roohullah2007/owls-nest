import AdminLayout from '@/Layouts/AdminLayout';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import SlideOverModal, { FieldLabel, slideOverInputClass } from '@/Components/Crm/SlideOverModal';
import { router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import axios from 'axios';

interface Development {
    id: number;
    name: string;
    slug: string;
    area: string;
    city: string | null;
    address: string | null;
    image: string | null;
    description: string | null;
    developer: string | null;
    status: string;
    completion_year: string | null;
    price_label: string | null;
    highlights: string[] | null;
    video_url: string | null;
    mls_keyword: string | null;
    is_active: boolean;
    sort_order: number;
}

interface Props {
    developments: Development[];
    areas: string[];
    statuses: string[];
}

const statusLabel = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminNewDevelopmentsIndex({ developments, areas, statuses }: Props) {
    const [editing, setEditing] = useState<Development | null>(null);
    const [creating, setCreating] = useState(false);
    const [areaFilter, setAreaFilter] = useState('');
    const [query, setQuery] = useState('');

    const visible = developments.filter((d) =>
        (!areaFilter || d.area === areaFilter) &&
        (!query || d.name.toLowerCase().includes(query.toLowerCase())),
    );

    return (
        <AdminLayout active="new-developments" title="Admin · New Developments"
            header={
                <>
                    <h1 className="text-lg font-normal text-[#111315]">New Developments of Florida</h1>
                    <span className="text-xs text-[#8B9096]">{developments.length} projects · shared by every agent website</span>
                    <button
                        onClick={() => setCreating(true)}
                        className="ml-auto h-8 px-4 bg-[#1693C9] text-white text-xs font-semibold rounded-lg hover:bg-[#1380AF]"
                    >
                        + Add Development
                    </button>
                </>
            }
        >
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name"
                    className="h-9 w-64 px-3 text-[13px] border border-[#E4E7EB] rounded-lg bg-white focus:outline-none focus:border-[#1693C9]"
                />
                <select
                    value={areaFilter}
                    onChange={(e) => setAreaFilter(e.target.value)}
                    className="h-9 px-3 text-[13px] border border-[#E4E7EB] rounded-lg bg-white focus:outline-none focus:border-[#1693C9]"
                >
                    <option value="">All areas</option>
                    {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>

            {visible.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E4E7EB] rounded-xl px-6 py-12 text-center">
                    <p className="text-sm font-medium text-[#111315]">No developments yet</p>
                    <p className="text-xs text-[#8B9096] mt-1">Add pre-construction projects here — every agent website with New Developments enabled will list them.</p>
                </div>
            ) : (
                <DataTable>
                    <DataTableHead>
                        <DataTableHeadCell>Project</DataTableHeadCell>
                        <DataTableHeadCell>Area</DataTableHeadCell>
                        <DataTableHeadCell>Developer</DataTableHeadCell>
                        <DataTableHeadCell>Status</DataTableHeadCell>
                        <DataTableHeadCell>Visibility</DataTableHeadCell>
                        <DataTableHeadCell align="right" last>Action</DataTableHeadCell>
                    </DataTableHead>
                    <tbody>
                        {visible.map((d) => (
                            <DataTableRow key={d.id} onClick={() => setEditing(d)}>
                                <DataTableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-12 shrink-0 overflow-hidden rounded bg-[#F3F4F6]">
                                            {d.image && <img src={d.image} alt="" className="h-full w-full object-cover" />}
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-medium text-[#111315]">{d.name}</p>
                                            {d.price_label && <p className="text-[10px] text-[#8B9096]">{d.price_label}</p>}
                                        </div>
                                    </div>
                                </DataTableCell>
                                <DataTableCell className="text-[13px] text-[#111315]">{d.area}</DataTableCell>
                                <DataTableCell className="text-xs text-[#5F656D]">{d.developer || '—'}</DataTableCell>
                                <DataTableCell className="text-xs text-[#5F656D]">{statusLabel(d.status)}{d.completion_year ? ` · ${d.completion_year}` : ''}</DataTableCell>
                                <DataTableCell>
                                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${d.is_active ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                        {d.is_active ? 'Active' : 'Hidden'}
                                    </span>
                                </DataTableCell>
                                <DataTableCell align="right" last>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditing(d); }}
                                        className="px-2.5 py-1 text-[10px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-md hover:bg-[#F9FAFB]"
                                    >
                                        Edit
                                    </button>
                                </DataTableCell>
                            </DataTableRow>
                        ))}
                    </tbody>
                </DataTable>
            )}

            {(creating || editing) && (
                <DevelopmentDrawer
                    development={editing}
                    areas={areas}
                    statuses={statuses}
                    onClose={() => { setCreating(false); setEditing(null); }}
                />
            )}
        </AdminLayout>
    );
}

function DevelopmentDrawer({ development, areas, statuses, onClose }: { development: Development | null; areas: string[]; statuses: string[]; onClose: () => void }) {
    const { data, setData, post, patch, processing, errors } = useForm({
        name: development?.name ?? '',
        area: development?.area ?? '',
        city: development?.city ?? '',
        address: development?.address ?? '',
        image: development?.image ?? '',
        description: development?.description ?? '',
        developer: development?.developer ?? '',
        status: development?.status ?? 'pre-construction',
        completion_year: development?.completion_year ?? '',
        price_label: development?.price_label ?? '',
        highlights: (development?.highlights ?? []).join('\n'),
        video_url: development?.video_url ?? '',
        mls_keyword: development?.mls_keyword ?? '',
        is_active: development?.is_active ?? true,
        sort_order: development?.sort_order ?? 0,
    });
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('image', file);
            const { data: res } = await axios.post(route('admin.new-developments.upload-image'), fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setData('image', res.url);
        } finally {
            setUploading(false);
        }
    };

    function submit() {
        const payload = {
            ...data,
            highlights: data.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
        };
        const opts = { preserveScroll: true, onSuccess: onClose };
        development
            ? router.patch(route('admin.new-developments.update', development.id), payload, opts)
            : router.post(route('admin.new-developments.store'), payload, opts);
    }

    function remove() {
        if (!development || !confirm(`Remove ${development.name} from the catalog? Sites rendering it will drop the page.`)) return;
        router.delete(route('admin.new-developments.destroy', development.id), { preserveScroll: true, onSuccess: onClose });
    }

    return (
        <SlideOverModal title={development ? `Edit ${development.name}` : 'New Development'} onClose={onClose} width={520} footer={
            <>
                {development && (
                    <button type="button" onClick={remove} className="mr-auto h-9 px-3 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
                )}
                <button type="button" onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors">Cancel</button>
                <button
                    type="button"
                    onClick={submit}
                    disabled={processing || !data.name.trim() || !data.area.trim()}
                    className="h-9 px-5 bg-[#1693C9] text-white text-xs font-medium rounded-lg hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
                >
                    {processing ? 'Saving…' : development ? 'Save Changes' : 'Add Development'}
                </button>
            </>
        }>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Cover image — same look as the website editor's MediaField (lg). */}
                <div>
                    <FieldLabel>Cover Image</FieldLabel>
                    {data.image ? (
                        <div className="relative group h-32 w-48 rounded-lg border border-[#C8CCD1] bg-[#F3F4F6] overflow-hidden">
                            <img src={data.image} alt="" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => fileRef.current?.click()} className="h-7 px-3 bg-white text-[11px] font-medium text-[#111315] rounded-md hover:bg-white/90 transition-colors">Change</button>
                                <button type="button" onClick={() => setData('image', '')} className="h-7 px-3 bg-white text-[11px] font-medium text-[#DC2626] rounded-md hover:bg-white/90 transition-colors">Remove</button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="h-32 w-48 rounded-lg border-2 border-dashed border-[#C8CCD1] bg-[#F9FAFB] flex flex-col items-center justify-center gap-1.5 text-[#5F656D] hover:border-[#1693C9] hover:text-[#1693C9] transition-colors disabled:opacity-50"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 13.5h.008v.008H18V13.5Z" /></svg>
                            <span className="text-[11px] font-medium">{uploading ? 'Uploading…' : 'Select Image'}</span>
                        </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
                </div>
                <div>
                    <FieldLabel>Project Name *</FieldLabel>
                    <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} required className={slideOverInputClass} placeholder="e.g. 1212 Aventura" />
                    {errors.name && <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel help="The heading this project is grouped under on the public page.">Area (Directory Group) *</FieldLabel>
                        <input type="text" value={data.area} onChange={(e) => setData('area', e.target.value)} required list="nd-areas" className={slideOverInputClass} placeholder="e.g. Aventura" />
                        <datalist id="nd-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
                        {errors.area && <p className="mt-1 text-[11px] text-red-500">{errors.area}</p>}
                    </div>
                    <div>
                        <FieldLabel>City</FieldLabel>
                        <input type="text" value={data.city} onChange={(e) => setData('city', e.target.value)} className={slideOverInputClass} placeholder="e.g. Miami" />
                    </div>
                </div>
                <div>
                    <FieldLabel>Address</FieldLabel>
                    <input type="text" value={data.address} onChange={(e) => setData('address', e.target.value)} className={slideOverInputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>Developer</FieldLabel>
                        <input type="text" value={data.developer} onChange={(e) => setData('developer', e.target.value)} className={slideOverInputClass} placeholder="e.g. Rieber Developments" />
                    </div>
                    <div>
                        <FieldLabel>Status</FieldLabel>
                        <select value={data.status} onChange={(e) => setData('status', e.target.value)} className={slideOverInputClass}>
                            {statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>Est. Completion</FieldLabel>
                        <input type="text" value={data.completion_year} onChange={(e) => setData('completion_year', e.target.value)} className={slideOverInputClass} placeholder="e.g. 2027" />
                    </div>
                    <div>
                        <FieldLabel help="A display label, e.g. From $850K. Pricing is developer-set, not pulled from the MLS.">Pricing Label</FieldLabel>
                        <input type="text" value={data.price_label} onChange={(e) => setData('price_label', e.target.value)} className={slideOverInputClass} placeholder="e.g. From $850K" />
                    </div>
                </div>
                <div>
                    <FieldLabel>Description</FieldLabel>
                    <textarea value={data.description} onChange={(e) => setData('description', e.target.value)} rows={4} className={slideOverInputClass} />
                </div>
                <div>
                    <FieldLabel help="Shown as a Project Highlights list on the public page.">Highlights (one per line)</FieldLabel>
                    <textarea value={data.highlights} onChange={(e) => setData('highlights', e.target.value)} rows={4} className={slideOverInputClass} placeholder={'Rooftop pool deck\n1-3 bedroom residences\nPrivate marina access'} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <FieldLabel>Video URL</FieldLabel>
                        <input type="url" value={data.video_url} onChange={(e) => setData('video_url', e.target.value)} className={slideOverInputClass} placeholder="https://youtube.com/…" />
                        {errors.video_url && <p className="mt-1 text-[11px] text-red-500">{errors.video_url}</p>}
                    </div>
                    <div>
                        <FieldLabel help="The subdivision/condo name in the MLS feed. Defaults to the project name.">MLS Match Keyword</FieldLabel>
                        <input type="text" value={data.mls_keyword} onChange={(e) => setData('mls_keyword', e.target.value)} className={slideOverInputClass} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                        <FieldLabel>Sort Order</FieldLabel>
                        <input type="number" min={0} value={data.sort_order} onChange={(e) => setData('sort_order', parseInt(e.target.value || '0', 10))} className={slideOverInputClass} />
                    </div>
                    <label className="flex items-center gap-2 h-8 text-[13px] text-[#111315] cursor-pointer">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="h-4 w-4 rounded border-[#E4E7EB] text-[#1693C9] focus:ring-0" />
                        Visible on websites
                    </label>
                </div>
            </div>
        </SlideOverModal>
    );
}
