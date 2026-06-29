import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { AgentWebsite } from '../../../types';
import { inputClass, labelClass } from '../../../constants';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import NewListingModal from '@/Pages/Crm/Listings/components/NewListingModal';

type Section = 'featured' | 'sold';

interface WebsiteListingRow {
    id: number;
    title: string;
    address: string;
    price: string | null;
    status: string;
    photo: string | null;
    website_section: Section | null;
    from_mls: boolean;
}

interface SectionMlsConfig {
    agent_ids?: string;
    office_ids?: string;
    mls_numbers?: string;
}

interface Props {
    website: AgentWebsite;
    section: Section;
    onActionChange: (action: { label: string; onClick: () => void; secondary?: { label: string; onClick: () => void } } | null) => void;
}

const SECTION_META: Record<Section, { title: string; blurb: string; publicPath: string; otherTitle: string }> = {
    featured: {
        title: 'Featured Listings',
        blurb: 'Shown on your public Featured Properties page. Add your own (off-MLS) properties — they also appear in CRM → Properties — or pull listings from your MLS feed via MLS Settings.',
        publicPath: '/featured-properties',
        otherTitle: 'Sold Listings',
    },
    sold: {
        title: 'Sold Listings',
        blurb: 'Shown on your public Past Transactions page. Flag closed deals from your CRM properties, or pull sold listings from your MLS feed via MLS Settings.',
        publicPath: '/past-transactions',
        otherTitle: 'Featured Listings',
    },
};

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-[#E8F5E0] text-[#63A205]',
    pending: 'bg-[#FEF3C7] text-[#D97706]',
    sold: 'bg-[#F3F4F6] text-[#5F656D]',
};

/** Blog-card style leading chip: listing photo or a two-tone home icon. */
function ListingChip({ src }: { src: string | null }) {
    return src ? (
        <span className="block h-10 w-10 rounded-[4px] bg-[#F3F4F6] bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
    ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-[#E0F2FE]">
            <HomeIcon className="h-5 w-5 text-[#1693C9]" />
        </span>
    );
}

function HomeIcon({ className }: { className: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.204 3.045c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" /></svg>
    );
}

/**
 * Website settings → Featured / Sold listings — each its own sub-sidebar tab
 * (Website Listings group), styled like the directory managers: card-list
 * rows, "Add Property" + "MLS Settings" in the top bar, and slide-overs for
 * the MLS pull config and the add-from-CRM picker. The CRM /properties table
 * is the single store for manual listings; this section flags them per
 * website section.
 */
export default function WebsiteListingsSection({ website, section, onActionChange }: Props) {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<WebsiteListingRow[]>([]);
    const [meta, setMeta] = useState<{ listing_types: string[]; listing_statuses: string[]; maps_key: string | null }>({ listing_types: [], listing_statuses: [], maps_key: null });
    const [mlsCfg, setMlsCfg] = useState<Record<Section, SectionMlsConfig>>({ featured: {}, sold: {} });
    const [featuredInSearch, setFeaturedInSearch] = useState(false);
    const [savingCfg, setSavingCfg] = useState(false);
    const [cfgError, setCfgError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    const base = `/api/website-editor/${website.id}`;
    const m = SECTION_META[section];

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${base}/website-listings`);
            setRows(data.listings || []);
            setMeta(data.meta || { listing_types: [], listing_statuses: [], maps_key: null });
            setMlsCfg({
                featured: data.config?.featured || {},
                sold: data.config?.sold || {},
            });
            setFeaturedInSearch(!!data.config?.featured_in_search);
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Top-bar actions — same pattern as the directory managers.
    useEffect(() => {
        onActionChange({
            label: 'Add Property',
            onClick: () => setAdding(true),
            secondary: { label: 'MLS Settings', onClick: () => setSettingsOpen(true) },
        });
        return () => onActionChange(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section]);

    const setRowSection = async (listingId: number, target: Section | null) => {
        setBusyId(listingId);
        try {
            await axios.patch(`${base}/website-listings/${listingId}`, { section: target });
            setRows((r) => r.map((row) => (row.id === listingId ? { ...row, website_section: target } : row)));
        } finally {
            setBusyId(null);
        }
    };

    /** Featured → Sold: closes the listing (status sold + sold_at) and moves it to Sold Listings. */
    const markSold = async (listingId: number) => {
        setBusyId(listingId);
        try {
            await axios.patch(`${base}/website-listings/${listingId}`, { section: 'sold', mark_sold: true });
            setRows((r) => r.map((row) => (row.id === listingId ? { ...row, website_section: 'sold', status: 'sold' } : row)));
        } finally {
            setBusyId(null);
        }
    };

    const saveCfg = async () => {
        setSavingCfg(true);
        setCfgError(null);
        try {
            await axios.patch(`${base}/website-listings/config`, {
                featured: mlsCfg.featured,
                sold: mlsCfg.sold,
                featured_in_search: featuredInSearch,
            });
            setSettingsOpen(false);
        } catch {
            setCfgError('Could not save the settings. Please try again.');
        } finally {
            setSavingCfg(false);
        }
    };

    const updateCfgField = (field: keyof SectionMlsConfig, value: string) => {
        setMlsCfg((c) => ({ ...c, [section]: { ...c[section], [field]: value } }));
    };

    const inSection = rows.filter((r) => r.website_section === section);
    const available = rows.filter((r) => r.website_section !== section);

    const ghostButtonClass = 'rounded-[4px] border border-[#C8CCD1] bg-white px-3 py-[6px] text-[12px] font-medium text-[#111315] hover:bg-[#F7F8F9] disabled:opacity-50 transition-colors';

    const settingsFooter = (
        <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setSettingsOpen(false)} className={ghostButtonClass}>Cancel</button>
            <PrimaryButton type="button" onClick={saveCfg} disabled={savingCfg} icon={null} label={savingCfg ? 'Saving…' : 'Save Settings'} />
        </div>
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-3xl text-[12px] text-[#5F656D]">{m.blurb}</p>
                <a href={`/site/${website.slug}${m.publicPath}`} target="_blank" rel="noopener" className="shrink-0 text-[12px] font-medium text-[#1693C9] hover:underline">
                    View page ↗
                </a>
            </div>

            <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] text-[#8B9096]">
                    {loading ? 'Loading…' : `${inSection.length} ${inSection.length === 1 ? 'property' : 'properties'} in this section`}
                </p>
                <button type="button" onClick={() => setPickerOpen(true)} className={ghostButtonClass}>
                    Add From CRM Properties
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <svg className="h-5 w-5 animate-spin text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : inSection.length === 0 ? (
                <div className="rounded-[4px] border border-[#E4E7EB] bg-white p-12 text-center shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)]">
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E0F2FE]">
                        <HomeIcon className="h-5 w-5 text-[#1693C9]" />
                    </div>
                    <h4 className="mb-1 text-sm font-semibold text-[#111315]">No {m.title.toLowerCase()} yet</h4>
                    <p className="mb-4 text-[12px] text-[#5F656D]">Add a property, pick one from your CRM, or pull from your MLS via MLS Settings.</p>
                    <button type="button" onClick={() => setAdding(true)} className="h-8 rounded-[4px] bg-[#1693C9] px-4 text-[12px] font-medium text-white transition-colors hover:bg-[#1380AF]">
                        Add First Property
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {inSection.map((row) => (
                        <div key={row.id} className="group flex items-center border border-[#E4E7EB] bg-white rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] transition-all hover:border-[#D1D5DB] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)]">
                            <div className="flex shrink-0 items-center pl-3">
                                <ListingChip src={row.photo} />
                            </div>
                            <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4">
                                <div className="min-w-0 flex-1">
                                    <span className="inline-flex max-w-full items-center gap-2">
                                        <span className="truncate text-[15px] font-semibold text-[#111315]">{row.title || row.address}</span>
                                        <span className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE[row.status?.toLowerCase()] || 'bg-[#F3F4F6] text-[#5F656D]'}`}>
                                            {row.status}
                                        </span>
                                        {row.from_mls && (
                                            <span className="inline-flex shrink-0 items-center rounded bg-[#EDE5FB] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#7C36EE]">MLS</span>
                                        )}
                                    </span>
                                    <p className="mt-0.5 truncate text-[11px] text-[#8B9096]">
                                        {[row.address, row.price].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                {section === 'featured' && (
                                    <button
                                        type="button"
                                        disabled={busyId === row.id}
                                        onClick={() => markSold(row.id)}
                                        title="Close the listing (status becomes sold) and move it to Sold Listings"
                                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border px-3 text-[12px] font-medium transition-colors disabled:opacity-50 border-[#C8CCD1] text-[#5F656D] hover:bg-[#F7F8F9] hover:text-[#111315]"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                                        Mark Sold
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={busyId === row.id}
                                    onClick={() => setRowSection(row.id, null)}
                                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border border-[#F0C2C2] px-3 text-[12px] font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2] disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Add From CRM Properties slide-over ── */}
            {pickerOpen && (
                <SlideOverModal title="Add From CRM Properties" onClose={() => setPickerOpen(false)} width={480}>
                    <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-5">
                        <p className="text-[12px] text-[#5F656D]">
                            Your CRM → Properties. Adding one flags it for {m.title}; it stays in your CRM.
                        </p>
                        {available.length === 0 && (
                            <p className="p-2 text-[13px] italic text-[#9AA1A9]">No other CRM properties found.</p>
                        )}
                        {available.map((row) => (
                            <div key={row.id} className="flex items-center gap-3 rounded-[4px] border border-[#E4E7EB] bg-white p-2">
                                <ListingChip src={row.photo} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-[#111315]">{row.title || row.address}</p>
                                    <p className="truncate text-[11px] text-[#8B9096]">
                                        {[row.address, row.price].filter(Boolean).join(' · ')}
                                        {row.website_section ? ` · in ${SECTION_META[row.website_section].title}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={busyId === row.id}
                                    onClick={() => setRowSection(row.id, section)}
                                    className="flex h-8 shrink-0 items-center rounded-[4px] bg-[#1693C9] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#1380AF] disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>
                        ))}
                    </div>
                </SlideOverModal>
            )}

            {/* ── MLS Settings slide-over ── */}
            {settingsOpen && (
                <SlideOverModal title={`MLS ${m.title}`} onClose={() => setSettingsOpen(false)} footer={settingsFooter} width={460}>
                    <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-6">
                        <p className="text-[13px] text-[#5F656D]">
                            Pull {section === 'sold' ? 'sold' : 'active'} listings straight from your connected MLS — by
                            agent ID, office ID, or individual listing IDs (comma-separated).
                        </p>
                        <div>
                            <label className={labelClass}>MLS Agent ID(s)</label>
                            <input type="text" className={inputClass} value={mlsCfg[section].agent_ids || ''} onChange={(e) => updateCfgField('agent_ids', e.target.value)} placeholder="e.g. 3yd-AB12345" />
                        </div>
                        <div>
                            <label className={labelClass}>MLS Office ID(s)</label>
                            <input type="text" className={inputClass} value={mlsCfg[section].office_ids || ''} onChange={(e) => updateCfgField('office_ids', e.target.value)} placeholder="e.g. OFC001, OFC002" />
                        </div>
                        <div>
                            <label className={labelClass}>MLS Listing ID(s)</label>
                            <input type="text" className={inputClass} value={mlsCfg[section].mls_numbers || ''} onChange={(e) => updateCfgField('mls_numbers', e.target.value)} placeholder="e.g. A11234567, stellar:O6543210" />
                            <p className="mt-1 text-[11px] text-[#9AA1A9]">Prefix with the MLS slug ("stellar:ID") when you have multiple feeds.</p>
                        </div>
                        {section === 'featured' && (
                            <label className="flex items-start gap-2 pt-1 text-[13px] text-[#111315]">
                                <input type="checkbox" checked={featuredInSearch} onChange={(e) => setFeaturedInSearch(e.target.checked)} className="mt-0.5 rounded border-[#C8CCD1]" />
                                Show featured listings first on the Property Search default view (also used when no MLS is connected)
                            </label>
                        )}
                        {cfgError && <p className="text-[12px] text-red-600">{cfgError}</p>}
                    </div>
                </SlideOverModal>
            )}

            {/* Same form as CRM → Properties; saves into the CRM store, pre-flagged for this section. */}
            <NewListingModal
                isOpen={adding}
                onClose={() => setAdding(false)}
                listingTypes={meta.listing_types}
                listingStatuses={meta.listing_statuses}
                contacts={[]}
                deals={[]}
                tags={[]}
                googleMapsApiKey={meta.maps_key}
                presetWebsiteSection={section}
                onSaved={fetchAll}
            />
        </div>
    );
}
