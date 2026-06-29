import type { IdxConnection, IdxSearchData } from '../Index';
import { inputClass, selectClass, labelClass, cardTitleClass, btnPrimary } from '../../constants';

const propertyTypes = ['Residential', 'Condominium', 'Commercial', 'Land', 'Multi-Family', 'Rental'];
const statuses = ['Active', 'Pending', 'Sold', 'Expired', 'Withdrawn'];

interface Props {
    data: IdxSearchData;
    setData: (key: string, value: any) => void;
    setFilterData: (key: string, value: any) => void;
    connections: IdxConnection[];
    errors: Record<string, string>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    isEdit?: boolean;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#F9FAFB] border border-[#E4E7EB] rounded-xl p-4">
            <h4 className={`${cardTitleClass} mb-3`}>{title}</h4>
            {children}
        </div>
    );
}

export default function SearchForm({ data, setData, setFilterData, connections, errors, processing, onSubmit, onCancel, isEdit }: Props) {
    const filters = data.filters || {};

    return (
        <div className="bg-white border border-[#E4E7EB] rounded-xl p-4 sm:p-6 mb-5">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-[13px] font-semibold text-[#111315]">{isEdit ? 'Edit Search' : 'New Search'}</h3>
                <button onClick={onCancel} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors rounded-lg hover:bg-[#F3F4F6]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
                {/* Basic Info */}
                <SectionCard title="Basic Information">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>Search Name</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. Miami Luxury Homes"
                                className={inputClass}
                            />
                            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>MLS Connection</label>
                            <select value={data.mls_slug} onChange={(e) => setData('mls_slug', e.target.value)} className={selectClass}>
                                <option value="">Select MLS...</option>
                                {connections.filter((c) => c.is_active).map((c) => (
                                    <option key={c.id} value={c.mls_slug}>{c.display_name}</option>
                                ))}
                            </select>
                            {errors.mls_slug && <p className="text-[11px] text-red-500 mt-1">{errors.mls_slug}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Results Per Page</label>
                            <input
                                type="number"
                                value={data.per_page}
                                onChange={(e) => setData('per_page', parseInt(e.target.value) || 20)}
                                min={1}
                                max={100}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Location */}
                <SectionCard title="Location">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>City</label>
                            <input
                                type="text"
                                value={filters.city || ''}
                                onChange={(e) => setFilterData('city', e.target.value || null)}
                                placeholder="e.g. Miami"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>State / Province</label>
                            <input
                                type="text"
                                value={filters.state_province || ''}
                                onChange={(e) => setFilterData('state_province', e.target.value || null)}
                                placeholder="e.g. FL"
                                maxLength={10}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Zip Code</label>
                            <input
                                type="text"
                                value={filters.postal_code || ''}
                                onChange={(e) => setFilterData('postal_code', e.target.value || null)}
                                placeholder="e.g. 33131"
                                className={inputClass}
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Price & Beds/Baths */}
                <SectionCard title="Price & Rooms">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>Min Price</label>
                            <input
                                type="number"
                                value={filters.min_price ?? ''}
                                onChange={(e) => setFilterData('min_price', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="0"
                                min={0}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Max Price</label>
                            <input
                                type="number"
                                value={filters.max_price ?? ''}
                                onChange={(e) => setFilterData('max_price', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="No max"
                                min={0}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Min Beds</label>
                            <input
                                type="number"
                                value={filters.min_beds ?? ''}
                                onChange={(e) => setFilterData('min_beds', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Any"
                                min={0}
                                max={20}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Min Baths</label>
                            <input
                                type="number"
                                value={filters.min_baths ?? ''}
                                onChange={(e) => setFilterData('min_baths', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Any"
                                min={0}
                                max={20}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Sqft, Type & Status */}
                <SectionCard title="Property Details">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>Min Sqft</label>
                            <input
                                type="number"
                                value={filters.min_sqft ?? ''}
                                onChange={(e) => setFilterData('min_sqft', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Any"
                                min={0}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Max Sqft</label>
                            <input
                                type="number"
                                value={filters.max_sqft ?? ''}
                                onChange={(e) => setFilterData('max_sqft', e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="No max"
                                min={0}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Property Type</label>
                            <select
                                value={filters.property_type || ''}
                                onChange={(e) => setFilterData('property_type', e.target.value || null)}
                                className={inputClass}
                            >
                                <option value="">Any</option>
                                {propertyTypes.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) => setFilterData('status', e.target.value || null)}
                                className={inputClass}
                            >
                                <option value="">Any</option>
                                {statuses.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </SectionCard>

                {/* Agent / Office / Keyword */}
                <SectionCard title="Advanced Filters">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>Agent ID <span className="text-[#8B9096] font-normal">(optional)</span></label>
                            <input
                                type="text"
                                value={filters.agent_id || ''}
                                onChange={(e) => setFilterData('agent_id', e.target.value || null)}
                                placeholder="MLS agent ID"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Office ID <span className="text-[#8B9096] font-normal">(optional)</span></label>
                            <input
                                type="text"
                                value={filters.office_id || ''}
                                onChange={(e) => setFilterData('office_id', e.target.value || null)}
                                placeholder="MLS office ID"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Keyword <span className="text-[#8B9096] font-normal">(optional)</span></label>
                            <input
                                type="text"
                                value={filters.query || ''}
                                onChange={(e) => setFilterData('query', e.target.value || null)}
                                placeholder="e.g. waterfront"
                                className={inputClass}
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Sorting */}
                <SectionCard title="Sorting">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Sort By</label>
                            <select value={data.sort_by} onChange={(e) => setData('sort_by', e.target.value)} className={selectClass}>
                                <option value="modification_ts">Last Modified</option>
                                <option value="list_price">Price</option>
                                <option value="list_date">List Date</option>
                                <option value="sqft">Square Feet</option>
                                <option value="beds_total">Bedrooms</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Sort Direction</label>
                            <select value={data.sort_dir} onChange={(e) => setData('sort_dir', e.target.value)} className={selectClass}>
                                <option value="desc">Descending</option>
                                <option value="asc">Ascending</option>
                            </select>
                        </div>
                    </div>
                </SectionCard>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        type="submit"
                        disabled={!data.name || !data.mls_slug || processing}
                        className={btnPrimary}
                    >
                        {isEdit ? 'Update Search' : 'Save Search'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-9 px-4 text-[13px] font-medium rounded-lg text-[#5F656D] hover:text-[#111315] hover:bg-[#F3F4F6] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
