import RichTextField from '@/Components/Crm/RichTextField';
import { sectionLabel } from '../../constants';

export interface TogglePageDef {
    key: string;
    label: string;
}

export interface TogglePageRow {
    key: string;
    copy?: string | null;
}

interface Props {
    title: string;
    description: string;
    options: TogglePageDef[];
    rows: TogglePageRow[];
    onToggle: (key: string) => void;
    onCopyChange: (key: string, copy: string) => void;
    /** Which row's copy editor is open (managed by the parent so only one is open across sections). */
    copyEditingKey: string | null;
    onCopyEditingChange: (key: string | null) => void;
    onAiWrite: (key: string) => void;
    /** Key currently being AI-written, if any (disables every AI button). */
    aiBusyKey: string | null;
    emptyHint?: string;
}

/**
 * A toggleable SEO-pages section for the community editor (Lifestyle pages,
 * Property Type pages, Property Sub-Type pages): pill chips to enable pages,
 * plus a collapsible per-page intro-copy editor with "Write with AI".
 */
export default function TogglePagesSection({
    title,
    description,
    options,
    rows,
    onToggle,
    onCopyChange,
    copyEditingKey,
    onCopyEditingChange,
    onAiWrite,
    aiBusyKey,
    emptyHint,
}: Props) {
    const enabled = (key: string) => rows.some((r) => r.key === key);

    return (
        <div className="border-t border-[#E4E7EB] pt-5 space-y-3">
            <div>
                <p className={sectionLabel + ' mb-1'}>{title}</p>
                <p className="text-[11px] text-[#5F656D]">{description}</p>
            </div>
            {options.length === 0 ? (
                emptyHint && <p className="text-[12px] text-[#8B9096]">{emptyHint}</p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {options.map((def) => {
                        const on = enabled(def.key);
                        return (
                            <button
                                key={def.key}
                                type="button"
                                onClick={() => onToggle(def.key)}
                                className={`h-8 px-3 text-[12px] font-medium rounded-full border transition-colors ${on ? 'bg-[#1693C9] border-[#1693C9] text-white' : 'border-[#E4E7EB] text-[#5F656D] hover:border-[#1693C9] hover:text-[#1693C9]'}`}
                            >
                                {def.label}
                            </button>
                        );
                    })}
                </div>
            )}
            {rows.length > 0 && (
                <div className="space-y-2">
                    {rows.map((row) => {
                        const def = options.find((o) => o.key === row.key);
                        if (!def) return null;
                        const open = copyEditingKey === row.key;
                        return (
                            <div key={row.key} className="border border-[#E4E7EB] rounded-lg">
                                <button type="button" onClick={() => onCopyEditingChange(open ? null : row.key)} className="w-full flex items-center justify-between px-3 py-2 text-left">
                                    <span className="text-[12px] font-medium text-[#111315]">{def.label} — page copy</span>
                                    <span className="text-[11px] text-[#8B9096]">{(row.copy || '').replace(/<[^>]+>/g, '').trim() ? 'Custom copy ✓' : 'Default'} {open ? '▴' : '▾'}</span>
                                </button>
                                {open && (
                                    <div className="px-3 pb-3 space-y-1">
                                        <div className="flex justify-end">
                                            <button type="button" onClick={() => onAiWrite(row.key)} disabled={aiBusyKey !== null} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors">
                                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.8L18 8l-4.4 1.2L12 14l-1.6-4.8L6 8l4.4-1.2L12 2zm6 9l.9 2.6L21 14l-2.1.7L18 17l-.9-2.3L15 14l2.1-.4L18 11zM6 13l.9 2.6L9 16l-2.1.7L6 19l-.9-2.3L3 16l2.1-.4L6 13z" /></svg>
                                                {aiBusyKey === row.key ? 'Writing…' : 'Write with AI'}
                                            </button>
                                        </div>
                                        <RichTextField value={row.copy || ''} onChange={(v) => onCopyChange(row.key, v)} minHeight={100} placeholder={`Optional intro copy for the ${def.label} page…`} />
                                        <p className="text-[11px] text-[#8B9096]">
                                            <code>{'{listings_count}'}</code> and <code>{'{search_link}'}</code> are replaced with this page&rsquo;s live data.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
