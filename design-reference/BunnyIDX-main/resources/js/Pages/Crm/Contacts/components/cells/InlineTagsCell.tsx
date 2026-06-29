import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Contact } from '../types';

/**
 * Inline tags cell — shows existing tag chips (with × to remove) plus a circular
 * + button that opens a small picker of available tags. Used inside the table row.
 */
export default function InlineTagsCell({ contact, allTags }: { contact: Contact; allTags: { id: number; name: string; color: string }[] }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        function onDoc(e: MouseEvent) { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
        if (open) {
            document.addEventListener('mousedown', onDoc);
            document.addEventListener('keydown', onKey);
            return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
        }
    }, [open]);

    function patchTags(ids: number[]) {
        setSaving(true);
        router.patch(route('crm.contacts.update', contact.uuid), {
            first_name: contact.first_name,
            last_name: contact.last_name,
            type: contact.type,
            source: contact.source,
            status: contact.status,
            tags: ids,
        }, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    }

    function addTag(id: number) {
        const ids = contact.tags.map((t) => t.id);
        if (ids.includes(id)) return;
        patchTags([...ids, id]);
        setSearch('');
    }

    function removeTag(id: number) {
        const ids = contact.tags.map((t) => t.id).filter((x) => x !== id);
        patchTags(ids);
    }

    const assignedIds = new Set(contact.tags.map((t) => t.id));
    const available = allTags.filter((t) => !assignedIds.has(t.id) && (!search || t.name.toLowerCase().includes(search.toLowerCase())));

    return (
        <div ref={wrapRef} className="relative flex items-center flex-wrap gap-1 min-w-0 w-full">
            {contact.tags.map((tag) => (
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
                        onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                        disabled={saving}
                        title="Remove tag"
                        className="ml-0.5 h-3.5 w-3.5 inline-flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors disabled:opacity-50"
                    >
                        <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </span>
            ))}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                disabled={saving || allTags.length === 0}
                title="Add tag"
                className="shrink-0 h-5 w-5 inline-flex items-center justify-center rounded-full border border-dashed border-[#C8CCD1] text-[#8B9096] hover:border-[#1693C9] hover:text-[#1693C9] hover:bg-[#EBF5FF] transition-colors disabled:opacity-50"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            </button>

            {open && (
                <div role="menu" className="absolute left-0 top-full mt-1 z-30 min-w-[200px] bg-white border border-[#E4E7EB] rounded-[4px] shadow-lg overflow-hidden">
                    <div className="p-2 border-b border-[#E4E7EB]">
                        <input
                            type="search"
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tags…"
                            className="w-full h-7 px-2 text-[11px] bg-[#F9FAFB] text-[#111315] placeholder-[#8B9096] border border-transparent rounded-[4px] focus:outline-none focus:bg-white focus:border-[#1693C9]"
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                        {available.length === 0 ? (
                            <p className="px-3 py-2 text-[11px] text-[#8B9096]">{assignedIds.size === allTags.length ? 'All tags applied.' : 'No tags match.'}</p>
                        ) : (
                            available.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); addTag(tag.id); }}
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
