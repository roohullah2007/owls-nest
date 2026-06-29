import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { IdxConnection, AvailableMls, ConnectionConstraints } from '../Index';

const defaultPropertyTypes = [
    { value: 'Residential', icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
    { value: 'Condominium', icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' },
    { value: 'Commercial Sale', icon: 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z' },
    { value: 'Residential Income', icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z' },
    { value: 'Land', icon: 'M9 6.75V15m0-8.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75m0-8.25A.75.75 0 0 0 8.25 7.5v6c0 .414.336.75.75.75m0 0h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H9m0 0H3.375a1.125 1.125 0 0 1-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H9m8.25 0h.375a1.125 1.125 0 0 1 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H17.25m0 0H20.625a1.125 1.125 0 0 0 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H17.25m0 0V7.5a.75.75 0 0 0-.75-.75h-.375' },
    { value: 'Business Opportunity', icon: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0' },
];

// Icon lookup for MLS-specific property types
const propertyTypeIcons: Record<string, string> = {
    'Residential': 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    'Condominium': 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
    'Commercial Sale': 'M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z',
    'Residential Income': 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
    'Land': 'M9 6.75V15m0-8.25a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75m0-8.25A.75.75 0 0 0 8.25 7.5v6c0 .414.336.75.75.75m0 0h.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H9m0 0H3.375a1.125 1.125 0 0 1-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125H9m8.25 0h.375a1.125 1.125 0 0 1 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H17.25m0 0H20.625a1.125 1.125 0 0 0 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H17.25m0 0V7.5a.75.75 0 0 0-.75-.75h-.375',
    'Business Opportunity': 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0',
    'Farm': 'M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636',
    'Mobile Home': 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75M3.375 14.25h-.375a3 3 0 0 1-3-3V8.25a3 3 0 0 1 3-3h16.5a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3h-.375',
};
const defaultPropertyTypeIcon = 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z';

const defaultListingStatuses = [
    { value: 'Active', color: '#22C55E' },
    { value: 'Pending', color: '#F59E0B' },
    { value: 'Active Under Contract', color: '#8B5CF6' },
    { value: 'Closed', color: '#1693C9' },
    { value: 'Expired', color: '#EF4444' },
    { value: 'Withdrawn', color: '#8B9096' },
    { value: 'Canceled', color: '#5F656D' },
    { value: 'Coming Soon', color: '#EC4899' },
];

const statusColors: Record<string, string> = {
    'Active': '#22C55E',
    'Pending': '#F59E0B',
    'Active Under Contract': '#8B5CF6',
    'Closed': '#1693C9',
    'Sold': '#1693C9',
    'Expired': '#EF4444',
    'Withdrawn': '#8B9096',
    'Canceled': '#5F656D',
    'Coming Soon': '#EC4899',
};

const regionColors: Record<string, { bg: string; text: string }> = {
    FL: { bg: '#FEF3C7', text: '#92400E' }, TX: { bg: '#DBEAFE', text: '#1E40AF' },
    CA: { bg: '#FEE2E2', text: '#991B1B' }, NY: { bg: '#E0E7FF', text: '#3730A3' },
    GA: { bg: '#FED7AA', text: '#9A3412' }, NC: { bg: '#CFFAFE', text: '#155E75' },
};
const defaultRegionColor = { bg: '#F3F4F6', text: '#5F656D' };

function getRegionAbbr(region: string): string {
    const match = region.match(/\b([A-Z]{2})\b/);
    return match ? match[1] : region.slice(0, 2).toUpperCase();
}

interface Props {
    connections: IdxConnection[];
    availableMlses: AvailableMls[];
}

export default function ConstraintsTab({ connections, availableMlses }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);

    if (connections.length === 0) {
        return (
            <div className="max-w-4xl">
                <div className="bg-white border border-[#E4E7EB] px-6 py-12 text-center">
                    <svg className="h-10 w-10 mx-auto text-[#D1D5DB] mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <p className="text-sm font-medium text-[#5F656D] mb-1">No MLS connections</p>
                    <p className="text-xs text-[#8B9096]">Connect an MLS first to configure data constraints</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-4">
            <div className="px-1">
                <p className="text-xs text-[#5F656D]">Set limitations on what MLS data is available for your widgets. Constraints apply globally to all widgets using each connection.</p>
            </div>

            {connections.map((conn) => {
                const mls = availableMlses.find((m) => m.slug === conn.mls_slug);
                const isEditing = editingId === conn.id;

                return (
                    <div key={conn.id} className="bg-white border border-[#E4E7EB] rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3.5">
                            {mls?.logo ? (
                                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-white border border-[#E4E7EB] overflow-hidden">
                                    <img src={mls.logo} alt={mls.name} className="h-7 w-7 object-contain" />
                                </div>
                            ) : (() => {
                                const abbr = mls?.region ? getRegionAbbr(mls.region) : conn.mls_slug.slice(0, 2).toUpperCase();
                                const rc = regionColors[abbr] || defaultRegionColor;
                                return (
                                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ backgroundColor: rc.bg, color: rc.text }}>{abbr}</div>
                                );
                            })()}
                            <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-[#111315]">{conn.display_name}</span>
                                <span className="text-[11px] text-[#8B9096] ml-2">{conn.mls_slug}</span>
                            </div>
                            <button
                                onClick={() => setEditingId(isEditing ? null : conn.id)}
                                className={`h-8 px-4 text-[13px] font-medium border rounded-lg transition-colors ${
                                    isEditing ? 'text-[#111315] border-[#111315] bg-[#F3F4F6]' : 'text-[#5F656D] border-[#E4E7EB] hover:bg-[#F3F4F6]'
                                }`}
                            >
                                {isEditing ? 'Close' : 'Configure'}
                            </button>
                        </div>

                        {!isEditing && <ConstraintsPreview constraints={conn.constraints} connection={conn} />}
                        {isEditing && <ConstraintsEditor connection={conn} mls={mls} onClose={() => setEditingId(null)} />}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Preview ────────────────────────────────────────────────

export function ConstraintsPreview({ constraints, connection }: { constraints: ConnectionConstraints | null; connection: IdxConnection }) {
    const c = constraints;
    const hasAny = c && (
        c.agent_only || c.office_only ||
        c.property_types?.length || c.statuses?.length ||
        c.cities?.length || c.postal_codes?.length ||
        c.min_price || c.max_price ||
        c.min_sqft || c.max_sqft ||
        c.min_year_built || c.max_year_built ||
        c.max_dom || c.keywords?.length || c.exclude_keywords?.length
    );

    if (!hasAny) {
        return (
            <div className="px-5 py-3 border-t border-[#E4E7EB] bg-[#FAFAFA]">
                <p className="text-xs text-[#8B9096]">No constraints — all MLS data is available</p>
            </div>
        );
    }

    return (
        <div className="px-5 py-3 border-t border-[#E4E7EB] bg-[#FAFAFA]">
            <div className="flex flex-wrap gap-2">
                {c!.agent_only && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EDE9FE] text-[#5B21B6] text-[11px] font-medium rounded">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" /></svg>
                        Agent only{connection.agent_id ? ` (${connection.agent_id})` : ''}
                    </span>
                )}
                {c!.office_only && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EDE9FE] text-[#5B21B6] text-[11px] font-medium rounded">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                        Office only{connection.office_id ? ` (${connection.office_id})` : ''}
                    </span>
                )}
                {c!.property_types?.map((pt) => (
                    <span key={pt} className="px-2.5 py-1 bg-[#DBEAFE] text-[#1E40AF] text-[11px] font-medium rounded">{pt}</span>
                ))}
                {c!.statuses?.map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-[#DCFCE7] text-[#166534] text-[11px] font-medium rounded">{s}</span>
                ))}
                {(c!.min_price || c!.max_price) && (
                    <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded">
                        Price: {c!.min_price ? `$${(c!.min_price / 1000).toFixed(0)}K` : '$0'} – {c!.max_price ? `$${(c!.max_price / 1000).toFixed(0)}K` : 'No max'}
                    </span>
                )}
                {(c!.min_sqft || c!.max_sqft) && (
                    <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded">
                        Sqft: {c!.min_sqft?.toLocaleString() || '0'} – {c!.max_sqft?.toLocaleString() || 'No max'}
                    </span>
                )}
                {(c!.min_year_built || c!.max_year_built) && (
                    <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded">
                        Built: {c!.min_year_built || 'Any'} – {c!.max_year_built || 'Any'}
                    </span>
                )}
                {c!.max_dom && (
                    <span className="px-2.5 py-1 bg-[#FEF3C7] text-[#92400E] text-[11px] font-medium rounded">Max {c!.max_dom} days on market</span>
                )}
                {c!.cities?.map((city) => (
                    <span key={city} className="px-2.5 py-1 bg-[#FCE7F3] text-[#9D174D] text-[11px] font-medium rounded">{city}</span>
                ))}
                {c!.postal_codes?.map((zip) => (
                    <span key={zip} className="px-2.5 py-1 bg-[#F3F4F6] text-[#5F656D] text-[11px] font-medium rounded">Zip: {zip}</span>
                ))}
                {c!.keywords?.map((kw) => (
                    <span key={kw} className="px-2.5 py-1 bg-[#D1FAE5] text-[#065F46] text-[11px] font-medium rounded">+ {kw}</span>
                ))}
                {c!.exclude_keywords?.map((kw) => (
                    <span key={kw} className="px-2.5 py-1 bg-[#FEE2E2] text-[#991B1B] text-[11px] font-medium rounded">- {kw}</span>
                ))}
            </div>
        </div>
    );
}

// ─── Editor ─────────────────────────────────────────────────

export function ConstraintsEditor({ connection, mls, onClose }: { connection: IdxConnection; mls: AvailableMls | undefined; onClose: () => void }) {
    const [constraints, setConstraints] = useState<ConnectionConstraints>(connection.constraints || {});
    const [saving, setSaving] = useState(false);
    const [cityInput, setCityInput] = useState('');
    const [zipInput, setZipInput] = useState('');
    const [kwInput, setKwInput] = useState('');
    const [exKwInput, setExKwInput] = useState('');

    function update(key: string, value: any) {
        setConstraints((prev) => ({ ...prev, [key]: value }));
    }

    function toggleArrayItem(key: 'property_types' | 'statuses', item: string) {
        const current = (constraints as any)[key] || [];
        const next = current.includes(item) ? current.filter((v: string) => v !== item) : [...current, item];
        update(key, next.length > 0 ? next : undefined);
    }

    function addTag(key: string, value: string, clear: () => void) {
        const v = value.trim();
        if (!v) return;
        const current = (constraints as any)[key] || [];
        if (!current.includes(v)) update(key, [...current, v]);
        clear();
    }

    function removeTag(key: string, value: string) {
        const next = ((constraints as any)[key] || []).filter((v: string) => v !== value);
        update(key, next.length > 0 ? next : undefined);
    }

    function save() {
        setSaving(true);
        const clean: Record<string, any> = {};
        const keys: (keyof ConnectionConstraints)[] = [
            'property_types', 'statuses', 'agent_only', 'office_only',
            'cities', 'postal_codes', 'min_price', 'max_price',
            'min_sqft', 'max_sqft', 'min_year_built', 'max_year_built',
            'max_dom', 'keywords', 'exclude_keywords',
        ];
        for (const k of keys) {
            const v = constraints[k];
            if (Array.isArray(v) && v.length > 0) clean[k] = v;
            else if (typeof v === 'boolean' && v) clean[k] = true;
            else if (typeof v === 'number' && v > 0) clean[k] = v;
        }

        router.patch(route('crm.idx.connections.update', connection.id), {
            constraints: Object.keys(clean).length > 0 ? clean : null,
        }, {
            preserveScroll: true,
            onFinish: () => setSaving(false),
            onSuccess: () => onClose(),
        });
    }

    return (
        <div className="border-t border-[#E4E7EB] px-5 py-5 space-y-6">

            {/* ── Listing Ownership ── */}
            {(connection.agent_id || connection.office_id) && (
                <section>
                    <h4 className="text-[12px] font-semibold text-[#111315] mb-1">Listing Ownership</h4>
                    <p className="text-[11px] text-[#8B9096] mb-3">Restrict data to only your agent or office listings</p>
                    <div className="flex flex-wrap gap-3">
                        {connection.agent_id && (
                            <button
                                type="button"
                                onClick={() => update('agent_only', !constraints.agent_only)}
                                className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg transition-colors ${
                                    constraints.agent_only
                                        ? 'border-[#111315] bg-[#F9FAFB]'
                                        : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'
                                }`}
                            >
                                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    constraints.agent_only ? 'border-[#111315] bg-[#111315]' : 'border-[#D1D5DB]'
                                }`}>
                                    {constraints.agent_only && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-medium text-[#111315]">Agent Listings Only</p>
                                    <p className="text-[11px] text-[#8B9096]">ID: {connection.agent_id}</p>
                                </div>
                            </button>
                        )}
                        {connection.office_id && (
                            <button
                                type="button"
                                onClick={() => update('office_only', !constraints.office_only)}
                                className={`flex items-center gap-3 px-4 py-3 border-2 rounded-lg transition-colors ${
                                    constraints.office_only
                                        ? 'border-[#111315] bg-[#F9FAFB]'
                                        : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'
                                }`}
                            >
                                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    constraints.office_only ? 'border-[#111315] bg-[#111315]' : 'border-[#D1D5DB]'
                                }`}>
                                    {constraints.office_only && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>}
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-medium text-[#111315]">Office Listings Only</p>
                                    <p className="text-[11px] text-[#8B9096]">ID: {connection.office_id}</p>
                                </div>
                            </button>
                        )}
                    </div>
                </section>
            )}

            {/* ── Property Types ── */}
            <section>
                <h4 className="text-[12px] font-semibold text-[#111315] mb-1">Property Types</h4>
                <p className="text-[11px] text-[#8B9096] mb-3">
                    Select which property types to include. Leave all unselected to allow everything.
                    {mls?.property_types && <span className="ml-1 text-[#5F656D]">({mls.name} types)</span>}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(mls?.property_types
                        ? mls.property_types.map((value) => ({ value, icon: propertyTypeIcons[value] || defaultPropertyTypeIcon }))
                        : defaultPropertyTypes
                    ).map(({ value, icon }) => {
                        const active = constraints.property_types?.includes(value);
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => toggleArrayItem('property_types', value)}
                                className={`flex items-center gap-3 px-3 py-2.5 border-2 rounded-lg transition-colors text-left ${
                                    active
                                        ? 'border-[#111315] bg-[#F9FAFB]'
                                        : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'
                                }`}
                            >
                                <svg className={`h-4 w-4 shrink-0 ${active ? 'text-[#111315]' : 'text-[#8B9096]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                                </svg>
                                <span className={`text-xs font-medium ${active ? 'text-[#111315]' : 'text-[#5F656D]'}`}>{value}</span>
                                {active && (
                                    <svg className="h-3.5 w-3.5 text-[#111315] ml-auto shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ── Listing Statuses ── */}
            <section>
                <h4 className="text-[12px] font-semibold text-[#111315] mb-1">Listing Statuses</h4>
                <p className="text-[11px] text-[#8B9096] mb-3">
                    Which listing statuses should be shown. Leave all unselected to allow everything.
                    {mls?.statuses && <span className="ml-1 text-[#5F656D]">({mls.name} statuses)</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                    {(mls?.statuses
                        ? mls.statuses.map((value) => ({ value, color: statusColors[value] || '#5F656D' }))
                        : defaultListingStatuses
                    ).map(({ value, color }) => {
                        const active = constraints.statuses?.includes(value);
                        return (
                            <button
                                key={value}
                                type="button"
                                onClick={() => toggleArrayItem('statuses', value)}
                                className={`flex items-center gap-2.5 px-4 py-2.5 border-2 rounded-lg transition-colors ${
                                    active
                                        ? 'border-[#111315] bg-[#F9FAFB]'
                                        : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'
                                }`}
                            >
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className={`text-xs font-medium ${active ? 'text-[#111315]' : 'text-[#5F656D]'}`}>{value}</span>
                                {active && (
                                    <svg className="h-3.5 w-3.5 text-[#111315] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ── Price & Size ── */}
            <section>
                <h4 className="text-[12px] font-semibold text-[#111315] mb-1">Price & Size Limits</h4>
                <p className="text-[11px] text-[#8B9096] mb-3">Set minimum and maximum bounds for price, square footage, and year built</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#E4E7EB] bg-[#F9FAFB]">
                            <p className="text-[12px] font-semibold text-[#374151]">Price Range</p>
                        </div>
                        <div className="p-3 space-y-2">
                            <div>
                                <label className="text-[10px] text-[#8B9096] mb-0.5 block">Minimum</label>
                                <div className="flex items-center border border-[#E4E7EB] bg-white rounded-lg overflow-hidden">
                                    <span className="px-2 text-xs text-[#8B9096] border-r border-[#E4E7EB] py-1.5 bg-[#F9FAFB]">$</span>
                                    <input type="number" value={constraints.min_price ?? ''} onChange={(e) => update('min_price', e.target.value ? parseInt(e.target.value) : null)} placeholder="No min" min={0} className="flex-1 h-8 px-2 text-xs text-[#111315] border-none focus:outline-none focus:ring-0" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-[#8B9096] mb-0.5 block">Maximum</label>
                                <div className="flex items-center border border-[#E4E7EB] bg-white rounded-lg overflow-hidden">
                                    <span className="px-2 text-xs text-[#8B9096] border-r border-[#E4E7EB] py-1.5 bg-[#F9FAFB]">$</span>
                                    <input type="number" value={constraints.max_price ?? ''} onChange={(e) => update('max_price', e.target.value ? parseInt(e.target.value) : null)} placeholder="No max" min={0} className="flex-1 h-8 px-2 text-xs text-[#111315] border-none focus:outline-none focus:ring-0" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#E4E7EB] bg-[#F9FAFB]">
                            <p className="text-[12px] font-semibold text-[#374151]">Square Footage</p>
                        </div>
                        <div className="p-3 space-y-2">
                            <div>
                                <label className="text-[10px] text-[#8B9096] mb-0.5 block">Minimum</label>
                                <div className="flex items-center border border-[#E4E7EB] bg-white rounded-lg overflow-hidden">
                                    <input type="number" value={constraints.min_sqft ?? ''} onChange={(e) => update('min_sqft', e.target.value ? parseInt(e.target.value) : null)} placeholder="No min" min={0} className="flex-1 h-8 px-2 text-xs text-[#111315] border-none focus:outline-none focus:ring-0" />
                                    <span className="px-2 text-xs text-[#8B9096] border-l border-[#E4E7EB] py-1.5 bg-[#F9FAFB]">sqft</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] text-[#8B9096] mb-0.5 block">Maximum</label>
                                <div className="flex items-center border border-[#E4E7EB] bg-white rounded-lg overflow-hidden">
                                    <input type="number" value={constraints.max_sqft ?? ''} onChange={(e) => update('max_sqft', e.target.value ? parseInt(e.target.value) : null)} placeholder="No max" min={0} className="flex-1 h-8 px-2 text-xs text-[#111315] border-none focus:outline-none focus:ring-0" />
                                    <span className="px-2 text-xs text-[#8B9096] border-l border-[#E4E7EB] py-1.5 bg-[#F9FAFB]">sqft</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#E4E7EB] bg-[#F9FAFB]">
                            <p className="text-[12px] font-semibold text-[#374151]">Year Built</p>
                        </div>
                        <div className="p-3 space-y-2">
                            <div>
                                <label className="text-[10px] text-[#8B9096] mb-0.5 block">From</label>
                                <input type="number" value={constraints.min_year_built ?? ''} onChange={(e) => update('min_year_built', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g. 1990" min={1800} max={2030} className="w-full h-8 px-2 text-xs border border-[#E4E7EB] rounded-lg text-[#111315] focus:outline-none focus:border-[#111315] focus:ring-0" />
                            </div>
                            <div>
                                <label className="text-[10px] text-[#8B9096] mb-0.5 block">To</label>
                                <input type="number" value={constraints.max_year_built ?? ''} onChange={(e) => update('max_year_built', e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g. 2025" min={1800} max={2030} className="w-full h-8 px-2 text-xs border border-[#E4E7EB] rounded-lg text-[#111315] focus:outline-none focus:border-[#111315] focus:ring-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Days on Market ── */}
            <section>
                <h4 className="text-[12px] font-semibold text-[#111315] mb-1">Days on Market</h4>
                <p className="text-[11px] text-[#8B9096] mb-3">Only show listings that have been on market for fewer than this many days</p>
                <div className="max-w-[200px]">
                    <div className="flex items-center border border-[#E4E7EB] bg-white rounded-lg overflow-hidden">
                        <input type="number" value={constraints.max_dom ?? ''} onChange={(e) => update('max_dom', e.target.value ? parseInt(e.target.value) : null)} placeholder="No limit" min={1} className="flex-1 h-8 px-3 text-xs text-[#111315] border-none focus:outline-none focus:ring-0" />
                        <span className="px-3 text-xs text-[#8B9096] border-l border-[#E4E7EB] py-1.5 bg-[#F9FAFB]">days</span>
                    </div>
                </div>
            </section>

            {/* ── Location ── */}
            <section>
                <h4 className="text-[12px] font-semibold text-[#111315] mb-1">Location Restrictions</h4>
                <p className="text-[11px] text-[#8B9096] mb-3">Restrict listings to specific cities or zip codes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#E4E7EB] bg-[#F9FAFB]">
                            <p className="text-[12px] font-semibold text-[#374151]">Allowed Cities</p>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-2">
                                <input type="text" value={cityInput} onChange={(e) => setCityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('cities', cityInput, () => setCityInput('')))} placeholder="Type city name..." className="flex-1 h-9 px-3 text-xs border border-[#E4E7EB] rounded-lg text-[#111315] placeholder-[#C4C9D1] focus:outline-none focus:border-[#111315] focus:ring-0" />
                                <button type="button" onClick={() => addTag('cities', cityInput, () => setCityInput(''))} className="h-9 px-4 text-xs font-medium text-white bg-[#111315] hover:bg-[#2a2d30] rounded-lg transition-colors shrink-0">Add</button>
                            </div>
                            {constraints.cities && constraints.cities.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {constraints.cities.map((city) => (
                                        <span key={city} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#F3F4F6] text-[#5F656D] text-xs font-medium rounded border border-[#E4E7EB]">
                                            {city}
                                            <button type="button" onClick={() => removeTag('cities', city)} className="h-4 w-4 flex items-center justify-center rounded text-[#8B9096] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-[#8B9096] mt-2">All cities allowed</p>
                            )}
                        </div>
                    </div>

                    <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#E4E7EB] bg-[#F9FAFB]">
                            <p className="text-[12px] font-semibold text-[#374151]">Allowed Zip Codes</p>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-2">
                                <input type="text" value={zipInput} onChange={(e) => setZipInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('postal_codes', zipInput, () => setZipInput('')))} placeholder="Type zip code..." className="flex-1 h-9 px-3 text-xs border border-[#E4E7EB] rounded-lg text-[#111315] placeholder-[#C4C9D1] focus:outline-none focus:border-[#111315] focus:ring-0" />
                                <button type="button" onClick={() => addTag('postal_codes', zipInput, () => setZipInput(''))} className="h-9 px-4 text-xs font-medium text-white bg-[#111315] hover:bg-[#2a2d30] rounded-lg transition-colors shrink-0">Add</button>
                            </div>
                            {constraints.postal_codes && constraints.postal_codes.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {constraints.postal_codes.map((zip) => (
                                        <span key={zip} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#F3F4F6] text-[#5F656D] text-xs font-medium rounded border border-[#E4E7EB]">
                                            {zip}
                                            <button type="button" onClick={() => removeTag('postal_codes', zip)} className="h-4 w-4 flex items-center justify-center rounded text-[#8B9096] hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-[#8B9096] mt-2">All zip codes allowed</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Keywords ── */}
            <section>
                <h4 className="text-[12px] font-semibold text-[#111315] mb-1">Keyword Filters</h4>
                <p className="text-[11px] text-[#8B9096] mb-3">Include or exclude listings matching specific keywords in the description</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#E4E7EB] bg-[#F0FDF4]">
                            <p className="text-[11px] font-semibold text-[#166534]">Include Keywords</p>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-2">
                                <input type="text" value={kwInput} onChange={(e) => setKwInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('keywords', kwInput, () => setKwInput('')))} placeholder="e.g. waterfront" className="flex-1 h-9 px-3 text-xs border border-[#E4E7EB] rounded-lg text-[#111315] placeholder-[#C4C9D1] focus:outline-none focus:border-[#111315] focus:ring-0" />
                                <button type="button" onClick={() => addTag('keywords', kwInput, () => setKwInput(''))} className="h-9 px-4 text-xs font-medium text-white bg-[#166534] hover:bg-[#15803D] rounded-lg transition-colors shrink-0">Add</button>
                            </div>
                            {constraints.keywords && constraints.keywords.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {constraints.keywords.map((kw) => (
                                        <span key={kw} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#DCFCE7] text-[#166534] text-xs font-medium rounded border border-[#BBF7D0]">
                                            {kw}
                                            <button type="button" onClick={() => removeTag('keywords', kw)} className="h-4 w-4 flex items-center justify-center rounded text-[#166534]/50 hover:text-[#EF4444] hover:bg-[#FEE2E2] transition-colors">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-[#8B9096] mt-2">No keyword filter</p>
                            )}
                        </div>
                    </div>

                    <div className="border border-[#E4E7EB] bg-white rounded-xl overflow-hidden">
                        <div className="px-3 py-2 border-b border-[#E4E7EB] bg-[#FEF2F2]">
                            <p className="text-[11px] font-semibold text-[#991B1B]">Exclude Keywords</p>
                        </div>
                        <div className="p-3">
                            <div className="flex items-center gap-2">
                                <input type="text" value={exKwInput} onChange={(e) => setExKwInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('exclude_keywords', exKwInput, () => setExKwInput('')))} placeholder="e.g. foreclosure" className="flex-1 h-9 px-3 text-xs border border-[#E4E7EB] rounded-lg text-[#111315] placeholder-[#C4C9D1] focus:outline-none focus:border-[#111315] focus:ring-0" />
                                <button type="button" onClick={() => addTag('exclude_keywords', exKwInput, () => setExKwInput(''))} className="h-9 px-4 text-xs font-medium text-white bg-[#991B1B] hover:bg-[#B91C1C] rounded-lg transition-colors shrink-0">Add</button>
                            </div>
                            {constraints.exclude_keywords && constraints.exclude_keywords.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {constraints.exclude_keywords.map((kw) => (
                                        <span key={kw} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-[#FEE2E2] text-[#991B1B] text-xs font-medium rounded border border-[#FECACA]">
                                            {kw}
                                            <button type="button" onClick={() => removeTag('exclude_keywords', kw)} className="h-4 w-4 flex items-center justify-center rounded text-[#991B1B]/50 hover:text-[#991B1B] hover:bg-[#FCA5A5] transition-colors">
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-[#8B9096] mt-2">No exclusions</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Save ── */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#E4E7EB]">
                <button onClick={save} disabled={saving} className="h-9 px-6 bg-[#111315] text-white text-xs font-medium hover:bg-[#2a2d30] disabled:opacity-30 rounded-lg transition-colors">
                    {saving ? 'Saving...' : 'Save Constraints'}
                </button>
                <button onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors">Cancel</button>
            </div>
        </div>
    );
}
