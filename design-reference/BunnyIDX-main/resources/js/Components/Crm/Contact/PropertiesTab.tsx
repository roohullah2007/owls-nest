import { useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Contact } from './types';
import MlsSearchPickerModal from './MlsSearchPickerModal';
import Select from '@/Components/ui/Select';
import { titleCase as humanize } from '@/utils/text';

interface ContactListing {
    id: number;
    title: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    postal_code: string | null;
    price: string | null;
    bedrooms: number | null;
    bathrooms: string | null;
    sqft: number | null;
    mls_number: string | null;
    photos: string[] | null;
    listing_type: string;
    status: string;
}

interface UserListing {
    id: number;
    title: string;
    address: string | null;
    city: string | null;
    state_province: string | null;
    price: string | null;
    photos: string[] | null;
    contact_id: number | null;
    bedrooms: number | null;
    bathrooms: string | null;
    sqft: number | null;
}

interface IdxConnection {
    id: number;
    provider: string;
    mls_slug: string;
    display_name: string;
    agent_id: string | null;
    office_id: string | null;
}

interface Props {
    contact: Contact & { listings?: ContactListing[] };
    idxConnections: IdxConnection[];
    userListings: UserListing[];
}

function formatPrice(value: string | number | null): string {
    if (value === null || value === undefined || value === '') return '—';
    const n = typeof value === 'string' ? Number(value) : value;
    if (!Number.isFinite(n)) return '—';
    return `$${n.toLocaleString()}`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    active: { bg: '#DCFCE7', text: '#15803D' },
    pending: { bg: '#FEF3C7', text: '#A16207' },
    sold: { bg: '#E0E7FF', text: '#4338CA' },
    closed: { bg: '#E0E7FF', text: '#4338CA' },
    withdrawn: { bg: '#FEE2E2', text: '#B91C1C' },
    expired: { bg: '#FEE2E2', text: '#B91C1C' },
    cancelled: { bg: '#FEE2E2', text: '#B91C1C' },
    coming_soon: { bg: '#FCE7F3', text: '#9D174D' },
    contingent: { bg: '#FEF3C7', text: '#A16207' },
};
function statusStyle(s: string | null): { bg: string; text: string } {
    return STATUS_COLORS[(s || '').toLowerCase()] || { bg: '#F3F4F6', text: '#5F656D' };
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
    residential: { bg: '#EBF5FF', text: '#1693C9' },
    condominium: { bg: '#EDE9FE', text: '#7C3AED' },
    condo: { bg: '#EDE9FE', text: '#7C3AED' },
    townhouse: { bg: '#FCE7F3', text: '#9D174D' },
    land: { bg: '#DCFCE7', text: '#15803D' },
    commercial: { bg: '#FEF3C7', text: '#A16207' },
    multi_family: { bg: '#E0F2FE', text: '#0369A1' },
    rental: { bg: '#F3F4F6', text: '#5F656D' },
};
function typeStyle(t: string | null): { bg: string; text: string } {
    return TYPE_COLORS[(t || '').toLowerCase()] || { bg: '#F3F4F6', text: '#5F656D' };
}

function ListingCard({ listing, onDetach, onEdit }: { listing: ContactListing; onDetach: () => void; onEdit: () => void }) {
    const cover = listing.photos?.[0] || null;
    const cityLine = [listing.city, listing.state_province, listing.postal_code].filter(Boolean).join(', ');
    return (
        <article className="group flex gap-3 p-2 border border-[#E4E7EB] rounded-[4px] bg-white hover:border-[#1693C9] hover:shadow-sm transition-all">
            <Link
                href={route('crm.listings.show', listing.id)}
                className="w-28 h-24 shrink-0 bg-[#F3F4F6] rounded-[4px] overflow-hidden block"
                onClick={(e) => e.stopPropagation()}
            >
                {cover ? (
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <svg className="h-6 w-6 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5" />
                        </svg>
                    </div>
                )}
            </Link>
            <Link href={route('crm.listings.show', listing.id)} className="flex-1 min-w-0 block">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111315]">{formatPrice(listing.price)}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {listing.status && (() => {
                            const s = statusStyle(listing.status);
                            return <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: s.bg, color: s.text }}>{humanize(listing.status)}</span>;
                        })()}
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                            title="Edit property"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-all"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDetach(); }}
                            title="Remove from contact"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 inline-flex items-center justify-center rounded-[4px] text-[#8B9096] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <p className="text-xs text-[#5F656D] line-clamp-1 mt-0.5">{listing.address || listing.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#5F656D]">
                    {listing.bedrooms != null && <span>{listing.bedrooms} bd</span>}
                    {listing.bathrooms != null && <span>{listing.bathrooms} ba</span>}
                    {listing.sqft != null && <span>{listing.sqft.toLocaleString()} sqft</span>}
                    {listing.listing_type && (() => {
                        const t = typeStyle(listing.listing_type);
                        return <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ backgroundColor: t.bg, color: t.text }}>{humanize(listing.listing_type)}</span>;
                    })()}
                </div>
                {cityLine && <p className="text-[11px] text-[#8B9096] mt-0.5 line-clamp-1">{cityLine}</p>}
            </Link>
        </article>
    );
}

function formatShortPrice(p: string | null): string {
    if (!p) return '—';
    const n = Number(p);
    if (!Number.isFinite(n)) return '—';
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
    return `$${n.toLocaleString()}`;
}

function AddListingModal({ contact, userListings, alreadyLinkedIds, onClose, editListing }: {
    contact: Contact;
    userListings: UserListing[];
    alreadyLinkedIds: Set<number>;
    onClose: () => void;
    editListing?: ContactListing | null;
}) {
    const isEdit = !!editListing;
    const [mode, setMode] = useState<'existing' | 'new'>(isEdit ? 'new' : (userListings.length > 0 ? 'existing' : 'new'));
    const [search, setSearch] = useState('');
    const [linking, setLinking] = useState<number | null>(null);

    const inputCls = 'w-full h-9 text-sm border border-[#E4E7EB] rounded-[4px] px-3 text-[#111315] bg-white focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9]';

    const available = userListings.filter((l) => !alreadyLinkedIds.has(l.id));
    const filtered = available.filter((l) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (l.title || '').toLowerCase().includes(q)
            || (l.address || '').toLowerCase().includes(q)
            || (l.city || '').toLowerCase().includes(q);
    });

    function linkExisting(l: UserListing) {
        setLinking(l.id);
        router.post(route('crm.contacts.listings.link', contact.uuid), { listing_id: l.id }, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setLinking(null),
        });
    }

    // --- "Add new" / "Edit" form state ---
    const photoInput = useRef<HTMLInputElement>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(editListing?.photos?.[0] ?? null);
    const [form, setForm] = useState({
        title: editListing?.title ?? '',
        listing_type: editListing?.listing_type ?? 'residential',
        status: editListing?.status ?? 'active',
        address: editListing?.address ?? '',
        unit: '',
        city: editListing?.city ?? '',
        state_province: editListing?.state_province ?? '',
        postal_code: editListing?.postal_code ?? '',
        country: 'US',
        price: editListing?.price ?? '',
        bedrooms: editListing?.bedrooms != null ? String(editListing.bedrooms) : '',
        bathrooms: editListing?.bathrooms ?? '',
        sqft: editListing?.sqft != null ? String(editListing.sqft) : '',
        lot_size: '',
        year_built: '',
        description: '',
        mls_number: editListing?.mls_number ?? '',
    });
    const [addToMyListings, setAddToMyListings] = useState(false);
    const [saving, setSaving] = useState(false);

    function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0] || null;
        setPhotoFile(f);
        setPhotoPreview(f ? URL.createObjectURL(f) : null);
    }

    function submitNew(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        if (isEdit && editListing) {
            const data = new FormData();
            Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
            if (photoFile) data.append('photo', photoFile);
            data.append('_method', 'PATCH');
            router.post(route('crm.listings.update', editListing.id), data, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => onClose(),
                onFinish: () => setSaving(false),
            });
            return;
        }

        const data = new FormData();
        Object.entries(form).forEach(([k, v]) => { if (v) data.append(k, v); });
        if (photoFile) data.append('photo', photoFile);
        if (addToMyListings) data.append('add_to_my_listings', '1');
        router.post(route('crm.contacts.listings.attach', contact.uuid), data, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => onClose(),
            onFinish: () => setSaving(false),
        });
    }

    function deleteListing() {
        if (!editListing) return;
        if (!confirm('Delete this property? This cannot be undone.')) return;
        router.delete(route('crm.listings.destroy', editListing.id), {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="relative pointer-events-auto bg-white border border-[#E4E7EB] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[4px] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EB] shrink-0">
                    <h2 className="text-sm font-semibold text-[#111315]">{isEdit ? 'Edit property' : 'Add property'}</h2>
                    <button onClick={onClose} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Mode tabs — hidden in edit mode */}
                {!isEdit && (
                    <div className="px-5 pt-3 shrink-0">
                        <div className="flex items-center gap-0.5 bg-[#F3F4F6] rounded-[4px] p-1 w-fit">
                            <button type="button" onClick={() => setMode('existing')} className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all ${mode === 'existing' ? 'bg-white text-[#1693C9] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                                From my listings
                            </button>
                            <button type="button" onClick={() => setMode('new')} className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all ${mode === 'new' ? 'bg-white text-[#1693C9] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                                Add new
                            </button>
                        </div>
                    </div>
                )}

                {mode === 'existing' ? (
                    <div className="flex flex-col overflow-hidden flex-1">
                        <div className="px-5 py-3 border-b border-[#E4E7EB] shrink-0">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search your listings by address, city, title…"
                                className={inputCls}
                                autoFocus
                            />
                            <p className="text-[11px] text-[#8B9096] mt-2">Showing {filtered.length} of {available.length} unattached {available.length === 1 ? 'listing' : 'listings'} from your <Link href={route('crm.listings.index')} className="text-[#1693C9] hover:underline">Properties page</Link>.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 bg-[#F9FAFB] space-y-2">
                            {filtered.length === 0 ? (
                                <p className="text-center text-xs text-[#8B9096] py-10">
                                    {available.length === 0 ? "You haven't created any listings yet. Switch to “Add new” to create one for this contact." : 'No listings match that search.'}
                                </p>
                            ) : filtered.map((l) => {
                                const cover = l.photos?.[0];
                                const city = [l.city, l.state_province].filter(Boolean).join(', ');
                                return (
                                    <article key={l.id} className="flex gap-3 p-2 bg-white border border-[#E4E7EB] rounded-[4px] hover:border-[#1693C9] transition-colors">
                                        <div className="w-24 h-20 shrink-0 bg-[#F3F4F6] rounded-[4px] overflow-hidden">
                                            {cover ? <img src={cover} alt="" className="w-full h-full object-cover" /> : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <svg className="h-5 w-5 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159M3.75 21h16.5" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <p className="text-sm font-semibold text-[#111315]">{formatShortPrice(l.price)}</p>
                                            <p className="text-xs text-[#5F656D] line-clamp-1 mt-0.5">{l.address || l.title}</p>
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#5F656D]">
                                                {l.bedrooms != null && <span>{l.bedrooms} bd</span>}
                                                {l.bathrooms != null && <span>{l.bathrooms} ba</span>}
                                                {l.sqft != null && <span>{l.sqft.toLocaleString()} sqft</span>}
                                            </div>
                                            <div className="flex items-end justify-between gap-2 mt-auto pt-1">
                                                {city ? <p className="text-[11px] text-[#8B9096] truncate">{city}</p> : <span />}
                                                <button
                                                    type="button"
                                                    onClick={() => linkExisting(l)}
                                                    disabled={linking !== null}
                                                    className="h-7 px-3 text-[11px] font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-50 transition-colors"
                                                >
                                                    {linking === l.id ? 'Linking…' : 'Link'}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={submitNew} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            <div className="bg-[#EBF5FF] border border-[#BFDBFE] rounded-[4px] p-3">
                                <p className="text-[12px] text-[#0B577A]">
                                    <strong>Heads up:</strong> this property will be linked to <strong>{contact.first_name} {contact.last_name}</strong> only — it won't appear on your Properties page. Check "Add to my Properties" below if you'd also like to publish it there.
                                </p>
                            </div>

                            {/* Photo */}
                            <div>
                                <label className="text-[11px] font-medium text-[#5F656D] mb-1.5 block">Cover photo <span className="text-[#8B9096] font-normal">(optional)</span></label>
                                <div className="flex items-center gap-3">
                                    <div className="w-28 h-20 shrink-0 bg-[#F3F4F6] border border-dashed border-[#D1D5DB] rounded-[4px] overflow-hidden flex items-center justify-center">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <svg className="h-6 w-6 text-[#C4C9D1]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3 19.5h18M3 19.5V4.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 4.5v15" /></svg>
                                        )}
                                    </div>
                                    <input ref={photoInput} type="file" accept="image/*" hidden onChange={onPhotoPick} />
                                    <button type="button" onClick={() => photoInput.current?.click()} className="h-8 px-3 text-xs font-medium text-[#5F656D] border border-[#E4E7EB] rounded-[4px] hover:bg-[#F3F4F6] transition-colors">
                                        {photoFile ? 'Change' : 'Upload photo'}
                                    </button>
                                    {photoFile && (
                                        <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoInput.current) photoInput.current.value = ''; }} className="text-[11px] text-[#8B9096] hover:text-[#DC2626] transition-colors">Remove</button>
                                    )}
                                </div>
                            </div>

                            {/* Listing info */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Listing info</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Title <span className="text-[#DC2626]">*</span></label>
                                        <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Main Street home" className={inputCls} autoFocus />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Type</label>
                                        <Select value={form.listing_type} onChange={(v) => setForm({ ...form, listing_type: v })}>
                                            <option value="residential">Residential</option>
                                            <option value="condominium">Condominium</option>
                                            <option value="townhouse">Townhouse</option>
                                            <option value="land">Land</option>
                                            <option value="commercial">Commercial</option>
                                            <option value="multi_family">Multi-Family</option>
                                            <option value="rental">Rental</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Status</label>
                                        <Select value={form.status} onChange={(v) => setForm({ ...form, status: v })}>
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="sold">Sold</option>
                                            <option value="withdrawn">Withdrawn</option>
                                            <option value="coming_soon">Coming Soon</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Price</label>
                                        <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="500000" />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">MLS #</label>
                                        <input type="text" value={form.mls_number} onChange={(e) => setForm({ ...form, mls_number: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                            </fieldset>

                            {/* Location */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Location</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Address</label>
                                        <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Unit</label>
                                        <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">City</label>
                                        <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">State</label>
                                        <input type="text" value={form.state_province} onChange={(e) => setForm({ ...form, state_province: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Postal code</label>
                                        <input type="text" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                            </fieldset>

                            {/* Details */}
                            <fieldset className="space-y-3">
                                <legend className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Details</legend>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Bedrooms</label>
                                        <input type="number" min={0} value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Bathrooms</label>
                                        <input type="number" min={0} step="0.5" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Sqft</label>
                                        <input type="number" min={0} value={form.sqft} onChange={(e) => setForm({ ...form, sqft: e.target.value })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-[#8B9096] mb-1 block">Year built</label>
                                        <input type="number" min={1800} max={2100} value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] text-[#8B9096] mb-1 block">Description</label>
                                    <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full text-sm border border-[#E4E7EB] rounded-[4px] px-3 py-2 text-[#111315] bg-white focus:outline-none focus:ring-1 focus:ring-[#1693C9] focus:border-[#1693C9] resize-y" />
                                </div>
                            </fieldset>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 border-t border-[#E4E7EB] bg-[#F9FAFB] shrink-0">
                            {isEdit ? (
                                <button type="button" onClick={deleteListing} className="h-9 px-3 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-[4px] transition-colors">
                                    Delete
                                </button>
                            ) : (
                                <label className="flex items-center gap-2 text-[12px] text-[#5F656D] cursor-pointer select-none">
                                    <input type="checkbox" checked={addToMyListings} onChange={(e) => setAddToMyListings(e.target.checked)} className="rounded border-[#D1D5DB] text-[#1693C9] focus:ring-[#1693C9]" />
                                    Also add to <Link href={route('crm.listings.index')} className="text-[#1693C9] hover:underline">my Properties</Link>
                                </label>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                                <button type="button" onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] bg-white border border-[#E4E7EB] rounded-[4px] hover:bg-[#F3F4F6] transition-colors">Cancel</button>
                                <button type="submit" disabled={saving || !form.title.trim()} className="h-9 px-4 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-50 transition-colors">
                                    {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save' : 'Add property')}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>
            </div>
        </>
    );
}

export default function PropertiesTab({ contact, idxConnections, userListings }: Props) {
    const [showMlsSearch, setShowMlsSearch] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [editingListing, setEditingListing] = useState<ContactListing | null>(null);

    const listings = (contact.listings || []) as ContactListing[];
    const isSeller = contact.type === 'seller';
    const isBuyer = contact.type === 'buyer';
    const hasIdx = idxConnections.length > 0;
    const alreadyLinkedIds = new Set(listings.map((l) => l.id));

    function detach(listing: ContactListing) {
        if (!confirm(`Remove "${listing.title}" from this contact?`)) return;
        router.delete(route('crm.contacts.listings.detach', [contact.uuid, listing.id]), { preserveScroll: true });
    }

    return (
        <div className="p-3 sm:p-4 lg:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-[15px] font-semibold text-[#111315]">Properties</h2>
                    <p className="text-[13px] text-[#111315] mt-0.5">
                        {isSeller && 'Properties this seller wants to list, or has listed.'}
                        {isBuyer && 'Listings this buyer is interested in.'}
                        {!isSeller && !isBuyer && 'Properties linked to this contact.'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {hasIdx && (
                        <button
                            type="button"
                            onClick={() => setShowMlsSearch(true)}
                            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                            Search MLS
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowAdd(true)}
                        className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-[#5F656D] bg-white border border-[#E4E7EB] rounded-[4px] hover:bg-[#F9FAFB] transition-colors"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                        Add property
                    </button>
                </div>
            </div>

            {/* Hint banner — type-aware */}
            {listings.length === 0 && (
                <div className={`rounded-[4px] p-5 border ${isSeller ? 'bg-[#FEF3C7] border-[#FDE68A]' : 'bg-[#EBF5FF] border-[#BFDBFE]'}`}>
                    <p className="text-[13px] font-semibold text-[#111315]">
                        {isSeller && 'No properties yet for this seller'}
                        {isBuyer && 'No saved listings yet for this buyer'}
                        {!isSeller && !isBuyer && 'No properties linked yet'}
                    </p>
                    <p className="text-xs text-[#5F656D] mt-1 leading-relaxed">
                        {isSeller && (
                            <>Add properties this seller wants to list. Once added, you can spin up a deal for each property directly from here.</>
                        )}
                        {isBuyer && (
                            <>Use <strong>Search MLS</strong> to find listings this buyer might like and attach them. Each saved listing becomes a candidate for a future showing or offer.</>
                        )}
                        {!isSeller && !isBuyer && 'Use Search MLS or add manually to attach a property to this contact.'}
                    </p>
                    {!hasIdx && (
                        <p className="text-[11px] text-[#8B9096] mt-2">
                            Want MLS search? <Link href={route('crm.idx.index')} className="text-[#1693C9] font-medium hover:underline">Connect an MLS feed</Link>.
                        </p>
                    )}
                </div>
            )}

            {/* Listings list — horizontal cards (map-view style) */}
            {listings.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {listings.map((l) => (
                        <ListingCard
                            key={l.id}
                            listing={l}
                            onDetach={() => detach(l)}
                            onEdit={() => setEditingListing(l)}
                        />
                    ))}
                </div>
            )}

            {showAdd && <AddListingModal contact={contact} userListings={userListings} alreadyLinkedIds={alreadyLinkedIds} onClose={() => setShowAdd(false)} />}
            {editingListing && (
                <AddListingModal
                    contact={contact}
                    userListings={userListings}
                    alreadyLinkedIds={alreadyLinkedIds}
                    onClose={() => setEditingListing(null)}
                    editListing={editingListing}
                />
            )}
            {showMlsSearch && (
                <MlsSearchPickerModal
                    contact={contact}
                    idxConnections={idxConnections}
                    onClose={() => setShowMlsSearch(false)}
                />
            )}
        </div>
    );
}
