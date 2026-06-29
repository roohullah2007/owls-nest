import { router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

interface Result {
    id: number;
    label: string;
    sublabel: string | null;
    url: string;
}

interface Results {
    contacts: Result[];
    deals: Result[];
}

const EMPTY: Results = { contacts: [], deals: [] };

/**
 * Global quick-search overlay opened by the top-nav search button and Cmd/Ctrl-K.
 * Debounced lookups hit the tenant-scoped `crm.search` endpoint and results are
 * grouped by entity. Arrow keys move the selection; Enter navigates.
 */
export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Results>(EMPTY);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Flat list (in render order) so keyboard nav can cross groups.
    const flat = useMemo(
        () => [...results.contacts, ...results.deals],
        [results],
    );

    // Reset everything when the overlay closes; focus the input when it opens.
    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults(EMPTY);
            setActive(0);
            return;
        }
        const t = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(t);
    }, [open]);

    // Debounced search. Cancels the in-flight request on each keystroke so a
    // slow earlier response can't overwrite a newer one.
    useEffect(() => {
        if (!open) return;
        const term = query.trim();
        if (term.length < 2) {
            setResults(EMPTY);
            setLoading(false);
            return;
        }
        setLoading(true);
        const controller = new AbortController();
        const t = setTimeout(() => {
            axios
                .get(route('crm.search'), { params: { q: term }, signal: controller.signal })
                .then((res) => {
                    setResults({ contacts: res.data.contacts ?? [], deals: res.data.deals ?? [] });
                    setActive(0);
                })
                .catch((err) => {
                    if (!axios.isCancel(err)) setResults(EMPTY);
                })
                .finally(() => setLoading(false));
        }, 220);
        return () => {
            clearTimeout(t);
            controller.abort();
        };
    }, [query, open]);

    function go(result: Result) {
        onClose();
        router.visit(result.url);
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && flat[active]) {
            e.preventDefault();
            go(flat[active]);
        }
    }

    if (!open) return null;

    const term = query.trim();
    const hasResults = flat.length > 0;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-start justify-center bg-[#111315]/50 p-4 pt-[12vh] backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-12px_rgba(17,19,21,0.35)] ring-1 ring-[#111315]/5">
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-[#E4E7EB] px-5">
                    <svg className="h-5 w-5 shrink-0 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search contacts and deals…"
                        className="flex-1 !border-0 bg-transparent py-3.5 text-[15px] leading-6 text-[#111315] placeholder:text-[#8B9096] !ring-0 focus:!border-0 focus:!outline-none focus:!ring-0"
                    />
                    {loading ? (
                        <svg className="h-4 w-4 shrink-0 animate-spin text-[#8B9096]" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <kbd className="hidden shrink-0 rounded-md border border-[#E4E7EB] bg-[#F9FAFB] px-1.5 py-0.5 text-[10px] font-medium text-[#8B9096] sm:block">
                            ESC
                        </kbd>
                    )}
                </div>

                {/* Results */}
                <div className="max-h-[52vh] overflow-y-auto py-2">
                    {term.length < 2 ? (
                        <EmptyState
                            title="Search your workspace"
                            subtitle="Type at least 2 characters to find contacts and deals."
                        />
                    ) : !loading && !hasResults ? (
                        <EmptyState
                            title={`No matches for “${term}”`}
                            subtitle="Try a different name, email, or phone number."
                        />
                    ) : (
                        <>
                            <ResultGroup
                                title="Contacts"
                                kind="contact"
                                items={results.contacts}
                                offset={0}
                                active={active}
                                onPick={go}
                                onHover={setActive}
                            />
                            <ResultGroup
                                title="Deals"
                                kind="deal"
                                items={results.deals}
                                offset={results.contacts.length}
                                active={active}
                                onPick={go}
                                onHover={setActive}
                            />
                        </>
                    )}
                </div>

                {/* Footer with keyboard hints */}
                <div className="flex items-center gap-4 border-t border-[#E4E7EB] bg-[#F9FAFB] px-5 py-2.5 text-[11px] text-[#8B9096]">
                    <span className="flex items-center gap-1.5">
                        <Hint>↑</Hint><Hint>↓</Hint> to navigate
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Hint>↵</Hint> to open
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                        <Hint>esc</Hint> to close
                    </span>
                </div>
            </div>
        </div>
    );
}

function Hint({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex min-w-[18px] items-center justify-center rounded border border-[#E4E7EB] bg-white px-1 py-0.5 font-sans text-[10px] font-medium text-[#5F656D]">
            {children}
        </kbd>
    );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F4F6]">
                <svg className="h-5 w-5 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
            </div>
            <p className="text-sm font-medium text-[#111315]">{title}</p>
            <p className="mt-1 text-[12px] text-[#8B9096]">{subtitle}</p>
        </div>
    );
}

function ResultGroup({
    title, kind, items, offset, active, onPick, onHover,
}: {
    title: string;
    kind: 'contact' | 'deal';
    items: Result[];
    offset: number;
    active: number;
    onPick: (r: Result) => void;
    onHover: (i: number) => void;
}) {
    if (items.length === 0) return null;

    return (
        <div className="px-2 pb-1.5">
            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[#8B9096]">
                {title}
                <span className="ml-1.5 font-normal text-[#B6BBC2]">{items.length}</span>
            </p>
            {items.map((item, i) => {
                const idx = offset + i;
                const isActive = idx === active;
                return (
                    <button
                        key={`${title}-${item.id}`}
                        type="button"
                        onClick={() => onPick(item)}
                        onMouseEnter={() => onHover(idx)}
                        className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${isActive ? 'bg-[#F0F7FB]' : 'hover:bg-[#F3F4F6]'}`}
                    >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-white text-[#0E7490] ring-1 ring-[#0E7490]/15' : 'bg-[#F3F4F6] text-[#8B9096] group-hover:bg-white'}`}>
                            <KindIcon kind={kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-[#111315]">{item.label}</span>
                            {item.sublabel && (
                                <span className="block truncate text-[11px] text-[#8B9096]">{item.sublabel}</span>
                            )}
                        </span>
                        <svg
                            className={`h-4 w-4 shrink-0 transition-opacity ${isActive ? 'text-[#8B9096] opacity-100' : 'text-[#B6BBC2] opacity-0 group-hover:opacity-100'}`}
                            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                );
            })}
        </div>
    );
}

function KindIcon({ kind }: { kind: 'contact' | 'deal' }) {
    if (kind === 'contact') {
        return (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
        );
    }
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
        </svg>
    );
}
