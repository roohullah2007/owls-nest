import Avatar from '@/Components/Crm/Avatar';
import type { MlsListing } from '../types';
import { formatDate, formatPrice, formatStatusLabel, getStatusColors, getTypeColors, stateName } from '../utils';
import TintBadge from './TintBadge';

interface Props {
    listing: MlsListing;
    colKey: string;
    onOpenLightbox: (photos: string[], index: number) => void;
    onOpenDetail: (mlsId: string) => void;
}

/**
 * Renders a single cell of the MLS results table. One component per column
 * keeps the page-level table loop tiny and lets us evolve each cell type
 * (badges, agent profile, etc.) in isolation.
 */
export default function MlsCell({ listing: ml, colKey, onOpenLightbox, onOpenDetail }: Props) {
    switch (colKey) {
        case 'photo':
            return ml.photos?.[0] ? (
                <img
                    src={ml.photos[0]}
                    alt=""
                    style={{ width: 64, height: 40, minWidth: 64, minHeight: 40 }}
                    className="object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onOpenLightbox(ml.photos, 0); }}
                />
            ) : (
                <div style={{ width: 64, height: 40, minWidth: 64, minHeight: 40 }} className="bg-[#F3F4F6] rounded flex items-center justify-center">
                    <svg className="h-4 w-4 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5" />
                    </svg>
                </div>
            );

        case 'address':
            return (
                <button
                    onClick={(e) => { e.stopPropagation(); onOpenDetail(ml.mls_id); }}
                    className="text-[13px] font-medium text-[#111315] hover:underline truncate text-left"
                >
                    {ml.address?.full || '—'}
                </button>
            );

        case 'type':
            return ml.property_type
                ? <TintBadge label={ml.property_type} color={getTypeColors(ml.property_type).bg} />
                : <Dash />;

        case 'subtype': {
            if (!ml.property_subtype) return <Dash />;
            const tc = ml.property_type ? getTypeColors(ml.property_type) : { bg: '#5F656D', text: '#FFFFFF' };
            return <TintBadge label={ml.property_subtype} color={tc.bg} title={ml.property_subtype} />;
        }

        case 'status':
            return ml.status
                ? <TintBadge label={formatStatusLabel(ml.status)} color={getStatusColors(ml.status).bg} />
                : <Dash />;

        case 'price':       return <Muted className="font-medium">{formatPrice(ml.price)}</Muted>;
        case 'beds':        return <Muted>{ml.bedrooms ?? '—'}</Muted>;
        case 'full_baths':  return <Muted>{ml.bathrooms_full ?? ml.bathrooms ?? '—'}</Muted>;
        case 'half_baths':  return <Muted>{ml.bathrooms_half ?? '—'}</Muted>;
        case 'sqft':        return <Muted>{ml.sqft ? ml.sqft.toLocaleString() : '—'}</Muted>;
        case 'lot':         return <Muted>{ml.lot_sqft ? ml.lot_sqft.toLocaleString() : '—'}</Muted>;
        case 'year_built':  return <Muted>{ml.year_built ?? '—'}</Muted>;
        case 'dom':         return <Muted>{ml.days_on_market ?? '—'}</Muted>;
        case 'photos_count':return <Muted>{ml.photo_count ?? ml.photos?.length ?? 0}</Muted>;
        case 'mls_number':  return <Muted className="whitespace-nowrap">{ml.mls_number || '—'}</Muted>;
        case 'listed':      return <Muted>{ml.list_date ? formatDate(ml.list_date) : '—'}</Muted>;
        case 'state':       return <Muted className="whitespace-nowrap">{stateName(ml.address?.state_province) || '—'}</Muted>;

        case 'subdivision':
            return <span className="text-xs text-[#5F656D] truncate block max-w-[180px]" title={ml.subdivision || undefined}>{ml.subdivision || '—'}</span>;

        case 'city':
            return <Muted className="whitespace-nowrap">{[ml.address?.city, ml.address?.state_province].filter(Boolean).join(', ') || '—'}</Muted>;

        case 'list_agent':  return <AgentCell listing={ml} />;
        case 'list_office': return <OfficeCell listing={ml} />;

        default:
            return null;
    }
}

// ─── Small shared bits ──────────────────────────────────────────────

function Dash() {
    return <span className="text-xs text-[#8B9096]">—</span>;
}

function Muted({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <span className={`text-xs text-[#5F656D] ${className}`}>{children}</span>;
}

/** Coerce null/undefined/empty/whitespace to null. */
function clean(v: unknown): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

function AgentCell({ listing: ml }: { listing: MlsListing }) {
    const agent = ml.listing_agent;
    const name = clean(agent?.name ?? ml.list_agent_name);
    const email = clean(agent?.email ?? ml.list_agent_email);
    const phone = clean(agent?.phone ?? ml.list_agent_phone);
    const agentId = clean(agent?.mls_id ?? ml.list_agent_id);
    if (!name && !email && !phone) return <Dash />;
    const seed = Array.from((agentId || name || 'agent')).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return (
        <div className="flex items-center gap-2 min-w-0">
            <Avatar id={seed} name={name || '—'} size="sm" />
            <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-[#111315] truncate" title={name || undefined}>{name || '—'}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                    {email && (
                        <a href={`mailto:${email}`} onClick={(e) => e.stopPropagation()} title={email} className="text-[#5F656D] hover:text-[#1693C9] transition-colors">
                            <EmailIcon />
                        </a>
                    )}
                    {phone && (
                        <a href={`tel:${phone}`} onClick={(e) => e.stopPropagation()} title={phone} className="text-[#5F656D] hover:text-[#1693C9] transition-colors">
                            <PhoneIcon />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

function OfficeCell({ listing: ml }: { listing: MlsListing }) {
    const agent = ml.listing_agent;
    const officeName = clean(agent?.office_name ?? ml.list_office_name);
    const officePhone = clean(agent?.office_phone ?? ml.list_office_phone);
    if (!officeName && !officePhone) return <Dash />;
    return (
        <div className="min-w-0">
            <div className="text-[12px] font-medium text-[#111315] truncate" title={officeName || undefined}>{officeName || '—'}</div>
            {officePhone && (
                <a href={`tel:${officePhone}`} onClick={(e) => e.stopPropagation()} title={officePhone} className="inline-flex text-[#5F656D] hover:text-[#1693C9] transition-colors mt-0.5">
                    <PhoneIcon />
                </a>
            )}
        </div>
    );
}

function EmailIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
    );
}

function PhoneIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        </svg>
    );
}
