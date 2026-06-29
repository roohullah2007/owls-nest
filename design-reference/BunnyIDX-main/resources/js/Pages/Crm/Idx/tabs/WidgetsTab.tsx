import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { IdxConnection, IdxSearch, IdxWidget, License, WidgetAppearance } from '../Index';
import { defaultAppearance } from '../Index';
import WidgetPreview from '../components/WidgetPreview';

const widgetTypeLabels: Record<string, string> = { grid: 'Grid', carousel: 'Carousel', map: 'Map', search_form: 'Search Form' };
const widgetTypeColors: Record<string, { bg: string; text: string; border: string }> = {
    grid: { bg: '#E6F0FF', text: '#1E40AF', border: '#BFDBFE' },
    carousel: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
    map: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    search_form: { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' },
};

interface Props {
    widgets: IdxWidget[];
    searches: IdxSearch[];
    connections: IdxConnection[];
    licenses: License[];
    onOpenDefaults: () => void;
}

function mergeAppearance(src: WidgetAppearance | null): WidgetAppearance {
    return {
        ...defaultAppearance,
        ...src,
        card: { ...defaultAppearance.card, ...(src?.card || {}) },
        typography: { ...defaultAppearance.typography, ...(src?.typography || {}) },
        colors: { ...defaultAppearance.colors, ...(src?.colors || {}) },
        fields: { ...defaultAppearance.fields, ...(src?.fields || {}) },
        searchForm: { ...defaultAppearance.searchForm, ...(src?.searchForm || {}) },
    };
}

export default function WidgetsTab({ widgets, connections, licenses, onOpenDefaults }: Props) {
    const [embedDismissed, setEmbedDismissed] = useState(() => localStorage.getItem('bunny_embed_notice') === '1');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    function dismissEmbed() {
        setEmbedDismissed(true);
        localStorage.setItem('bunny_embed_notice', '1');
    }

    function toggleActive(widget: IdxWidget) {
        router.patch(route('crm.idx.widgets.update', widget.id), { is_active: !widget.is_active }, { preserveScroll: true });
    }

    function deleteWidget(widget: IdxWidget) {
        if (confirm('Delete this widget?')) {
            router.delete(route('crm.idx.widgets.destroy', widget.id), { preserveScroll: true });
        }
    }

    function generateSnippet(widget: IdxWidget) {
        const license = licenses.find((l) => l.status === 'active');
        const key = license?.key || 'YOUR-LICENSE-KEY';
        return `<script src="https://cdn.bunnychamp.com/idx-embed.js"\n  data-license="${key}"\n  data-widget="${widget.widget_type}"\n  data-mls="${widget.mls_slug}"\n  data-widget-id="${widget.id}">\n</script>\n<div id="bunnychamp-idx-${widget.id}"></div>`;
    }

    function handleCopy(widget: IdxWidget) {
        navigator.clipboard.writeText(generateSnippet(widget));
        setCopiedId(widget.id);
        setTimeout(() => setCopiedId(null), 2000);
    }

    return (
        <div className="max-w-5xl">
            {!embedDismissed && (
                <div className="mb-5 rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-[#E6F0FF] to-[#F0F9FF] overflow-hidden">
                    <div className="px-5 py-4 flex items-start gap-4">
                        <div className="shrink-0 mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-[#111315]">
                            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-semibold text-[#111315]">Embed widgets on any website</h3>
                            <p className="text-[12px] text-[#5F656D] mt-0.5">Add IDX property listings to WordPress, Wix, Webflow, Squarespace, or any HTML site with a simple embed code.</p>
                        </div>
                        <button onClick={dismissEmbed} className="shrink-0 text-[#93C5FD] hover:text-[#111315] transition-colors h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/50">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] text-[#8B9096]">{widgets.length} widget{widgets.length !== 1 ? 's' : ''}</p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenDefaults}
                        className="h-8 px-3 text-[12px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors"
                    >
                        Defaults
                    </button>
                    {connections.length > 0 && (
                        <button
                            onClick={() => router.visit(route('crm.idx.widget.create'))}
                            className="h-8 px-4 bg-[#111315] text-white text-[12px] font-medium rounded-lg hover:bg-[#2a2d30] transition-colors inline-flex items-center gap-1.5"
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            New Widget
                        </button>
                    )}
                </div>
            </div>

            {widgets.length === 0 ? (
                <div className="bg-white border border-[#E4E7EB] rounded-xl px-6 py-14 text-center">
                    <div className="h-12 w-12 mx-auto rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-[#E4E7EB]" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                        </svg>
                    </div>
                    <p className="text-[13px] font-semibold text-[#111315] mb-1">No widgets yet</p>
                    <p className="text-[12px] text-[#8B9096] mb-5 max-w-sm mx-auto">Design beautiful IDX listing widgets with our visual editor and embed them on any website.</p>
                    {connections.length > 0 ? (
                        <button onClick={() => router.visit(route('crm.idx.widget.create'))} className="h-9 px-6 bg-[#111315] text-white text-[13px] font-medium rounded-lg hover:bg-[#2a2d30] transition-colors inline-flex items-center gap-1.5">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Create Widget
                        </button>
                    ) : (
                        <p className="text-[12px] text-[#8B9096]">Connect an MLS first to start creating widgets.</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {widgets.map((widget) => {
                        const tc = widgetTypeColors[widget.widget_type] || widgetTypeColors.grid;
                        const wa = mergeAppearance(widget.appearance);

                        return (
                            <div key={widget.id} className={`group bg-white rounded-xl border border-[#E4E7EB] overflow-hidden hover:shadow-md transition-all ${!widget.is_active ? 'opacity-60' : ''}`}>
                                {/* Thumbnail */}
                                <div
                                    className="h-44 overflow-hidden relative bg-[#F9FAFB] cursor-pointer"
                                    onClick={() => router.visit(route('crm.idx.widget.edit', widget.id))}
                                >
                                    <div style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: `${100 / 0.35}%`, position: 'absolute', top: 0, left: 0 }}>
                                        <WidgetPreview
                                            appearance={wa}
                                            widgetType={widget.widget_type}
                                            config={widget.config || {}}
                                            mlsSlug={widget.mls_slug}
                                            idxSearchId={widget.idx_search_id}
                                            customCss={widget.custom_css}
                                            widgetFilters={widget.config?.filters}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-[#111315]/0 group-hover:bg-[#111315]/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-semibold text-[#111315] shadow-sm">Open Editor</span>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="px-4 py-3 border-t border-[#F3F4F6]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[13px] font-semibold text-[#111315] truncate flex-1">{widget.name}</span>
                                        <span className="shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-md border" style={{ backgroundColor: tc.bg, color: tc.text, borderColor: tc.border }}>{widgetTypeLabels[widget.widget_type] || widget.widget_type}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-[#8B9096]">
                                        <span>{widget.mls_slug}</span>
                                        {widget.search && <><span>·</span><span>{widget.search.name}</span></>}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#F3F4F6]">
                                        <button
                                            onClick={() => router.visit(route('crm.idx.widget.edit', widget.id))}
                                            className="h-7 px-3 text-[11px] font-medium text-white bg-[#111315] rounded-lg hover:bg-[#2a2d30] transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button onClick={() => handleCopy(widget)} className="h-7 px-3 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                                            {copiedId === widget.id ? 'Copied!' : 'Embed'}
                                        </button>
                                        <div className="flex-1" />
                                        <button onClick={() => toggleActive(widget)} className="h-7 w-7 flex items-center justify-center rounded-lg text-[#8B9096] hover:bg-[#F3F4F6] transition-colors" title={widget.is_active ? 'Deactivate' : 'Activate'}>
                                            {widget.is_active ? (
                                                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                                            ) : (
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                                            )}
                                        </button>
                                        <button onClick={() => deleteWidget(widget)} className="h-7 w-7 flex items-center justify-center rounded-lg text-[#8B9096] hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Add New Card */}
                    {connections.length > 0 && (
                        <button onClick={() => router.visit(route('crm.idx.widget.create'))} className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#E4E7EB] bg-[#F9FAFB] hover:border-[#111315] hover:bg-[#F3F4F6] transition-all min-h-[200px] group">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3F4F6] group-hover:bg-[#E4E7EB] transition-colors">
                                <svg className="h-5 w-5 text-[#8B9096] group-hover:text-[#111315] transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            </div>
                            <span className="text-xs font-medium text-[#8B9096] group-hover:text-[#111315] transition-colors">Create Widget</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
