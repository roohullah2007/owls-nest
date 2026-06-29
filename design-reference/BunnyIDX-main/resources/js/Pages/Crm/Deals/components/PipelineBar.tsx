import { useEffect, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Pipeline, PipelineStage } from './types';
import { formatCurrency } from './utils';
import { formInputClass } from '@/Components/Crm/FormField';
import SlideOverModal from '@/Components/Crm/SlideOverModal';

/** Shared popper shadow used by all dropdown surfaces. */
const POPPER_SHADOW = 'rgba(7, 9, 15, .05) 0px 0px 0px 1px, rgba(7, 9, 15, .1) 0px 3px 6px, rgba(7, 9, 15, .2) 0px 9px 24px';

interface Props {
    pipelines: Pipeline[];
    activePipeline: Pipeline;
    totalValue: number;
    totalDeals: number;
    filters: Record<string, string | undefined>;
    editingStageId: number | null;
    editingStageName: string;
    setEditingStageId: (id: number | null) => void;
    setEditingStageName: (name: string) => void;
    handleRenamePipeline: (name: string) => void;
    handleRenameStage: (id: number) => void;
    handleDeleteStage: (id: number) => void;
}

export default function PipelineBar({
    pipelines,
    activePipeline,
    totalValue,
    totalDeals,
    filters,
    editingStageId,
    editingStageName,
    setEditingStageId,
    setEditingStageName,
    handleRenamePipeline,
    handleRenameStage,
    handleDeleteStage,
}: Props) {
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);

    const stageForm = useForm({ name: '', type: 'open' as string, color: '#0891b2' });

    useEffect(() => {
        if (!showSwitcher) return;
        function handleClick(e: MouseEvent) {
            if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) setShowSwitcher(false);
        }
        function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowSwitcher(false); }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [showSwitcher]);


    function handleAddStage(e: React.FormEvent) {
        e.preventDefault();
        stageForm.post(route('crm.pipelines.stages.store', activePipeline.id), {
            preserveScroll: true,
            onSuccess: () => stageForm.reset(),
        });
    }

    return (
        <div className="hidden md:flex items-center gap-2 h-9">
            <span className="inline-flex items-center text-xs">
                <span className="font-semibold text-[#111315]">{formatCurrency(totalValue)}</span>
                <span className="mx-2 text-[#8B9096]">·</span>
                <span className="font-medium text-[#5F656D]">{totalDeals} {totalDeals === 1 ? 'Deal' : 'Deals'}</span>
            </span>

            {/* Pipeline switcher + edit icon — one bordered container with an internal divider.
                NOTE: no `overflow-hidden` here — it would clip the absolutely-positioned
                dropdown menus below. The first/last buttons are rounded instead so their
                hover backgrounds still clip cleanly at the group's corners. */}
            <div className="inline-flex items-center h-9 border border-[#E4E7EB] rounded-md bg-white">
                <div className="relative h-full" ref={switcherRef}>
                    <button
                        type="button"
                        onClick={() => setShowSwitcher((o) => !o)}
                        aria-haspopup="menu"
                        aria-expanded={showSwitcher}
                        className="h-full inline-flex items-center gap-1.5 px-3 text-xs font-medium text-[#111315] hover:bg-[#F3F4F6] transition-colors rounded-l-md"
                    >
                        {activePipeline.name}
                        <svg className={`h-3 w-3 text-[#8B9096] transition-transform ${showSwitcher ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                    </button>
                    {showSwitcher && (
                        <div role="menu" style={{ boxShadow: POPPER_SHADOW }} className="absolute left-0 top-full mt-1 z-20 min-w-[220px] bg-white border border-[#E4E7EB] rounded-[4px] overflow-hidden">
                            <div className="px-3 py-2 text-[13px] font-semibold text-[#111315] border-b border-[#F3F4F6]">
                                Switch pipeline
                            </div>
                            {pipelines.map((p) => {
                                const isActive = p.id === activePipeline.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setShowSwitcher(false);
                                            if (!isActive) router.get(route('crm.deals.index'), { ...filters, pipeline_id: p.id }, { preserveState: true });
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#111315] text-left transition-colors ${isActive ? 'bg-[#F9FAFB] font-medium' : 'hover:bg-[#F9FAFB]'}`}
                                    >
                                        <span className="truncate">{p.name}</span>
                                        {isActive && (
                                            <svg className="ml-auto h-3.5 w-3.5 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <span className="h-full w-px bg-[#E4E7EB]" aria-hidden />

                <div className="relative h-full">
                    <button
                        onClick={() => setShowSettings((o) => !o)}
                        className={`h-full inline-flex items-center justify-center px-2.5 transition-colors rounded-r-md ${showSettings ? 'text-[#111315] bg-[#F3F4F6]' : 'text-[#111315] hover:bg-[#F3F4F6]'}`}
                        title="Edit pipeline"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                    </button>
                </div>

                {showSettings && (
                    <SlideOverModal title="Edit pipeline" onClose={() => setShowSettings(false)} width={420}>
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-4 py-3 border-b border-[#E4E7EB]">
                                <label className="block text-[11px] font-medium text-[#111315] mb-1.5">Pipeline Name</label>
                                <input
                                    type="text"
                                    defaultValue={activePipeline.name}
                                    onBlur={(e) => handleRenamePipeline(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                                    className={formInputClass}
                                />
                            </div>
                            <div className="px-4 py-3 border-b border-[#E4E7EB]">
                                <span className="block text-[11px] font-medium text-[#111315] mb-2">Stages</span>
                                <div className="space-y-0.5">
                                    {activePipeline.stages.sort((a, b) => a.position - b.position).map((stage: PipelineStage) => (
                                        <div key={stage.id} className="group flex items-center gap-2.5 px-2 py-1.5 rounded-[4px] hover:bg-[#F9FAFB] transition-colors">
                                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: stage.color || '#0891b2' }} />
                                            {editingStageId === stage.id ? (
                                                <input
                                                    type="text"
                                                    value={editingStageName}
                                                    onChange={(e) => setEditingStageName(e.target.value)}
                                                    onBlur={() => handleRenameStage(stage.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRenameStage(stage.id);
                                                        if (e.key === 'Escape') { setEditingStageId(null); setEditingStageName(''); }
                                                    }}
                                                    autoFocus
                                                    className={`${formInputClass} flex-1`}
                                                />
                                            ) : (
                                                <span
                                                    className={`flex-1 text-xs text-[#111315] ${stage.type === 'open' ? 'cursor-pointer' : ''}`}
                                                    onClick={() => { if (stage.type === 'open') { setEditingStageId(stage.id); setEditingStageName(stage.name); } }}
                                                >
                                                    {stage.name}
                                                </span>
                                            )}
                                            {stage.type !== 'open' && (
                                                <span className={`shrink-0 px-1.5 py-0.5 text-[9px] font-medium rounded-[4px] text-[#111315] ${stage.type === 'won' ? 'bg-green-50' : 'bg-red-50'}`}>
                                                    {stage.type === 'won' ? 'Won' : 'Lost'}
                                                </span>
                                            )}
                                            {stage.type === 'open' ? (
                                                <button onClick={() => handleDeleteStage(stage.id)} className="shrink-0 opacity-0 group-hover:opacity-100 text-[#8B9096] hover:text-red-500 transition-all" title="Remove stage">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                                                </button>
                                            ) : (
                                                <span className="shrink-0 w-3" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <form onSubmit={handleAddStage} className="px-4 py-3">
                                <span className="block text-[11px] font-medium text-[#111315] mb-2">Add Stage</span>
                                <div className="flex gap-1.5">
                                    <input type="text" value={stageForm.data.name} onChange={(e) => stageForm.setData('name', e.target.value)} placeholder="Stage name" className={`${formInputClass} flex-1`} required />
                                    <input type="color" value={stageForm.data.color} onChange={(e) => stageForm.setData('color', e.target.value)} className="h-8 w-8 cursor-pointer shrink-0 rounded-[4px] border-0 p-0 appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-[4px] [&::-webkit-color-swatch]:border-0" title="Stage color" />
                                    <button type="submit" className="h-8 px-3 bg-[#1693C9] text-white text-[11px] font-medium hover:bg-[#1380AF] shrink-0 rounded-[4px]">Add</button>
                                </div>
                            </form>
                        </div>
                    </SlideOverModal>
                )}
            </div>
        </div>
    );
}
