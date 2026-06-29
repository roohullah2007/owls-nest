import type { IdxConnection, IdxSearch, License, IdxWidgetData } from '../Index';

const inputClass = 'block w-full h-9 px-3 text-sm border border-[#E4E7EB] bg-white text-[#111315] placeholder-[#C4C9D1] focus:outline-none focus:border-[#111315] focus:ring-0 rounded-lg';
const selectClass = 'block w-full h-9 pl-3 pr-10 text-sm border border-[#D1D5DB] bg-white text-[#111315] focus:outline-none focus:border-[#111315] focus:ring-0 rounded-lg appearance-none py-0 bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMS41IiBkPSJNNiA4bDQgNCA0LTQiLz48L3N2Zz4=")] bg-[right_0.5rem_center] bg-no-repeat bg-[length:1.5em_1.5em]';
const labelClass = 'block text-[12px] font-medium text-[#374151] mb-1.5';

interface Props {
    data: IdxWidgetData;
    setData: (key: string, value: any) => void;
    connections: IdxConnection[];
    searches: IdxSearch[];
    licenses: License[];
    errors: Record<string, string>;
    processing: boolean;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    isEdit?: boolean;
}

export default function WidgetForm({ data, setData, connections, searches, licenses, errors, processing, onSubmit, onCancel, isEdit }: Props) {
    return (
        <div className="bg-white border border-[#E4E7EB] p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#111315]">{isEdit ? 'Edit Widget' : 'New Widget'}</h3>
                <button onClick={onCancel} className="text-[#8B9096] hover:text-[#111315]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Widget Name</label>
                        <input type="text" value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="e.g. Homepage Property Grid" className={inputClass} />
                        {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Widget Type</label>
                        <select value={data.widget_type} onChange={(e) => setData('widget_type', e.target.value)} className={selectClass}>
                            <option value="grid">Property Grid</option>
                            <option value="carousel">Property Carousel</option>
                            <option value="map">Map View</option>
                            <option value="search_form">Search Form</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className={labelClass}>MLS</label>
                        <select value={data.mls_slug} onChange={(e) => setData('mls_slug', e.target.value)} className={selectClass}>
                            <option value="">Select MLS...</option>
                            {connections.filter((c) => c.is_active).map((c) => (
                                <option key={c.id} value={c.mls_slug}>{c.display_name}</option>
                            ))}
                        </select>
                        {errors.mls_slug && <p className="text-[11px] text-red-500 mt-1">{errors.mls_slug}</p>}
                    </div>
                    <div>
                        <label className={labelClass}>Linked Search <span className="normal-case text-[#8B9096]">(optional)</span></label>
                        <select value={data.idx_search_id || ''} onChange={(e) => setData('idx_search_id', e.target.value ? parseInt(e.target.value) : null)} className={selectClass}>
                            <option value="">None</option>
                            {searches.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>License <span className="normal-case text-[#8B9096]">(optional)</span></label>
                        <select value={data.license_id || ''} onChange={(e) => setData('license_id', e.target.value ? parseInt(e.target.value) : null)} className={selectClass}>
                            <option value="">None</option>
                            {licenses.filter((l) => l.status === 'active').map((l) => (
                                <option key={l.id} value={l.id}>{l.key}{l.active_domain ? ` (${l.active_domain.domain})` : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Type-specific config */}
                {data.widget_type === 'grid' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>Count</label>
                            <input type="number" value={data.config?.count ?? ''} onChange={(e) => setData('config', { ...data.config, count: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="9" min={1} max={50} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Columns</label>
                            <select value={data.config?.cols ?? ''} onChange={(e) => setData('config', { ...data.config, cols: e.target.value ? parseInt(e.target.value) : undefined })} className={selectClass}>
                                <option value="">Default (3)</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Pagination</label>
                            <select value={data.config?.showPagination ? 'true' : 'false'} onChange={(e) => setData('config', { ...data.config, showPagination: e.target.value === 'true' })} className={selectClass}>
                                <option value="false">Off</option>
                                <option value="true">On</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Load More</label>
                            <select value={data.config?.loadMore ? 'true' : 'false'} onChange={(e) => setData('config', { ...data.config, loadMore: e.target.value === 'true' })} className={selectClass}>
                                <option value="false">Off</option>
                                <option value="true">On</option>
                            </select>
                        </div>
                    </div>
                )}

                {data.widget_type === 'carousel' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>Count</label>
                            <input type="number" value={data.config?.count ?? ''} onChange={(e) => setData('config', { ...data.config, count: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="8" min={1} max={50} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Visible Slides</label>
                            <input type="number" value={data.config?.visibleSlides ?? ''} onChange={(e) => setData('config', { ...data.config, visibleSlides: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="3" min={1} max={6} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Autoplay</label>
                            <select value={data.config?.autoplay ? 'true' : 'false'} onChange={(e) => setData('config', { ...data.config, autoplay: e.target.value === 'true' })} className={selectClass}>
                                <option value="false">Off</option>
                                <option value="true">On</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Autoplay Speed (ms)</label>
                            <input type="number" value={data.config?.autoplaySpeed ?? ''} onChange={(e) => setData('config', { ...data.config, autoplaySpeed: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="5000" min={1000} max={15000} step={500} className={inputClass} />
                        </div>
                    </div>
                )}

                {data.widget_type === 'map' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className={labelClass}>Count</label>
                            <input type="number" value={data.config?.count ?? ''} onChange={(e) => setData('config', { ...data.config, count: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="50" min={1} max={200} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Default Zoom</label>
                            <input type="number" value={data.config?.defaultZoom ?? ''} onChange={(e) => setData('config', { ...data.config, defaultZoom: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="12" min={1} max={20} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>List Panel</label>
                            <select value={data.config?.showListPanel !== false ? 'true' : 'false'} onChange={(e) => setData('config', { ...data.config, showListPanel: e.target.value === 'true' })} className={selectClass}>
                                <option value="true">Show</option>
                                <option value="false">Hide</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Cluster Markers</label>
                            <select value={data.config?.clusterMarkers !== false ? 'true' : 'false'} onChange={(e) => setData('config', { ...data.config, clusterMarkers: e.target.value === 'true' })} className={selectClass}>
                                <option value="true">On</option>
                                <option value="false">Off</option>
                            </select>
                        </div>
                    </div>
                )}

                {data.widget_type === 'search_form' && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Submit Action</label>
                            <select value={data.config?.submitAction || 'filter_in_place'} onChange={(e) => setData('config', { ...data.config, submitAction: e.target.value })} className={selectClass}>
                                <option value="filter_in_place">Filter In Place</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Show Result Count</label>
                            <select value={data.config?.showResultCount !== false ? 'true' : 'false'} onChange={(e) => setData('config', { ...data.config, showResultCount: e.target.value === 'true' })} className={selectClass}>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                    <button
                        type="submit"
                        disabled={!data.name || !data.mls_slug || processing}
                        className="h-9 px-6 bg-[#111315] text-white text-xs font-medium hover:bg-[#2a2d30] disabled:opacity-30 rounded-full transition-colors"
                    >
                        {isEdit ? 'Update Widget' : 'Save Widget'}
                    </button>
                    <button type="button" onClick={onCancel} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
