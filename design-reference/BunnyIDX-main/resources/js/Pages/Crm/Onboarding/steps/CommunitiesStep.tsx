import { useState, useEffect, useMemo, KeyboardEvent } from 'react';
import axios from 'axios';
import { StepProps } from '../types';
import StepShell from '../components/StepShell';

/**
 * Step — the communities/areas the agent serves. Each becomes a WebsiteArea.
 * When an MLS is selected (or already connected), we fetch that MLS's covered
 * communities and offer them as typeahead suggestions to make adding easy.
 */
export default function CommunitiesStep({ data, set, page }: StepProps) {
    const [draft, setDraft] = useState('');
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const selectedMlsName = page.mlsProviders.find((p) => p.id === data.mls_provider_id)?.name || null;
    // Fetch when a provider is selected OR the user already has an MLS connected.
    const hasMlsSource = data.mls_provider_id != null || page.hasMls;
    const mlsName = selectedMlsName || (page.hasMls ? 'your connected MLS' : null);

    // Pull the covered communities for the selected/connected MLS.
    useEffect(() => {
        if (!hasMlsSource) {
            setSuggestions([]);
            return;
        }
        let cancelled = false;
        axios
            .get(route('crm.onboarding.communities'), {
                params: data.mls_provider_id ? { mls_provider_id: data.mls_provider_id } : {},
            })
            .then(({ data: res }) => { if (!cancelled) setSuggestions(res.communities || []); })
            .catch(() => { if (!cancelled) setSuggestions([]); });
        return () => { cancelled = true; };
    }, [data.mls_provider_id, hasMlsSource]);

    const matches = useMemo(() => {
        const q = draft.trim().toLowerCase();
        if (!q) return [];
        const chosen = new Set(data.communities.map((c) => c.toLowerCase()));
        return suggestions
            .filter((s) => s.toLowerCase().includes(q) && !chosen.has(s.toLowerCase()))
            .slice(0, 8);
    }, [draft, suggestions, data.communities]);

    function add(name: string) {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (!data.communities.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
            set('communities', [...data.communities, trimmed]);
        }
        setDraft('');
        setOpen(false);
    }

    function remove(name: string) {
        set('communities', data.communities.filter((c) => c !== name));
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(matches[0] && draft.trim() ? matches[0] : draft);
        } else if (e.key === 'Backspace' && draft === '' && data.communities.length > 0) {
            remove(data.communities[data.communities.length - 1]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    return (
        <StepShell
            title="Which communities do you serve?"
            subtitle={
                mlsName
                    ? `Start typing — we’ll suggest communities covered by ${mlsName}. Add as many as you like, or type your own. You can always add more later in the editor.`
                    : 'Add the neighborhoods, cities or areas you specialize in — we’ll create a landing page for each. Press Enter after each one. You can always add more later in the editor.'
            }
        >
            <div className="relative">
                <div className="rounded-xl border border-[#E4E7EB] bg-white p-3 focus-within:border-[#1693C9] focus-within:ring-1 focus-within:ring-[#1693C9] transition-all">
                    <div className="flex flex-wrap gap-2">
                        {data.communities.map((c) => (
                            <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F9FE] border border-[#1693C9]/30 pl-3 pr-1.5 py-1 text-[13px] font-medium text-[#0F6E97]">
                                {c}
                                <button type="button" onClick={() => remove(c)} className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-[#1693C9]/15">
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            data-enter-self
                            value={draft}
                            onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
                            onFocus={() => setOpen(true)}
                            onBlur={() => setTimeout(() => setOpen(false), 150)}
                            onKeyDown={onKeyDown}
                            placeholder={data.communities.length === 0 ? (mlsName ? 'e.g. Brickell, Coral Gables…' : 'e.g. La Jolla, Del Mar…') : 'Add another…'}
                            className="flex-1 min-w-[160px] h-8 border-0 bg-transparent p-0 text-[14px] text-[#111315] placeholder:text-[#8B9096] focus:outline-none focus:ring-0"
                        />
                    </div>
                </div>

                {open && matches.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[#E4E7EB] bg-white shadow-lg py-1.5">
                        {matches.map((m) => (
                            <button
                                key={m}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => add(m)}
                                className="w-full text-left px-4 py-2 text-[14px] text-[#111315] hover:bg-[#F0F9FE] flex items-center gap-2.5"
                            >
                                <svg className="h-4 w-4 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                                {m}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <p className="mt-2 text-[11px] text-[#8B9096]">{data.communities.length} {data.communities.length === 1 ? 'community' : 'communities'} added</p>
        </StepShell>
    );
}
