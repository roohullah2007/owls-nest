import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

interface Tag {
    id: number;
    name: string;
    color: string;
}

interface Props {
    tags: Tag[];
    allTags: Tag[];
    onChange: (tagIds: number[]) => void;
    saving?: boolean;
    /** Where the picker dropdown should anchor (default: left). Use 'right' inside narrow side panes so it doesn't overflow. */
    menuAlign?: 'left' | 'right';
    /** Allow creating a brand-new tag inline from the search box (e.g. when the user has no tags yet). */
    allowCreate?: boolean;
}

export default function TagPicker({ tags, allTags, onChange, saving = false, menuAlign = 'left', allowCreate = false }: Props) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onDoc(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    function addTag(id: number) {
        const ids = tags.map((t) => t.id);
        if (ids.includes(id)) return;
        onChange([...ids, id]);
        setSearch('');
    }

    function removeTag(id: number) {
        onChange(tags.map((t) => t.id).filter((x) => x !== id));
    }

    async function createTag() {
        const name = search.trim();
        if (!name || creating) return;
        setCreating(true);
        try {
            const res = await axios.post(route('crm.tags.store'), { name });
            const tag: Tag | undefined = res.data?.tag;
            if (tag?.id) {
                addTag(tag.id);
            }
            setSearch('');
            setOpen(false);
        } catch {
            // Surface nothing intrusive; leave the picker open so the user can retry.
        } finally {
            setCreating(false);
        }
    }

    const assignedIds = new Set(tags.map((t) => t.id));
    const available = allTags.filter(
        (t) => !assignedIds.has(t.id) && (!search || t.name.toLowerCase().includes(search.toLowerCase()))
    );
    const trimmedSearch = search.trim();
    const canCreate =
        allowCreate &&
        trimmedSearch.length > 0 &&
        !allTags.some((t) => t.name.toLowerCase() === trimmedSearch.toLowerCase());

    return (
        <div ref={wrapRef} className="relative flex items-center flex-wrap gap-1 min-w-0 w-full">
            {tags.map((tag) => (
                <span
                    key={tag.id}
                    className="inline-flex shrink-0 items-center gap-1 pl-2 pr-1 py-0.5 text-[10px] font-semibold rounded-full text-white"
                    style={{ backgroundColor: tag.color }}
                >
                    {tag.name.toLowerCase() === 'hot lead' ? (
                        <span className="text-[11px] leading-none">🔥</span>
                    ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    )}
                    <span>{tag.name}</span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeTag(tag.id);
                        }}
                        disabled={saving}
                        title="Remove tag"
                        className="ml-0.5 h-3.5 w-3.5 inline-flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors disabled:opacity-50"
                    >
                        <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </span>
            ))}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                disabled={saving || (!allowCreate && allTags.length === 0)}
                title="Add tag"
                className="shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full border border-dashed border-[#C8CCD1] text-[#8B9096] hover:border-[#1693C9] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-colors disabled:opacity-50"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
            </button>

            {open && (
                <div
                    role="menu"
                    className={`absolute ${menuAlign === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-30 min-w-[200px] bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden`}
                >
                    <div className="p-2 border-b border-[#E4E7EB]">
                        <input
                            type="search"
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) { e.preventDefault(); createTag(); } }}
                            placeholder={allowCreate ? 'Search or create a tag…' : 'Search tags…'}
                            className="w-full h-7 px-2 text-[11px] bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded-[4px] focus:outline-none focus:bg-white focus:border-[#1693C9]"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                        {canCreate && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); createTag(); }}
                                disabled={creating}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left text-[#1693C9] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
                            >
                                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                <span className="truncate">{creating ? 'Creating…' : `Create "${trimmedSearch}"`}</span>
                            </button>
                        )}
                        {available.length === 0 && !canCreate ? (
                            <p className="px-3 py-2 text-[11px] text-[#8B9096]">
                                {allTags.length === 0
                                    ? (allowCreate ? 'Type a name to create your first tag.' : 'No tags yet.')
                                    : assignedIds.size === allTags.length ? 'All tags applied.' : 'No tags match.'}
                            </p>
                        ) : (
                            available.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addTag(tag.id);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left hover:bg-[#F9FAFB] transition-colors"
                                >
                                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                    <span className="text-[#111315] truncate">{tag.name}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
