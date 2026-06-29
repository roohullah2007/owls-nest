import { useEffect, useState } from 'react';
import axios from 'axios';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import { ColorRow } from './TeamEditorModal';

interface Dataset { slug: string; name: string }

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

/**
 * Featured Listings editor. Layout + listings source. "Own Listings" is a manual
 * repeater (default). "MLS" pulls live listings (whole MLS / Hotsheet / Office /
 * Agent) across every connected MLS, and is only available once the agent has
 * connected one — otherwise we prompt them to connect.
 */
export default function FeaturedEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const [variant, setVariant] = useState<'showcase' | 'slider' | 'grid'>(
        (['showcase', 'slider', 'grid'] as const).includes(block.data.variant as never) ? (block.data.variant as 'showcase' | 'slider' | 'grid') : 'showcase',
    );
    const [title, setTitle] = useState<string>(block.data.title ?? 'Featured Properties');
    const [viewLabel, setViewLabel] = useState<string>(block.data.view_all_label || '');
    const [viewLink, setViewLink] = useState<string>(block.data.view_all_link || '');
    const [bgColor, setBgColor] = useState<string>(block.data.bg_color || '');
    const [fontColor, setFontColor] = useState<string>(block.data.font_color || '');

    // Default to MLS unless the agent explicitly chose their own properties.
    // (A real connection is confirmed below; if there is none, we drop back to own.)
    const [source, setSource] = useState<'own' | 'mls'>(block.data.source === 'own' ? 'own' : 'mls');
    const [limit, setLimit] = useState<string>(block.data.limit || block.data.mls_limit || '12');
    const [mlsMode, setMlsMode] = useState<'office' | 'agent' | 'datasets' | 'hotsheet'>(
        (['office', 'agent', 'datasets', 'hotsheet'] as const).includes(block.data.mls_mode as never) ? (block.data.mls_mode as 'office' | 'agent' | 'datasets' | 'hotsheet') : 'datasets',
    );
    const [mlsOfficeIds, setMlsOfficeIds] = useState<string>(block.data.mls_office_ids || '');
    const [mlsAgentIds, setMlsAgentIds] = useState<string>(block.data.mls_agent_ids || '');
    const [mlsHotsheetId, setMlsHotsheetId] = useState<string>(block.data.mls_hotsheet_id || '');

    const [connections, setConnections] = useState<Dataset[] | null>(null);
    const [hotsheets, setHotsheets] = useState<{ id: number; name: string; scope: string }[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState<'content' | 'layout' | 'styles'>('content');
    const TABS = ['content', 'layout', 'styles'] as const;

    useEffect(() => {
        let alive = true;
        axios.get(`/api/website-editor/${websiteId}/hotsheets`)
            .then((res) => { if (alive) setHotsheets((res.data?.hotsheets || []) as { id: number; name: string; scope: string }[]); })
            .catch(() => { if (alive) setHotsheets([]); });
        return () => { alive = false; };
    }, [websiteId]);

    useEffect(() => {
        let alive = true;
        axios.get('/api/v1/mls/connections')
            .then((res) => {
                if (!alive) return;
                const ds = (res.data?.datasets || res.data?.connections || res.data?.data || []) as Dataset[];
                setConnections(ds);
                // We optimistically default to MLS; if there's no connection and the
                // user hasn't explicitly chosen MLS, fall back to their own properties.
                const saved = block.data.source;
                if (ds.length === 0 && saved !== 'mls') {
                    setSource('own');
                }
            })
            .catch(() => { if (alive) setConnections([]); });
        return () => { alive = false; };
    }, [block.data.source]);

    const hasMls = (connections?.length ?? 0) > 0;

    async function handleSave() {
        setSaving(true);
        try {
            const effectiveSource = source === 'mls' && hasMls ? 'mls' : 'own';
            await api.updateBlock(websiteId, page, block.id, {
                variant,
                title,
                view_all_label: viewLabel,
                view_all_link: viewLink,
                bg_color: bgColor,
                font_color: fontColor,
                source: effectiveSource,
                limit,
                mls_mode: mlsMode,
                mls_office_ids: mlsOfficeIds,
                mls_agent_ids: mlsAgentIds,
                mls_hotsheet_id: mlsHotsheetId,
            });
            onSaved();
        } finally {
            setSaving(false);
        }
    }

    const footer = (
        <>
            <button type="button" onClick={onClose} className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors">
                {saving ? 'Saving…' : 'Save'}
            </button>
        </>
    );

    return (
        <SlideOverModal title="Edit Featured Listings" onClose={onClose} footer={footer} width={460}>
            {/* Tab bar */}
            <div className="flex shrink-0 border-b border-[#E4E7EB] px-4 bg-white">
                {TABS.map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                        className={`relative px-3 py-2.5 text-[13px] font-medium capitalize transition-colors ${tab === t ? 'text-[#1693C9]' : 'text-[#5F656D] hover:text-[#111315]'}`}>
                        {t}
                        {tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-[#1693C9] rounded-full" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {/* ── CONTENT ── */}
                {tab === 'content' && (
                    <>
                        <div>
                            <FieldLabel>Heading</FieldLabel>
                            <input type="text" className={formInputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Featured Properties" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><FieldLabel>&ldquo;View All&rdquo; Label</FieldLabel><input type="text" className={formInputClass} value={viewLabel} onChange={(e) => setViewLabel(e.target.value)} placeholder="View All" /></div>
                            <div><FieldLabel>&ldquo;View All&rdquo; Link</FieldLabel><input type="text" className={formInputClass} value={viewLink} onChange={(e) => setViewLink(e.target.value)} placeholder="Defaults to the Property Search page" /></div>
                        </div>
                    </>
                )}

                {/* ── LAYOUT ── */}
                {tab === 'layout' && (
                    <div>
                        <FieldLabel>Style</FieldLabel>
                        <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                            {([['showcase', 'Showcase'], ['slider', 'Slider'], ['grid', 'Grid']] as const).map(([val, label]) => (
                                <button key={val} type="button" onClick={() => setVariant(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${variant === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── LISTINGS SOURCE (data — Content tab) ── */}
                {tab === 'content' && (
                        <div className="border-t border-[#E4E7EB] pt-4">
                            <FieldLabel>Listings Source</FieldLabel>
                            <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                {([['mls', 'MLS'], ['own', 'My Properties']] as const).map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setSource(val)} className={`h-7 px-4 text-[12px] font-medium rounded-[3px] transition-colors ${source === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                ))}
                            </div>

                            {source === 'own' && (
                                <div className="mt-3 rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                                    <p className="text-[12px] text-[#111315] font-medium">Pulled from your Properties</p>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">This section shows your most recent listings. Add or edit them in the Properties tab.</p>
                                    <a href="/crm/properties" target="_blank" rel="noopener" className="inline-block mt-2 text-[12px] font-medium text-[#1693C9] hover:underline">Manage Properties →</a>
                                </div>
                            )}

                            {source === 'mls' && !hasMls && (
                                <div className="mt-3 rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                                    <p className="text-[12px] text-[#111315] font-medium">Connect an MLS to show live listings</p>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">No MLS is connected yet. Until then this section shows your own properties.</p>
                                    <a href="/crm/idx" className="inline-block mt-2 text-[12px] font-medium text-[#1693C9] hover:underline">Connect MLS →</a>
                                </div>
                            )}

                            {source === 'mls' && hasMls && (
                                <div className="mt-3 space-y-3">
                                    <div>
                                        <FieldLabel>Show listings by</FieldLabel>
                                        <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-[4px]">
                                            {([['datasets', 'Whole MLS'], ['hotsheet', 'Hotsheet'], ['office', 'Office ID'], ['agent', 'Agent ID']] as const).map(([val, label]) => (
                                                <button key={val} type="button" onClick={() => setMlsMode(val)} className={`h-7 px-3 text-[12px] font-medium rounded-[3px] transition-colors ${mlsMode === val ? 'bg-white text-[#111315] shadow-sm' : 'text-[#5F656D] hover:text-[#111315]'}`}>{label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    {mlsMode === 'hotsheet' && (
                                        <div>
                                            <FieldLabel>Hotsheet</FieldLabel>
                                            {hotsheets === null ? (
                                                <p className="text-[12px] text-[#8B9096]">Loading…</p>
                                            ) : hotsheets.length === 0 ? (
                                                <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFBFC] p-3">
                                                    <p className="text-[12px] text-[#111315] font-medium">No hotsheets yet</p>
                                                    <p className="text-[11px] text-[#8B9096] mt-0.5">Build a saved search (including map/polygon areas) in Properties, then pick it here.</p>
                                                    <a href="/crm/properties" target="_blank" rel="noopener" className="inline-block mt-2 text-[12px] font-medium text-[#1693C9] hover:underline">Create a Hotsheet →</a>
                                                </div>
                                            ) : (
                                                <select className={formInputClass} value={mlsHotsheetId} onChange={(e) => setMlsHotsheetId(e.target.value)}>
                                                    <option value="">Select a hotsheet…</option>
                                                    {hotsheets.map((h) => (
                                                        <option key={h.id} value={String(h.id)}>{h.name}{h.scope === 'team' ? ' (Team)' : ''}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )}
                                    {mlsMode === 'office' && (
                                        <div><FieldLabel>Office ID(s)</FieldLabel><input type="text" className={formInputClass} value={mlsOfficeIds} onChange={(e) => setMlsOfficeIds(e.target.value)} placeholder="Comma-separated office IDs" /></div>
                                    )}
                                    {mlsMode === 'agent' && (
                                        <div><FieldLabel>Agent ID(s)</FieldLabel><input type="text" className={formInputClass} value={mlsAgentIds} onChange={(e) => setMlsAgentIds(e.target.value)} placeholder="Comma-separated agent IDs" /></div>
                                    )}
                                    <p className="text-[11px] text-[#8B9096]">Searches all your connected MLSes. For detailed filters, save a Hotsheet in Properties and choose &ldquo;Hotsheet&rdquo; above.</p>
                                </div>
                            )}

                            <div className="mt-3">
                                <FieldLabel>Number of listings</FieldLabel>
                                <input type="number" min={1} max={24} className={formInputClass} value={limit} onChange={(e) => setLimit(e.target.value)} />
                            </div>
                        </div>
                )}

                {/* ── STYLES ── */}
                {tab === 'styles' && (
                    <>
                        <ColorRow label="Background Color" value={bgColor} onChange={setBgColor} fallback="#FFFFFF" />
                        <ColorRow label="Font Color" value={fontColor} onChange={setFontColor} fallback="#111315" />
                    </>
                )}
            </div>
        </SlideOverModal>
    );
}
