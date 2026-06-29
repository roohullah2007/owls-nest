import type { MlsListing } from '../types';
import { formatDate, formatPrice, joinField } from '../utils';

interface Props {
    listing: MlsListing;
    colSpan: number;
    onOpenLightbox: (photos: string[], index: number) => void;
}

/**
 * Expanded detail row content for an MLS listing in the table view.
 * Rendered inside a <tr><td colSpan> by the table.
 */
export default function MlsExpandedDetails({ listing: ml, colSpan, onOpenLightbox }: Props) {
    return (
        <tr className="border-b border-[#E4E7EB] bg-[#FAFAFA]">
            <td colSpan={colSpan} className="px-6 py-5">
                {ml.photos.length > 0 && <PhotoStrip photos={ml.photos} photoCount={ml.photo_count} onOpenLightbox={onOpenLightbox} />}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        {ml.subdivision && (
                            <p className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-0.5">{ml.subdivision}</p>
                        )}
                        <h4 className="text-sm font-semibold text-[#111315]">{ml.address?.full}</h4>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                        <p className="text-base font-bold text-[#111315]">{formatPrice(ml.price)}</p>
                        {ml.price_per_sqft != null && (
                            <p className="text-[11px] text-[#8B9096]">${ml.price_per_sqft.toLocaleString()}/sqft</p>
                        )}
                    </div>
                </div>

                {/* Key stats */}
                <div className="flex items-center gap-5 mb-4 text-xs text-[#5F656D]">
                    {ml.bedrooms != null && <span><strong>{ml.bedrooms}</strong> Beds</span>}
                    {ml.bathrooms != null && (
                        <span><strong>{ml.bathrooms}</strong> Baths{ml.bathrooms_half ? ` (${ml.bathrooms_half} half)` : ''}</span>
                    )}
                    {ml.sqft != null && <span><strong>{ml.sqft.toLocaleString()}</strong> Sq.Ft</span>}
                    {ml.lot_sqft != null && <span><strong>{ml.lot_sqft.toLocaleString()}</strong> Lot Sq.Ft</span>}
                    {ml.garage_spaces != null && ml.garage_spaces > 0 && <span><strong>{ml.garage_spaces}</strong> Garage</span>}
                    {ml.stories != null && <span><strong>{ml.stories}</strong> {ml.stories === 1 ? 'Story' : 'Stories'}</span>}
                </div>

                <Section title="Facts">
                    <div className="grid grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-2 text-xs">
                        <Fact label="MLS #" value={ml.mls_number} />
                        <Fact label="Type" value={`${ml.property_type}${ml.property_subtype ? ` — ${ml.property_subtype}` : ''}`} />
                        {ml.style && <Fact label="Style" value={joinField(ml.style)} />}
                        <Fact label="Year Built" value={ml.year_built || '—'} />
                        {joinField(ml.construction) && <Fact label="Construction" value={joinField(ml.construction)} />}
                        {joinField(ml.roof) && <Fact label="Roof" value={joinField(ml.roof)} />}
                        {ml.address?.county && <Fact label="County" value={ml.address.county} />}
                        <Fact label="Days on Market" value={ml.days_on_market ?? '—'} />
                        <Fact label="Listed" value={ml.list_date ? formatDate(ml.list_date) : '—'} />
                        {ml.sold_date && <Fact label="Sold" value={formatDate(ml.sold_date)} />}
                        {ml.sold_price != null && <Fact label="Sold Price" value={formatPrice(ml.sold_price)} />}
                        <Fact label="Photos" value={ml.photo_count} />
                    </div>
                </Section>

                {ml.description && (
                    <Section title="Description">
                        <p className="text-xs text-[#5F656D] leading-relaxed line-clamp-4">{ml.description}</p>
                    </Section>
                )}

                {/* Interior + Exterior */}
                <div className="grid grid-cols-2 gap-6">
                    <InteriorBlock listing={ml} />
                    <ExteriorBlock listing={ml} />
                </div>

                {/* Financial + Agent */}
                <div className="grid grid-cols-2 gap-6 mt-4">
                    <FinancialBlock listing={ml} />
                    <ListingAgentBlock listing={ml} />
                </div>

                {ml.virtual_tour_url && (
                    <div className="mt-4 pt-3 border-t border-[#E4E7EB]">
                        <a
                            href={ml.virtual_tour_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1693C9] hover:underline"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            Virtual Tour
                        </a>
                    </div>
                )}
            </td>
        </tr>
    );
}

function PhotoStrip({ photos, photoCount, onOpenLightbox }: { photos: string[]; photoCount: number; onOpenLightbox: (photos: string[], i: number) => void }) {
    return (
        <div className="flex gap-2 overflow-x-auto mb-5">
            {photos.slice(0, 8).map((photo, i) => (
                <img
                    key={i}
                    src={photo}
                    alt=""
                    className="w-36 h-24 object-cover shrink-0 rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onOpenLightbox(photos, i)}
                />
            ))}
            {photoCount > 8 && (
                <button
                    onClick={() => onOpenLightbox(photos, 8)}
                    className="w-36 h-24 bg-[#F3F4F6] flex items-center justify-center shrink-0 rounded hover:bg-[#E4E7EB] transition-colors cursor-pointer"
                >
                    <span className="text-xs text-[#5F656D] font-medium">+{photoCount - 8} more</span>
                </button>
            )}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-t border-[#E4E7EB] pt-4 mb-4">
            <h5 className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">{title}</h5>
            {children}
        </div>
    );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <span className="text-[#8B9096]">{label}</span>
            <p className="text-[#5F656D] font-medium mt-0.5">{value}</p>
        </div>
    );
}

function KeyValueRow({ label, value }: { label: string; value: React.ReactNode }) {
    return <div><span className="text-[#8B9096]">{label}: </span><span className="text-[#5F656D]">{value}</span></div>;
}

function InteriorBlock({ listing: ml }: { listing: MlsListing }) {
    const hasInterior = ml.features?.length > 0 || joinField(ml.flooring) || joinField(ml.cooling) || joinField(ml.heating) || ml.appliances?.length > 0 || ml.furnished;
    if (!hasInterior) return null;

    return (
        <div className="border-t border-[#E4E7EB] pt-4">
            <h5 className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Interior</h5>
            <div className="space-y-1.5 text-xs">
                {ml.features?.length > 0 && <KeyValueRow label="Features" value={ml.features.join(', ')} />}
                {ml.appliances?.length > 0 && <KeyValueRow label="Appliances" value={ml.appliances.join(', ')} />}
                {joinField(ml.flooring) && <KeyValueRow label="Flooring" value={joinField(ml.flooring)} />}
                {joinField(ml.cooling) && <KeyValueRow label="Cooling" value={joinField(ml.cooling)} />}
                {joinField(ml.heating) && <KeyValueRow label="Heating" value={joinField(ml.heating)} />}
                {ml.furnished && <KeyValueRow label="Furnished" value={joinField(ml.furnished)} />}
                {ml.fireplaces != null && ml.fireplaces > 0 && <KeyValueRow label="Fireplaces" value={ml.fireplaces} />}
            </div>
        </div>
    );
}

function ExteriorBlock({ listing: ml }: { listing: MlsListing }) {
    const hasExterior = ml.exterior_features?.length > 0 || ml.pool || ml.waterfront || joinField(ml.view) || joinField(ml.parking);
    if (!hasExterior) return null;

    return (
        <div className="border-t border-[#E4E7EB] pt-4">
            <h5 className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Exterior</h5>
            <div className="space-y-1.5 text-xs">
                {ml.exterior_features?.length > 0 && <KeyValueRow label="Features" value={ml.exterior_features.join(', ')} />}
                {ml.waterfront && (
                    <KeyValueRow label="Waterfront" value={`Yes${joinField(ml.waterfront_features) ? ` — ${joinField(ml.waterfront_features)}` : ''}`} />
                )}
                {ml.pool && (
                    <KeyValueRow label="Pool" value={`Yes${joinField(ml.pool_features) ? ` — ${joinField(ml.pool_features)}` : ''}`} />
                )}
                {joinField(ml.view) && <KeyValueRow label="View" value={joinField(ml.view)} />}
                {joinField(ml.parking) && <KeyValueRow label="Parking" value={joinField(ml.parking)} />}
                {ml.garage_spaces != null && ml.garage_spaces > 0 && <KeyValueRow label="Garage" value={`${ml.garage_spaces} spaces`} />}
            </div>
        </div>
    );
}

function FinancialBlock({ listing: ml }: { listing: MlsListing }) {
    if (ml.hoa_fee == null && ml.tax_amount == null) return null;

    return (
        <div className="border-t border-[#E4E7EB] pt-4">
            <h5 className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Financial</h5>
            <div className="space-y-1.5 text-xs">
                {ml.hoa_fee != null && (
                    <KeyValueRow label="HOA Fee" value={`$${ml.hoa_fee.toLocaleString()}${ml.hoa_frequency ? `/${ml.hoa_frequency}` : ''}`} />
                )}
                {ml.tax_amount != null && (
                    <KeyValueRow label="Tax" value={`$${ml.tax_amount.toLocaleString()}/yr${ml.tax_year ? ` (${ml.tax_year})` : ''}`} />
                )}
            </div>
        </div>
    );
}

function ListingAgentBlock({ listing: ml }: { listing: MlsListing }) {
    if (!ml.list_agent_name && !ml.list_office_name) return null;

    return (
        <div className="border-t border-[#E4E7EB] pt-4">
            <h5 className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-2">Listing Agent</h5>
            <div className="space-y-1.5 text-xs">
                {ml.list_agent_name && <KeyValueRow label="Agent" value={<span className="text-[#5F656D] font-medium">{ml.list_agent_name}</span>} />}
                {ml.list_office_name && <KeyValueRow label="Office" value={ml.list_office_name} />}
            </div>
        </div>
    );
}
