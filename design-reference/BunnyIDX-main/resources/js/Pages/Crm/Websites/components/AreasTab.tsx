import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useMlsTaxonomy } from '@/hooks/useMlsTaxonomy';
import CommunityEditor from './communities/CommunityEditor';
import { AreaData, LifestyleDef } from './communities/types';

interface AreasTabProps {
    websiteId: number;
    onActionChange: (action: { label: string; onClick: () => void } | null) => void;
}

/** Communities tab — card list matching the Pages tab design (drag to reorder).
    The page itself (nav label, header) is managed from the Pages tab — add it
    via Add Page → Communities. */
export default function AreasTab({ websiteId, onActionChange }: AreasTabProps) {
    const [areas, setAreas] = useState<AreaData[]>([]);
    const [mlsSlugs, setMlsSlugs] = useState<string[]>([]);
    const [mlsIntegrated, setMlsIntegrated] = useState(false);
    const [hotsheets, setHotsheets] = useState<{ id: number; name: string }[]>([]);
    const [lifestyles, setLifestyles] = useState<LifestyleDef[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<AreaData | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [dragId, setDragId] = useState<number | null>(null);

    const taxonomy = useMlsTaxonomy(mlsSlugs);
    const editorOpen = creating || editing !== null;

    async function fetchAreas() {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/website-editor/${websiteId}/areas`);
            setAreas(data.areas || []);
            setMlsSlugs(data.mls?.slugs || []);
            setMlsIntegrated(!!data.mls?.integrated);
            setHotsheets(data.hotsheets || []);
            setLifestyles(data.lifestyles || []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchAreas(); }, []);

    // The list stays mounted under the slide-over, so the action button is always available.
    useEffect(() => {
        onActionChange({ label: '+ New Community', onClick: () => { setEditing(null); setCreating(true); } });
        return () => onActionChange(null);
    }, []);

    function closeEditor() {
        setCreating(false);
        setEditing(null);
    }

    function afterSave() {
        closeEditor();
        fetchAreas();
    }

    async function handleDelete(areaId: number) {
        if (!confirm('Delete this community? This cannot be undone.')) return;
        setDeleting(areaId);
        try {
            await axios.delete(`/api/website-editor/${websiteId}/areas/${areaId}`);
            fetchAreas();
        } catch {
            // silent
        } finally {
            setDeleting(null);
        }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, areaId: number) {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        try {
            await axios.post(`/api/website-editor/${websiteId}/areas/${areaId}/image`, fd);
            fetchAreas();
        } catch {
            // silent
        }
    }

    // Drag-to-reorder, mirroring the Pages tab: live local reorder while dragging,
    // persist sort_order on drop.
    function reorderTo(overId: number) {
        if (dragId === null || dragId === overId) return;
        setAreas((prev) => {
            const from = prev.findIndex((a) => a.id === dragId);
            const to = prev.findIndex((a) => a.id === overId);
            if (from < 0 || to < 0) return prev;
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    }
    async function persistOrder() {
        if (dragId === null) return;
        setDragId(null);
        await axios.patch(`/api/website-editor/${websiteId}/areas-order`, { area_ids: areas.map((a) => a.id) });
    }

    function areaSummary(area: AreaData): string {
        const sc = area.search_criteria || {};
        const hotsheetId = Number(sc.hotsheet_id || 0);
        if (hotsheetId) {
            const h = hotsheets.find((x) => x.id === hotsheetId);
            return h ? `Saved search: ${h.name}` : 'Saved search';
        }
        const bits: string[] = [];
        const arr = (v: unknown) => (Array.isArray(v) ? v as string[] : []);
        const loc = [...arr(sc.cities), ...arr(sc.counties), ...arr(sc.neighborhoods)];
        if (loc.length) bits.push(loc.slice(0, 3).join(', ') + (loc.length > 3 ? `, +${loc.length - 3}` : ''));
        const zips = arr(sc.zips);
        if (zips.length) bits.push(`${zips.length} zip${zips.length > 1 ? 's' : ''}`);
        const plainDesc = (area.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return bits.join(' · ') || plainDesc || 'No filters set';
    }

    return (
        <>
        <div className="space-y-3">
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <svg className="animate-spin h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            ) : areas.length === 0 ? (
                <div className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] p-12 text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#E0F2FE] mb-3">
                        <svg className="h-5 w-5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                    </div>
                    <h4 className="text-sm font-semibold text-[#111315] mb-1">No communities yet</h4>
                    <p className="text-[12px] text-[#5F656D] mb-4">Add neighborhoods, cities or counties with MLS-powered listings for each.</p>
                    <button type="button" onClick={() => { setEditing(null); setCreating(true); }} className="h-8 px-4 bg-[#1693C9] text-white text-[12px] font-medium rounded-[4px] hover:bg-[#1380AF] transition-colors">
                        Add First Community
                    </button>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {areas.map((area) => {
                        const open = () => { setCreating(false); setEditing(area); };
                        return (
                            <div
                                key={area.id}
                                draggable
                                onDragStart={() => setDragId(area.id)}
                                onDragOver={(e) => { e.preventDefault(); reorderTo(area.id); }}
                                onDragEnd={persistOrder}
                                onDrop={persistOrder}
                                className={`group bg-white border border-[#E4E7EB] rounded-[4px] shadow-[0_1px_2px_-1px_rgba(17,19,21,0.12)] hover:shadow-[0_2px_3px_-1px_rgba(17,19,21,0.16)] hover:border-[#D1D5DB] transition-all flex items-center ${dragId === area.id ? 'opacity-40 ring-1 ring-[#1693C9]' : ''}`}
                            >
                                {/* Drag handle */}
                                <span className="shrink-0 pl-3 text-[#C4C9D1] hover:text-[#8B9096] cursor-grab active:cursor-grabbing" aria-label="Drag to reorder" title="Drag to reorder">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" /></svg>
                                </span>

                                {/* Cover image (hover to replace) */}
                                <div className="relative h-10 w-10 ml-3 rounded-[4px] bg-[#E0F2FE] overflow-hidden shrink-0">
                                    {area.image ? (
                                        <img src={/^https?:\/\//.test(area.image) ? area.image : `/storage/${area.image}`} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <svg className="h-4 w-4 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                                        </div>
                                    )}
                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" title="Replace cover image">
                                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, area.id)} />
                                    </label>
                                </div>

                                {/* Content + actions */}
                                <div className="flex-1 min-w-0 flex items-center gap-4 px-4 py-4">
                                    <div className="min-w-0 flex-1">
                                        <button type="button" onClick={open} className="block max-w-full text-left">
                                            <span className="inline-flex items-center gap-2 max-w-full">
                                                <span className="text-[15px] font-semibold text-[#111315] truncate hover:text-[#1693C9] transition-colors">{area.name}</span>
                                                {!area.is_active && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-[#F3F4F6] text-[#5F656D] shrink-0">Draft</span>
                                                )}
                                            </span>
                                        </button>
                                        <p className="text-[11px] text-[#8B9096] truncate mt-0.5">{areaSummary(area)}</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={open}
                                        className="h-8 px-3.5 text-[12px] font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors flex items-center gap-1.5 shrink-0"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(area.id)}
                                        disabled={deleting === area.id}
                                        className="h-8 px-3 text-[12px] font-medium text-[#DC2626] border border-[#F0C2C2] rounded-[4px] hover:bg-[#FEF2F2] transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-30"
                                    >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {editorOpen && (
            <CommunityEditor
                websiteId={websiteId}
                area={editing}
                mlsIntegrated={mlsIntegrated}
                taxonomy={taxonomy}
                hotsheets={hotsheets}
                lifestyles={lifestyles}
                onSaved={afterSave}
                onCancel={closeEditor}
                onDeleted={afterSave}
            />
        )}
        </>
    );
}
