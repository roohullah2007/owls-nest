import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { IdxWidget, License } from '../Index';

const widgetTypeLabels: Record<string, string> = {
    grid: 'Grid',
    carousel: 'Carousel',
    map: 'Map',
    search_form: 'Search Form',
};

const widgetTypeColors: Record<string, { bg: string; text: string }> = {
    grid: { bg: '#DBEAFE', text: '#1E40AF' },
    carousel: { bg: '#FEF3C7', text: '#92400E' },
    map: { bg: '#D1FAE5', text: '#065F46' },
    search_form: { bg: '#EDE9FE', text: '#5B21B6' },
};

function copyText(text: string) {
    navigator.clipboard.writeText(text);
}

interface Props {
    widget: IdxWidget;
    licenses: License[];
    onEdit: (widget: IdxWidget) => void;
    onCustomize: (widget: IdxWidget) => void;
}

export default function WidgetCard({ widget, licenses, onEdit, onCustomize }: Props) {
    const [showSnippet, setShowSnippet] = useState(false);

    function toggleActive() {
        router.patch(route('crm.idx.widgets.update', widget.id), { is_active: !widget.is_active }, { preserveScroll: true });
    }

    function remove() {
        if (confirm('Delete this widget?')) {
            router.delete(route('crm.idx.widgets.destroy', widget.id), { preserveScroll: true });
        }
    }

    function generateSnippetCode(): string {
        const license = licenses.find((l) => l.id === widget.license_id);
        const key = license?.key || 'YOUR-LICENSE-KEY';
        return `<script src="https://cdn.bunnychamp.com/idx-embed.js"\n  data-license="${key}"\n  data-widget="${widget.widget_type}"\n  data-mls="${widget.mls_slug}"\n  data-widget-id="${widget.id}">\n</script>\n<div id="bunnychamp-idx-${widget.id}"></div>`;
    }

    const tc = widgetTypeColors[widget.widget_type] || { bg: '#F3F4F6', text: '#5F656D' };

    return (
        <div className="bg-white border border-[#E4E7EB]">
            <div className="px-4 py-3 sm:px-5">
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${widget.is_active ? 'text-[#111315]' : 'text-[#8B9096]'}`}>{widget.name}</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full" style={{ backgroundColor: tc.bg, color: tc.text }}>
                                {widgetTypeLabels[widget.widget_type] || widget.widget_type}
                            </span>
                            {!widget.is_active && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[#F3F4F6] text-[#8B9096]">Inactive</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[#8B9096]">
                            <span>{widget.mls_slug}</span>
                            {widget.search && <span>Search: {widget.search.name}</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => onEdit(widget)} className="h-7 px-2.5 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] hover:bg-[#F3F4F6] transition-colors">
                            Edit
                        </button>
                        <button onClick={() => onCustomize(widget)} className="h-7 px-2.5 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] hover:bg-[#F3F4F6] transition-colors">
                            Customize
                        </button>
                        <button onClick={() => setShowSnippet(!showSnippet)} className="h-7 px-2.5 text-[11px] font-medium text-[#5F656D] border border-[#E4E7EB] hover:bg-[#F3F4F6] transition-colors">
                            {showSnippet ? 'Hide Code' : 'Snippet'}
                        </button>
                        <button onClick={toggleActive} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#111315] transition-colors" title={widget.is_active ? 'Deactivate' : 'Activate'}>
                            {widget.is_active ? (
                                <svg className="h-3.5 w-3.5 text-[#22C55E]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                            ) : (
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                            )}
                        </button>
                        <button onClick={remove} className="h-7 w-7 flex items-center justify-center text-[#8B9096] hover:text-[#EF4444] transition-colors" title="Delete">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            {showSnippet && (
                <div className="border-t border-[#E4E7EB]">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#F9FAFB]">
                        <span className="text-[11px] font-medium text-[#5F656D]">Embed Code</span>
                        <button onClick={() => copyText(generateSnippetCode())} className="text-[11px] font-medium text-[#1693C9] hover:underline">Copy</button>
                    </div>
                    <pre className="px-4 py-3 text-[11px] text-[#5F656D] bg-[#F9FAFB] overflow-x-auto font-mono leading-relaxed">{generateSnippetCode()}</pre>
                </div>
            )}
        </div>
    );
}
