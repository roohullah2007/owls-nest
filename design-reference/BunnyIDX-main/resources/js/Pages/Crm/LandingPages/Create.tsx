import CrmLayout from '@/Layouts/CrmLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

// A meaningful prompt is required so the AI has something useful to work with.
// Mirror the backend rules (LandingPageController@generate): trim, >= 40 chars,
// >= 6 words. Blocks empty/whitespace/single-char/too-short prompts.
const MIN_PROMPT_CHARS = 40;
const MIN_PROMPT_WORDS = 6;
const PROMPT_ERROR = 'Please describe your offer in at least 6 words so AI can create a useful landing page.';

function isPromptValid(prompt: string): boolean {
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_PROMPT_CHARS) return false;
    return trimmed.split(/\s+/).filter(Boolean).length >= MIN_PROMPT_WORDS;
}

interface Preset {
    key: string;
    design: string;
    type: string;
    name: string;
    description: string;
    accent: string;
    screenshot: string | null;
}

interface Design {
    id: string;
    name: string;
    description: string;
    presets: Preset[];
}

interface Props {
    designs: Design[];
}

export default function LandingPageCreate({ designs }: Props) {
    const [creating, setCreating] = useState<string | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [generating, setGenerating] = useState(false);
    const [activeDesign, setActiveDesign] = useState(designs[0]?.id ?? '');
    const busy = creating !== null || generating;

    // Server-side validation error (shown if someone bypasses the UI).
    const serverError = (usePage().props.errors as Record<string, string> | undefined)?.prompt;
    const promptValid = isPromptValid(aiPrompt);
    // Show the inline hint once the user has typed something invalid, or on a server reject.
    const promptError = serverError || (aiPrompt.trim().length > 0 && !promptValid ? PROMPT_ERROR : '');

    const design = designs.find((d) => d.id === activeDesign) ?? designs[0];

    const createFromPreset = (key: string) => {
        setCreating(key);
        router.post(route('crm.landing-pages.store'), { template: key }, { onFinish: () => setCreating(null) });
    };

    const generate = () => {
        if (!promptValid) return;
        setGenerating(true);
        router.post(route('crm.landing-pages.generate'), { prompt: aiPrompt.trim() }, { onFinish: () => setGenerating(false) });
    };

    return (
        <CrmLayout>
            <Head title="Create Landing Page" />
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                <div className="mx-auto max-w-[960px] space-y-6">
                    <div className="flex items-center gap-2">
                        <Link href={route('crm.landing-pages.index')} className="flex h-8 w-8 items-center justify-center rounded-[4px] text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315]" title="Back">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-normal text-[#111315]">Create a landing page</h1>
                            <p className="text-xs text-[#8B9096]">Describe your offer for an AI draft, or pick a ready-made design below.</p>
                        </div>
                    </div>

                    {/* AI quick create */}
                    <div className="rounded-xl border border-[#E4E7EB] bg-white p-5">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#E0F2FE] text-[#1693C9]">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                            </span>
                            <h2 className="text-sm font-semibold text-[#111315]">Quick create with AI</h2>
                        </div>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            rows={3}
                            disabled={busy}
                            placeholder="e.g. A page for sellers in Tampa offering a 1.5% listing fee with free pro photography and staging."
                            aria-invalid={!!promptError}
                            className={`mt-3 w-full rounded-md border px-3 py-2 text-[13px] text-[#111315] focus:outline-none focus:ring-0 disabled:opacity-60 ${promptError ? 'border-[#DC2626] focus:border-[#DC2626]' : 'border-[#C8CCD1] focus:border-[#1693C9]'}`}
                        />
                        <div className="mt-2 flex items-start justify-between gap-3">
                            <p className={`text-[12px] ${promptError ? 'text-[#DC2626]' : 'text-[#8B9096]'}`}>
                                {promptError || `Describe your offer in at least ${MIN_PROMPT_WORDS} words (${MIN_PROMPT_CHARS}+ characters).`}
                            </p>
                            <button type="button" onClick={generate} disabled={busy || !promptValid} className="h-9 shrink-0 px-4 rounded-md bg-[#1693C9] text-white text-[13px] font-medium hover:bg-[#1380AF] disabled:opacity-50 disabled:hover:bg-[#1693C9]">
                                {generating ? 'Generating…' : 'Generate with AI'}
                            </button>
                        </div>
                    </div>

                    {/* Design → Presets */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8B9096]">Or start from a design</span>
                        <div className="h-px flex-1 bg-[#E4E7EB]" />
                    </div>

                    {/* Design selector (shown when more than one design exists) */}
                    {designs.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                            {designs.map((d) => (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setActiveDesign(d.id)}
                                    className={`rounded-lg border px-3.5 py-2 text-left transition-colors ${activeDesign === d.id ? 'border-[#1693C9] bg-[#F0F9FF]' : 'border-[#E4E7EB] bg-white hover:border-[#D1D5DB]'}`}
                                >
                                    <span className={`block text-[13px] font-semibold ${activeDesign === d.id ? 'text-[#1693C9]' : 'text-[#111315]'}`}>{d.name}</span>
                                    <span className="block text-[11px] text-[#8B9096]">{d.presets.length} {d.presets.length === 1 ? 'preset' : 'presets'}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {design && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-[#111315]">{design.name}</h3>
                                <p className="text-xs text-[#5F656D]">{design.description}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {design.presets.map((preset) => (
                                    <button
                                        key={preset.key}
                                        type="button"
                                        disabled={busy}
                                        onClick={() => createFromPreset(preset.key)}
                                        className="group flex flex-col overflow-hidden rounded-xl border border-[#E4E7EB] bg-white text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-[#D1D5DB] disabled:opacity-60 disabled:hover:translate-y-0"
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-[#F3F4F6]">
                                            {preset.screenshot ? (
                                                <img
                                                    src={preset.screenshot}
                                                    alt={`${preset.name} preview`}
                                                    loading="lazy"
                                                    className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: preset.accent }}>
                                                    <span className="rounded-md bg-black/20 px-3 py-1 text-xs font-semibold text-white">{preset.name}</span>
                                                </div>
                                            )}
                                            {creating === preset.key && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[12px] font-medium text-[#111315]">Creating…</div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: preset.accent }} />
                                                <h4 className="text-sm font-semibold text-[#111315]">{preset.name}</h4>
                                                <span className="ml-auto rounded bg-[#F1F3F5] px-1.5 py-0.5 text-[10px] font-medium capitalize text-[#8B9096]">{preset.type}</span>
                                            </div>
                                            <p className="mt-1.5 text-xs leading-relaxed text-[#5F656D]">{preset.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </CrmLayout>
    );
}
