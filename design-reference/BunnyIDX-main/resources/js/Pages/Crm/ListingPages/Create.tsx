import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

interface Preset {
    key: string;
    name: string;
    description: string;
    type: string;
    accent: string;
    requires_property: boolean;
}

interface OwnListing {
    id: number;
    title: string | null;
    address: string;
    price: number | null;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    status: string | null;
    photo: string | null;
}

interface MlsResult {
    mls_slug?: string;
    mls_id?: string;
    address?: { full?: string; street?: string; city?: string };
    price?: number | null;
    photos?: string[];
}

interface Props {
    presets: Preset[];
    myListings: OwnListing[];
}

const money = (n: number | null | undefined) => (n ? '$' + n.toLocaleString() : '');

export default function ListingPagesCreate({ presets, myListings }: Props) {
    // Single-preset product → start with it selected and skip the one-card gallery.
    const [preset, setPreset] = useState<Preset | null>(presets.length === 1 ? presets[0] : null);
    const [tab, setTab] = useState<'own' | 'mls'>('own');
    const [ownId, setOwnId] = useState<number | null>(null);
    const [mls, setMls] = useState<MlsResult | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<MlsResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [mlsError, setMlsError] = useState('');
    const [creating, setCreating] = useState(false);

    // Monotonic id so a slow earlier response can't overwrite a newer one.
    const reqId = useRef(0);

    const runSearch = async (raw: string) => {
        const q = raw.trim();
        if (q.length < 3) {
            setResults([]);
            setMlsError('');
            return;
        }
        const id = ++reqId.current;
        setSearching(true);
        setMlsError('');
        try {
            const { data } = await axios.post(route('crm.listings.search-mls'), { query: q, per_page: 12 });
            if (id !== reqId.current) return; // a newer search already started
            const listings = data.listings || [];
            setResults(listings);
            if (!listings.length) setMlsError('No matching listings found.');
        } catch (err: any) {
            if (id !== reqId.current) return;
            setMlsError(err.response?.data?.message || 'MLS search is unavailable. Connect an MLS in Settings, or use one of your listings.');
            setResults([]);
        } finally {
            if (id === reqId.current) setSearching(false);
        }
    };

    // Live autocomplete: debounce typing in the MLS tab and search as you go.
    useEffect(() => {
        if (tab !== 'mls') return;
        if (query.trim().length < 3) {
            setResults([]);
            setMlsError('');
            return;
        }
        const t = setTimeout(() => runSearch(query), 350);
        return () => clearTimeout(t);
    }, [query, tab]);

    const create = () => {
        if (!preset) return;
        const payload: Record<string, unknown> = { preset: preset.key };
        if (preset.requires_property) {
            if (tab === 'own' && ownId) {
                payload.source = 'own';
                payload.listing_id = ownId;
            } else if (tab === 'mls' && mls?.mls_slug && mls?.mls_id) {
                payload.source = 'mls';
                payload.mls_slug = mls.mls_slug;
                payload.mls_id = mls.mls_id;
            } else {
                payload.source = 'none';
            }
        } else {
            payload.source = 'none';
        }
        setCreating(true);
        router.post(route('crm.listing-pages.store'), payload as any, { onFinish: () => setCreating(false) });
    };

    const propertyChosen = !preset?.requires_property || (tab === 'own' && !!ownId) || (tab === 'mls' && !!mls);

    return (
        <CrmLayout>
            <Head title="Create Listing Page" />
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                <div className="mx-auto max-w-[1100px] space-y-6">
                    <div className="flex items-center gap-2">
                        <Link href={route('crm.listing-pages.index')} className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315]" title="Back">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-normal text-[#111315]">Create an IDX Squeeze Page</h1>
                            <p className="text-xs text-[#8B9096]">Pick the listing you want to market — your own listing or one from the MLS. You can customize everything in the editor.</p>
                        </div>
                    </div>

                    {/* Preset gallery — only when there is more than one starting point */}
                    {presets.length > 1 && (
                        <div className="grid gap-4 sm:grid-cols-3">
                            {presets.map((p) => {
                                const active = preset?.key === p.key;
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => { setPreset(p); setOwnId(null); setMls(null); }}
                                        className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-[#1693C9] bg-[#F0F9FF]' : 'border-[#E4E7EB] hover:border-[#D1D5DB]'}`}
                                    >
                                        <div className="mb-3 h-1.5 w-10 rounded-full" style={{ backgroundColor: p.accent }} />
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[14px] font-semibold ${active ? 'text-[#1693C9]' : 'text-[#111315]'}`}>{p.name}</span>
                                            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5F656D]">{p.type}</span>
                                        </div>
                                        <p className="mt-1.5 text-[12px] leading-relaxed text-[#5F656D]">{p.description}</p>
                                        {p.requires_property && <p className="mt-2 text-[11px] font-medium text-[#1693C9]">Attach a property</p>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Property picker */}
                    {preset?.requires_property && (
                        <div className="rounded-xl border border-[#E4E7EB] bg-white p-4 sm:p-5">
                            <div className="mb-4 flex items-center gap-2">
                                {(['own', 'mls'] as const).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTab(t)}
                                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t ? 'bg-[#F3F4F6] text-[#111315]' : 'text-[#5F656D] hover:bg-[#F9FAFB]'}`}
                                    >
                                        {t === 'own' ? 'My Listings' : 'Search MLS'}
                                    </button>
                                ))}
                            </div>

                            {tab === 'own' ? (
                                myListings.length === 0 ? (
                                    <p className="py-6 text-center text-[13px] text-[#8B9096]">You have no listings yet. Add one under Listings, or search the MLS.</p>
                                ) : (
                                    <div className="grid max-h-[360px] gap-2 overflow-y-auto sm:grid-cols-2">
                                        {myListings.map((l) => (
                                            <button
                                                key={l.id}
                                                type="button"
                                                onClick={() => setOwnId(l.id)}
                                                className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-all ${ownId === l.id ? 'border-[#1693C9] bg-[#F0F9FF]' : 'border-[#E4E7EB] hover:border-[#D1D5DB]'}`}
                                            >
                                                <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-[#EEF0F3]">
                                                    {l.photo && <img src={l.photo} alt="" className="h-full w-full object-cover" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-semibold text-[#111315]">{l.address || l.title || 'Listing'}</p>
                                                    <p className="text-[12px] text-[#5F656D]">{money(l.price)}{l.beds ? ` · ${l.beds} bd` : ''}{l.baths ? ` · ${l.baths} ba` : ''}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div>
                                    <div className="relative">
                                        <input
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
                                            placeholder="Start typing an address, city or MLS #…"
                                            autoFocus
                                            className="w-full rounded-lg border border-[#D9DCE1] px-3 py-2 pr-24 text-[13px] outline-none focus:border-[#1693C9] focus:ring-2 focus:ring-[#1693C9]/20"
                                        />
                                        {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#8B9096]">Searching…</span>}
                                    </div>
                                    {query.trim().length > 0 && query.trim().length < 3 && (
                                        <p className="mt-2 text-[12px] text-[#8B9096]">Type at least 3 characters to search the MLS.</p>
                                    )}
                                    {mlsError && <p className="mt-3 text-[12px] text-[#B91C1C]">{mlsError}</p>}
                                    {results.length > 0 && (
                                        <div className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto sm:grid-cols-2">
                                            {results.map((r, i) => (
                                                <button
                                                    key={`${r.mls_slug}:${r.mls_id}:${i}`}
                                                    type="button"
                                                    onClick={() => setMls(r)}
                                                    className={`flex items-center gap-3 rounded-lg border p-2 text-left transition-all ${mls === r ? 'border-[#1693C9] bg-[#F0F9FF]' : 'border-[#E4E7EB] hover:border-[#D1D5DB]'}`}
                                                >
                                                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded bg-[#EEF0F3]">
                                                        {r.photos?.[0] && <img src={r.photos[0]} alt="" className="h-full w-full object-cover" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[13px] font-semibold text-[#111315]">{r.address?.full || r.address?.street || 'Listing'}</p>
                                                        <p className="text-[12px] text-[#5F656D]">{money(r.price)}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Create */}
                    {preset && (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={create}
                                disabled={creating}
                                className="h-9 rounded-md bg-[#1693C9] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#1380AF] disabled:opacity-50"
                            >
                                {creating ? 'Creating…' : `Create ${preset.name}`}
                            </button>
                            {preset.requires_property && !propertyChosen && (
                                <span className="text-[12px] text-[#8B9096]">No property selected — you can attach one later in the editor.</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </CrmLayout>
    );
}
