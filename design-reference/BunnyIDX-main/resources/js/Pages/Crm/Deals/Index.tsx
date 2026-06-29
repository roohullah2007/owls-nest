import CrmLayout from '@/Layouts/CrmLayout';
import Avatar from '@/Components/Crm/Avatar';
import CrmCard from '@/Components/Crm/CrmCard';
import { DataTable, DataTableCell, DataTableHead, DataTableHeadCell, DataTableRow } from '@/Components/ui/DataTable';
import LostReasonModal from '@/Components/Crm/LostReasonModal';
import PillTabs from '@/Components/Crm/PillTabs';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import DealSlideOver, { EditableDeal } from '@/Components/Crm/DealSlideOver';
import DealCard from './components/DealCard';
import StageColumn from './components/StageColumn';
import TerminalDropZone from './components/TerminalDropZone';
import PipelineBar from './components/PipelineBar';
import { Contact, Deal, Pipeline, PipelineStage } from './components/types';
import { capitalize, contactNames, formatCurrency, formatDate, typeLabels } from './components/utils';
import { getAvatarColor, getInitials } from '@/utils/avatarColors';
import { fieldIcon } from '@/Components/Crm/FieldIcon';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useRef, useState, useEffect } from 'react';

interface AiDealResult {
    id: number;
    title: string;
    value: string;
    type: string;
    stage: string | null;
    stage_type: string | null;
    stage_color: string | null;
    expected_close_date: string | null;
    won_at: string | null;
    lost_at: string | null;
    property_address: string | null;
    contacts: { id: number; uuid: string; name: string }[];
    tags: { name: string; color: string }[];
}

interface AiDealData {
    title: string;
    value: string | number;
    type: string;
    property_address: string;
    expected_close_date: string;
    commission_rate: string | number;
    notes: string;
    contact_ids: number[];
    contact_names: string[];
}

interface AiResponse {
    filters?: Record<string, string>;
    interpretation?: string;
    answer?: string;
    action?: string;
    suggestions?: string[];
    deals?: AiDealResult[];
    move_to_stage?: string;
    deal_data?: AiDealData;
}

interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    data?: AiResponse;
    timestamp: Date;
}

interface Props {
    deals: { data: Deal[]; links: { url: string | null; label: string; active: boolean }[]; total: number };
    pipelineDeals: Record<number, Deal[]>;
    pipelines: Pipeline[];
    activePipeline: Pipeline | null;
    leadTypes: string[];
    activeLeadType: string | null;
    filters: Record<string, string | undefined>;
    contacts: Contact[];
    tags: { id: number; name: string; color: string }[];
    aiEnabled?: boolean;
    teamMembers?: { id: number; name: string; email: string }[];
    dealTypes?: string[];
    userListings?: { id: number; title: string; address: string | null; city: string | null; state_province: string | null; price: string | null; mls_number: string | null; photos: string[] | null }[];
    idxConnections?: { id: number; display_name: string }[];
}

export default function DealsIndex({ deals, pipelineDeals, pipelines, activePipeline, activeLeadType, filters, contacts, tags, aiEnabled, teamMembers = [], dealTypes = [], userListings = [], idxConnections = [] }: Props) {
    const [lostDealId, setLostDealId] = useState<number | null>(null);
    const [lostStageId, setLostStageId] = useState<number | null>(null);
    const activeStatus = filters.status || 'open';
    const isClosedStatus = activeStatus === 'won' || activeStatus === 'lost';
    const [view, setView] = useState<'board' | 'list'>(isClosedStatus ? 'list' : 'board');
    const [dragOverStage, setDragOverStage] = useState<number | null>(null);
    const [editingStageId, setEditingStageId] = useState<number | null>(null);
    const [editingStageName, setEditingStageName] = useState('');
    const [showDealForm, setShowDealForm] = useState(false);
    const [dealFormStageId, setDealFormStageId] = useState<number | null>(null);
    const [dealFormDefaults, setDealFormDefaults] = useState<Partial<AiDealData> | null>(null);
    const [editingDeal, setEditingDeal] = useState<EditableDeal | null>(null);

    function openEditDeal(d: Deal) {
        setEditingDeal({
            id: d.id,
            title: d.title,
            value: (d as any).value ?? null,
            type: d.type,
            pipeline_id: ((d as any).pipeline_id ?? (d.pipeline_stage as any)?.pipeline_id ?? activePipeline?.id) as number,
            pipeline_stage_id: (d.pipeline_stage?.id ?? 0) as number,
            property_address: (d as any).property_address ?? null,
            expected_close_date: (d as any).expected_close_date ?? null,
            commission_rate: (d as any).commission_rate ?? null,
            commission_amount: (d as any).commission_amount ?? null,
            notes: (d as any).notes ?? null,
            contacts: ((d.contacts || []) as any[]).map((c) => ({ id: c.id })),
            tags: ((d as any).tags || []) as { id: number }[],
        });
    }

    // AI state
    const [aiQuery, setAiQuery] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);
    const [aiExpanded, setAiExpanded] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatMsgId, setChatMsgId] = useState(0);
    const aiInputRef = useRef<HTMLInputElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pipelineForm = useForm({ name: activeLeadType ? `${capitalize(activeLeadType)} Pipeline` : 'New Pipeline', lead_type: activeLeadType || '' });

    const hasPipeline = !!activePipeline;
    const openStages = activePipeline?.stages.filter((s) => s.type === 'open').sort((a, b) => a.position - b.position) || [];
    const wonStage = activePipeline?.stages.find((s) => s.type === 'won');
    const lostStage = activePipeline?.stages.find((s) => s.type === 'lost');
    const totalDeals = deals.total;
    const totalValue = deals.data.reduce((sum, d) => sum + Number(d.value), 0);

    // Auto-open the deal form when navigated here with ?create_deal=1 (e.g. from the
    // Contact page's "Create Deal" quick action). Prefills the contact, then strips
    // the query params so a refresh doesn't keep reopening the form.
    useEffect(() => {
        const url = new URLSearchParams(window.location.search);
        if (url.get('create_deal') !== '1') return;
        const contactId = parseInt(url.get('contact_id') || '', 10);
        const contactName = url.get('contact_name') || '';
        if (contactId && hasPipeline) {
            setDealFormDefaults({
                contact_ids: [contactId],
                contact_names: contactName ? [contactName] : [],
            });
            setDealFormStageId(openStages[0]?.id || null);
            setShowDealForm(true);
        }
        // Strip the query params without triggering a navigation.
        url.delete('create_deal');
        url.delete('contact_id');
        url.delete('contact_name');
        const next = window.location.pathname + (url.toString() ? `?${url.toString()}` : '');
        window.history.replaceState({}, '', next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // AI keyboard shortcut: Cmd/Ctrl+K or /
    useEffect(() => {
        if (!aiEnabled) return;
        function handleKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                aiInputRef.current?.focus();
                setAiExpanded(true);
            }
            if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
                e.preventDefault();
                aiInputRef.current?.focus();
                setAiExpanded(true);
            }
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [aiEnabled]);

    function handleAiBlur() {
        blurTimeoutRef.current = setTimeout(() => {
            if (!aiQuery && !aiResponse && chatMessages.length === 0) setAiExpanded(false);
        }, 200);
    }

    function handleAiFocus() {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        setAiExpanded(true);
    }

    async function handleAiQuery(e: React.FormEvent) {
        e.preventDefault();
        submitAiQuery(aiQuery);
    }

    function handleAiSuggestionClick(suggestion: string) {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        setAiQuery(suggestion);
        submitAiQuery(suggestion);
    }

    function handleDealAction(deal: AiDealResult, action: 'view') {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        if (action === 'view') {
            router.visit(route('crm.deals.show', deal.id));
        }
    }

    function openDealFormFromAi(data: AiDealData) {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        setDealFormDefaults(data);
        setDealFormStageId(openStages[0]?.id || null);
        setShowDealForm(true);
    }

    function handleDisambiguateDeal(deal: AiDealResult) {
        if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
        submitAiQuery(`Tell me about the "${deal.title}" deal`);
    }

    async function submitAiQuery(queryText: string) {
        if (!queryText.trim() || aiLoading) return;
        setAiLoading(true);
        setAiExpanded(true);

        const userMsg: ChatMessage = {
            id: chatMsgId + 1,
            role: 'user',
            text: queryText,
            timestamp: new Date(),
        };
        setChatMsgId(prev => prev + 2);
        setChatMessages(prev => [...prev, userMsg]);
        setAiQuery('');

        try {
            const res = await fetch('/crm/ai/deals-query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ query: queryText }),
            });

            if (!res.ok) {
                const errData: ChatMessage = { id: chatMsgId + 2, role: 'assistant', text: 'Something went wrong. Please try again.', timestamp: new Date() };
                setChatMessages(prev => [...prev, errData]);
                setAiLoading(false);
                return;
            }

            const data: AiResponse = await res.json();
            setAiResponse(data);

            const assistantMsg: ChatMessage = {
                id: chatMsgId + 2,
                role: 'assistant',
                text: data.answer || data.interpretation || 'Done.',
                data,
                timestamp: new Date(),
            };
            setChatMessages(prev => [...prev, assistantMsg]);

            // Apply filters
            if (data.filters && Object.keys(data.filters).length > 0) {
                const params: Record<string, string> = {};
                const filterKeys = ['search', 'status', 'lead_type', 'type', 'sort', 'direction', 'value_min', 'value_max', 'closing_before', 'closing_after', 'pipeline_stage'];
                for (const key of filterKeys) {
                    if (data.filters[key] !== undefined && data.filters[key] !== null) {
                        params[key] = String(data.filters[key]);
                    }
                }
                // Switch to list view if filtering by status
                if (params.status === 'won' || params.status === 'lost') {
                    setView('list');
                }
                router.get(route('crm.deals.index'), params, { preserveState: true });
            }

            // Handle view_deal action
            if (data.action === 'view_deal' && data.deals && data.deals.length === 1) {
                router.visit(route('crm.deals.show', data.deals[0].id));
            }

            if ((data as any).error) {
                const errMsg: ChatMessage = { id: chatMsgId + 2, role: 'assistant', text: (data as any).error, timestamp: new Date() };
                setChatMessages(prev => [...prev.slice(0, -1), errMsg]);
            }
        } catch {
            const errMsg: ChatMessage = { id: chatMsgId + 2, role: 'assistant', text: 'Failed to connect. Please try again.', timestamp: new Date() };
            setChatMessages(prev => [...prev, errMsg]);
        } finally {
            setAiLoading(false);
            setTimeout(() => chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
        }
    }

    function clearAiChat() {
        setAiQuery('');
        setAiResponse(null);
        setChatMessages([]);
        setAiExpanded(false);
        router.get(route('crm.deals.index'), {}, { preserveState: true });
    }

    function openDealForm(stageId?: number) {
        setDealFormStageId(stageId || openStages[0]?.id || null);
        setShowDealForm(true);
    }

    function handleStageDrop(dealId: number, newStageId: number) {
        setDragOverStage(null);
        const stage = activePipeline?.stages.find((s) => s.id === newStageId);
        if (stage?.type === 'lost') {
            setLostDealId(dealId);
            setLostStageId(newStageId);
            return;
        }
        router.patch(route('crm.deals.stage', dealId), { pipeline_stage_id: newStageId }, { preserveScroll: true });
    }

    function handleLostConfirm(reason: string) {
        if (lostDealId && lostStageId) {
            router.patch(route('crm.deals.stage', lostDealId), { pipeline_stage_id: lostStageId, lost_reason: reason }, { preserveScroll: true });
        }
        setLostDealId(null);
        setLostStageId(null);
    }

    function handleDeleteStage(stageId: number) {
        if (!activePipeline) return;
        router.delete(route('crm.pipelines.stages.destroy', [activePipeline.id, stageId]), { preserveScroll: true });
    }

    function handleRenameStage(stageId: number) {
        if (!activePipeline || !editingStageName.trim()) return;
        router.patch(route('crm.pipelines.stages.update', [activePipeline.id, stageId]), { name: editingStageName.trim() }, {
            preserveScroll: true,
            onSuccess: () => { setEditingStageId(null); setEditingStageName(''); },
        });
    }

    function handleCreatePipeline(e: React.FormEvent) {
        e.preventDefault();
        pipelineForm.post(route('crm.pipelines.store'), {
            preserveScroll: true,
            onSuccess: () => pipelineForm.reset(),
        });
    }

    function handleRenamePipeline(name: string) {
        if (!activePipeline || !name.trim()) return;
        router.patch(route('crm.pipelines.update', activePipeline.id), { name: name.trim() }, { preserveScroll: true });
    }

    return (
        <CrmLayout>
            <Head title="Deal Board" />

            <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">

            {/* Page header — inline like Contacts. Spans the full content width to align with the stages container below. */}
            <div className="shrink-0 px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-3">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-lg font-normal text-[#111315]">Deals</h1>

                        {/* Status filter */}
                        {hasPipeline && (
                            <PillTabs
                                className="hidden sm:inline-flex ml-2"
                                active={activeStatus}
                                onChange={(key) => {
                                    if (key === 'won' || key === 'lost') setView('list');
                                    router.get(route('crm.deals.index'), { ...filters, status: key }, { preserveState: true });
                                }}
                                tabs={[
                                    { key: 'open', label: 'Open' },
                                    { key: 'won', label: 'Won' },
                                    { key: 'lost', label: 'Lost' },
                                ]}
                            />
                        )}

                        <div className="flex-1" />

                        {/* Right-side pipeline bar — totals · count, pipeline switcher, divider, edit icon */}
                        {hasPipeline && activePipeline && (
                            <PipelineBar
                                pipelines={pipelines}
                                activePipeline={activePipeline}
                                totalValue={totalValue}
                                totalDeals={totalDeals}
                                filters={filters}
                                editingStageId={editingStageId}
                                editingStageName={editingStageName}
                                setEditingStageId={setEditingStageId}
                                setEditingStageName={setEditingStageName}
                                handleRenamePipeline={handleRenamePipeline}
                                handleRenameStage={handleRenameStage}
                                handleDeleteStage={handleDeleteStage}
                            />
                        )}

                        {/* View toggle — right side */}
                        {hasPipeline && !isClosedStatus && (
                            <PillTabs
                                active={view}
                                onChange={(key) => setView(key as 'board' | 'list')}
                                tabs={[
                                    {
                                        key: 'board',
                                        title: 'Board view',
                                        icon: (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                                            </svg>
                                        ),
                                    },
                                    {
                                        key: 'list',
                                        title: 'List view',
                                        icon: (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                                            </svg>
                                        ),
                                    },
                                ]}
                            />
                        )}

                        {/* Create pipeline */}
                        {!hasPipeline && activeLeadType && (
                            <PrimaryButton
                                onClick={() => {
                                    pipelineForm.setData({ name: `${capitalize(activeLeadType)} Pipeline`, lead_type: activeLeadType });
                                    pipelineForm.post(route('crm.pipelines.store'), { preserveScroll: true });
                                }}
                                label={`Create ${capitalize(activeLeadType)} Pipeline`}
                            />
                        )}

                        {/* Add deal button */}
                        {hasPipeline && (
                            <PrimaryButton onClick={() => openDealForm()} label="Add Deal" />
                        )}
                    </div>
                </div>
            </div>

            {!hasPipeline ? (
                <div className="flex-1 overflow-auto p-6">
                    <div className="border border-[#E4E7EB] bg-white px-8 py-16 text-center rounded-[4px]">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-[#E4E7EB] rounded-lg">
                            <svg className="h-6 w-6 text-[#8B9096]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-[#111315] mb-1">No pipeline for {activeLeadType ? capitalize(activeLeadType) : 'this lead type'}</h3>
                        <p className="text-xs text-[#5F656D] mb-5">Create a pipeline to start tracking deals.</p>
                        <div className="inline-flex">
                            <PrimaryButton
                                onClick={() => {
                                    const lt = activeLeadType || '';
                                    pipelineForm.setData({ name: lt ? `${capitalize(lt)} Pipeline` : 'New Pipeline', lead_type: lt });
                                    pipelineForm.post(route('crm.pipelines.store'), { preserveScroll: true });
                                }}
                                label="Create Pipeline"
                            />
                        </div>
                    </div>
                </div>
            ) : view === 'board' ? (
                <div className="px-4 sm:px-5 md:px-6 pb-4 flex-1 overflow-hidden">
                    {/* Kanban board */}
                    <div className="flex gap-3 overflow-x-auto pb-4 h-full">
                        {openStages.map((stage, stageIdx) => {
                            const stageDeals = pipelineDeals[stage.id] || [];
                            const isFirst = stageIdx === 0;
                            const isLast = stageIdx === openStages.length - 1 && !wonStage && !lostStage;
                            return (
                                <StageColumn
                                    key={stage.id}
                                    stage={stage}
                                    deals={stageDeals}
                                    isFirst={isFirst}
                                    isLast={isLast}
                                    isDragOver={dragOverStage === stage.id}
                                    onDragOver={() => setDragOverStage(stage.id)}
                                    onDragLeave={() => setDragOverStage(null)}
                                    onDrop={(e) => {
                                        const dealId = e.dataTransfer.getData('dealId');
                                        if (dealId) handleStageDrop(Number(dealId), stage.id);
                                    }}
                                    onAddDeal={() => openDealForm(stage.id)}
                                    onEditDeal={openEditDeal}
                                />
                            );
                        })}

                        {wonStage && (
                            <TerminalDropZone
                                stage={wonStage}
                                variant="won"
                                hasRightPoint={!!lostStage}
                                isDragOver={dragOverStage === wonStage.id}
                                onDragOver={() => setDragOverStage(wonStage.id)}
                                onDragLeave={() => setDragOverStage(null)}
                                onDrop={(e) => {
                                    const dealId = e.dataTransfer.getData('dealId');
                                    if (dealId) handleStageDrop(Number(dealId), wonStage.id);
                                }}
                            />
                        )}

                        {lostStage && (
                            <TerminalDropZone
                                stage={lostStage}
                                variant="lost"
                                hasRightPoint={false}
                                isDragOver={dragOverStage === lostStage.id}
                                onDragOver={() => setDragOverStage(lostStage.id)}
                                onDragLeave={() => setDragOverStage(null)}
                                onDrop={(e) => {
                                    const dealId = e.dataTransfer.getData('dealId');
                                    if (dealId) handleStageDrop(Number(dealId), lostStage.id);
                                }}
                            />
                        )}
                    </div>
                </div>
            ) : (
                /* List view */
                <div className="flex-1 overflow-auto px-4 sm:px-5 md:px-6 pb-6">
                    <div>
                    <DataTable>
                        <DataTableHead>
                            <DataTableHeadCell><span className="inline-flex items-center gap-1.5">{fieldIcon('title')}Title</span></DataTableHeadCell>
                            <DataTableHeadCell><span className="inline-flex items-center gap-1.5">{fieldIcon('value')}Value</span></DataTableHeadCell>
                            <DataTableHeadCell><span className="inline-flex items-center gap-1.5">{fieldIcon('stage')}Stage</span></DataTableHeadCell>
                            <DataTableHeadCell><span className="inline-flex items-center gap-1.5">{fieldIcon('type')}Type</span></DataTableHeadCell>
                            <DataTableHeadCell><span className="inline-flex items-center gap-1.5">{fieldIcon('agent')}Agent</span></DataTableHeadCell>
                            <DataTableHeadCell><span className="inline-flex items-center gap-1.5">{fieldIcon('contacts')}Contacts</span></DataTableHeadCell>
                            <DataTableHeadCell last><span className="inline-flex items-center gap-1.5">{fieldIcon('close_date')}Close Date</span></DataTableHeadCell>
                        </DataTableHead>
                        <tbody>
                            {deals.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-12 text-center">
                                        <p className="text-[13px] text-[#8B9096]">No deals yet</p>
                                        <button onClick={() => openDealForm()} className="mt-1 text-[12px] font-medium text-[#111315] underline">
                                            Create your first deal
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                deals.data.map((deal) => (
                                    <DataTableRow key={deal.id} onClick={() => router.visit(route('crm.deals.show', deal.id))}>
                                        <DataTableCell>{deal.title}</DataTableCell>
                                        <DataTableCell>{formatCurrency(deal.value)}</DataTableCell>
                                        <DataTableCell>
                                            {deal.pipeline_stage ? (
                                                <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-[4px] text-white" style={{ backgroundColor: deal.pipeline_stage.color || '#0891b2' }}>
                                                    {deal.pipeline_stage.name}
                                                </span>
                                            ) : <span className="text-[#D1D5DB]">—</span>}
                                        </DataTableCell>
                                        <DataTableCell><span className="capitalize">{typeLabels[deal.type] || deal.type}</span></DataTableCell>
                                        <DataTableCell>
                                            {deal.user ? (
                                                <Avatar id={deal.user.id} name={deal.user.name} size="xs" title={deal.user.name} />
                                            ) : (
                                                <span className="text-[#D1D5DB]">—</span>
                                            )}
                                        </DataTableCell>
                                        <DataTableCell>{contactNames(deal.contacts) || '—'}</DataTableCell>
                                        <DataTableCell last>{deal.expected_close_date ? formatDate(deal.expected_close_date) : '—'}</DataTableCell>
                                    </DataTableRow>
                                ))
                            )}
                        </tbody>
                    </DataTable>

                    {deals.links && deals.links.length > 3 && (
                        <div className="flex items-stretch h-10 bg-white border border-t-0 border-[#E4E7EB] overflow-hidden">
                            <div className="flex items-center px-4 border-r border-[#E4E7EB] shrink-0">
                                <span className="text-[10px] text-[#5F656D] font-medium">{deals.total} deals</span>
                            </div>
                            {deals.links.map((link, i) => (
                                <Link key={i} href={link.url || '#'} className={`flex items-center justify-center min-w-[32px] px-2 text-xs font-medium border-r border-[#E4E7EB] transition-colors ${link.active ? 'bg-[#111315] text-white' : link.url ? 'text-[#5F656D] hover:bg-[#F3F4F6] hover:text-[#111315]' : 'text-[#D1D5DB] cursor-not-allowed'}`} dangerouslySetInnerHTML={{ __html: link.label }} />
                            ))}
                        </div>
                    )}
                    </div>
                </div>
            )}

            {/* Deal creation slide-over */}
            {showDealForm && activePipeline && (
                <DealSlideOver
                    pipeline={activePipeline}
                    pipelines={pipelines}
                    dealTypes={dealTypes}
                    propertyOptions={userListings.map((l) => ({
                        id: l.id,
                        title: l.title,
                        address: l.address,
                        city: l.city,
                        state_province: l.state_province,
                        mls_number: l.mls_number,
                        price: l.price,
                        photos: l.photos,
                        source: 'My listing',
                    }))}
                    mlsConnectionId={idxConnections[0]?.id || null}
                    stageId={dealFormStageId}
                    contacts={contacts}
                    tags={tags}
                    defaults={dealFormDefaults}
                    onClose={() => { setShowDealForm(false); setDealFormDefaults(null); }}
                />
            )}

            {/* Deal edit slide-over */}
            {editingDeal && activePipeline && (
                <DealSlideOver
                    pipeline={activePipeline}
                    pipelines={pipelines}
                    dealTypes={dealTypes}
                    propertyOptions={userListings.map((l) => ({
                        id: l.id,
                        title: l.title,
                        address: l.address,
                        city: l.city,
                        state_province: l.state_province,
                        mls_number: l.mls_number,
                        price: l.price,
                        photos: l.photos,
                        source: 'My listing',
                    }))}
                    mlsConnectionId={idxConnections[0]?.id || null}
                    stageId={null}
                    contacts={contacts}
                    tags={tags}
                    deal={editingDeal}
                    onClose={() => setEditingDeal(null)}
                />
            )}

            {lostDealId && (
                <LostReasonModal
                    onConfirm={handleLostConfirm}
                    onCancel={() => { setLostDealId(null); setLostStageId(null); }}
                />
            )}

            {/* AI Assistant — fixed at bottom */}
            <style>{`@keyframes ai-border-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            {aiEnabled && (
                <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
                    <div className="mx-auto max-w-2xl px-4 pb-4 pointer-events-auto">
                        {/* Chat messages panel */}
                        {aiExpanded && chatMessages.length > 0 && (
                            <div ref={chatScrollRef} className="mb-2 bg-white border border-[#BFDBFE] rounded-[4px] shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#EBF5FF] to-[#DBEAFE] border-b border-[#BFDBFE]">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 flex items-center justify-center rounded-md bg-[#1693C9]">
                                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] font-semibold text-[#1693C9]">AI Assistant</span>
                                    </div>
                                    <button onMouseDown={(e) => { e.preventDefault(); clearAiChat(); }} className="text-[10px] font-medium text-[#8B9096] hover:text-[#5F656D] transition-colors">
                                        Clear chat
                                    </button>
                                </div>

                                <div className="divide-y divide-[#F3F4F6]">
                                    {chatMessages.map((msg) => (
                                        <div key={msg.id} className={`px-4 py-3 ${msg.role === 'user' ? 'bg-[#FAFAFA]' : ''}`}>
                                            {msg.role === 'user' ? (
                                                <div className="flex items-start gap-2.5">
                                                    <div className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-[#E4E7EB] text-[9px] font-bold text-[#5F656D]">You</div>
                                                    <p className="text-sm text-[#5F656D] pt-0.5">{msg.text}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {msg.data?.interpretation && msg.data.interpretation !== msg.text && (
                                                        <div className="flex items-center gap-1.5">
                                                            <svg className="h-3 w-3 text-[#1693C9] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                                                            </svg>
                                                            <span className="text-[10px] text-[#8B9096] italic">{msg.data.interpretation}</span>
                                                        </div>
                                                    )}

                                                    {msg.text && (
                                                        <p className="text-sm text-[#111315] leading-relaxed whitespace-pre-line">{msg.text}</p>
                                                    )}

                                                    {/* Deal cards */}
                                                    {msg.data?.deals && msg.data.deals.length > 0 && (
                                                        <div className="space-y-1.5 mt-2">
                                                            {msg.data.deals.map((d) => (
                                                                <div key={d.id} className="flex items-center gap-3 p-2.5 bg-[#F9FAFB] border border-[#E4E7EB] rounded-[4px] group">
                                                                    <div className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-[#1693C9] text-[10px] font-semibold text-white">
                                                                        {formatCurrency(d.value).replace(/\$/, '').substring(0, 3)}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[13px] font-medium text-[#111315] truncate">{d.title}</span>
                                                                            {d.stage && (
                                                                                <span className="px-1.5 py-0.5 text-[8px] font-bold tracking-wide rounded-full" style={{ backgroundColor: (d.stage_color || '#0891b2') + '20', color: d.stage_color || '#0891b2' }}>
                                                                                    {d.stage}
                                                                                </span>
                                                                            )}
                                                                            <span className="px-1.5 py-0.5 text-[8px] font-bold tracking-wide rounded-full bg-[#F3F4F6] text-[#5F656D]">
                                                                                {typeLabels[d.type] || d.type}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-[10px] text-[#5F656D] mt-0.5">
                                                                            <span className="font-medium">{formatCurrency(d.value)}</span>
                                                                            {d.contacts.length > 0 && <span className="truncate">{d.contacts.map(c => c.name).join(', ')}</span>}
                                                                            {d.expected_close_date && <span className="shrink-0">Close: {formatDate(d.expected_close_date)}</span>}
                                                                            {d.property_address && <span className="truncate">{d.property_address}</span>}
                                                                        </div>
                                                                        {d.tags.length > 0 && (
                                                                            <div className="flex gap-1 mt-1">
                                                                                {d.tags.slice(0, 3).map((tag, ti) => (
                                                                                    <span key={ti} className="px-1.5 py-0.5 text-[8px] font-semibold rounded-full text-white" style={{ backgroundColor: tag.color }}>{tag.name}</span>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        {msg.data?.action === 'disambiguate' ? (
                                                                            <button onMouseDown={(e) => { e.preventDefault(); handleDisambiguateDeal(d); }} className="px-2.5 py-1 text-[10px] font-semibold text-[#1693C9] bg-[#EBF5FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded transition-colors">
                                                                                Select
                                                                            </button>
                                                                        ) : (
                                                                            <button onMouseDown={(e) => { e.preventDefault(); handleDealAction(d, 'view'); }} className="p-1.5 text-[#8B9096] hover:text-[#1693C9] hover:bg-[#E6F0FF] rounded transition-colors" title="View deal">
                                                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Create deal card */}
                                                    {msg.data?.action === 'create_deal' && msg.data.deal_data && (
                                                        <div className="mt-2 p-3 bg-white border border-[#E4E7EB] rounded-[4px]">
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <svg className="h-3.5 w-3.5 text-[#1693C9]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                                                <span className="text-[11px] font-medium text-[#1693C9]">New Deal</span>
                                                            </div>
                                                            <div className="space-y-1 text-[12px] text-[#5F656D]">
                                                                <p><span className="font-medium">Title:</span> {msg.data.deal_data.title}</p>
                                                                {msg.data.deal_data.value ? <p><span className="font-medium">Value:</span> {formatCurrency(msg.data.deal_data.value)}</p> : null}
                                                                <p><span className="font-medium">Type:</span> {typeLabels[msg.data.deal_data.type] || msg.data.deal_data.type}</p>
                                                                {msg.data.deal_data.property_address ? <p><span className="font-medium">Property:</span> {msg.data.deal_data.property_address}</p> : null}
                                                                {msg.data.deal_data.expected_close_date ? <p><span className="font-medium">Close date:</span> {formatDate(msg.data.deal_data.expected_close_date)}</p> : null}
                                                                {msg.data.deal_data.contact_names && msg.data.deal_data.contact_names.length > 0 ? <p><span className="font-medium">Contacts:</span> {msg.data.deal_data.contact_names.join(', ')}</p> : null}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#F3F4F6]">
                                                                <button
                                                                    onMouseDown={(e) => { e.preventDefault(); if (msg.data?.deal_data) openDealFormFromAi(msg.data.deal_data as AiDealData); }}
                                                                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold text-white bg-[#1693C9] hover:bg-[#1380AF] rounded transition-colors"
                                                                >
                                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                                                    Create Deal
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Follow-up suggestions */}
                                                    {msg.data?.suggestions && msg.data.suggestions.length > 0 && (
                                                        <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
                                                            {msg.data.suggestions.map((s, i) => (
                                                                <button
                                                                    key={i}
                                                                    onMouseDown={(e) => { e.preventDefault(); handleAiSuggestionClick(s); }}
                                                                    className="shrink-0 px-2.5 py-1 text-[10px] font-medium text-[#5F656D] bg-white border border-[#E4E7EB] hover:bg-[#F3F4F6] hover:text-[#5F656D] rounded-full transition-colors whitespace-nowrap"
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {aiLoading && (
                                        <div className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4 text-[#1693C9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                                <span className="text-[11px] text-[#8B9096]">Thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Main AI Input Bar */}
                        <div className="relative rounded-[4px] p-[1.5px]">
                            <div className="absolute inset-0 rounded-[4px]" style={{ background: 'linear-gradient(90deg, #1693C9, #0891B2, #1693C9, #0891B2)', backgroundSize: '200% 100%', animation: 'ai-border-shimmer 3s linear infinite', opacity: aiExpanded || chatMessages.length > 0 ? 1 : 0.5 }} />
                            <div className="relative bg-white rounded-[4px] shadow-xl transition-all">
                                <form id="ai-deal-query-form" onSubmit={handleAiQuery} className="flex items-center">
                                    <div className="flex items-center pl-4 pr-1.5">
                                        {aiLoading ? (
                                            <svg className="animate-spin h-5 w-5 text-[#1693C9]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        ) : (
                                            <div className="h-7 w-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#1693C9] to-[#1380AF]">
                                                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
                                            </div>
                                        )}
                                    </div>

                                    <input
                                        ref={aiInputRef}
                                        type="text"
                                        value={aiQuery}
                                        onChange={(e) => setAiQuery(e.target.value)}
                                        onFocus={handleAiFocus}
                                        onBlur={handleAiBlur}
                                        placeholder={chatMessages.length > 0 ? 'Ask a follow-up...' : aiExpanded ? 'Ask anything — "deals closing this month", "high-value deals", "show won deals"...' : 'AI Assistant — search, filter, analyze deals...'}
                                        className="flex-1 text-sm text-[#111315] placeholder:text-[#8B9096] border-0 py-3.5 px-3 focus:outline-none focus:ring-0 bg-transparent"
                                        disabled={aiLoading}
                                    />

                                    {!aiQuery && !aiExpanded && chatMessages.length === 0 && (
                                        <span className="hidden sm:flex items-center shrink-0 mr-3 px-1.5 py-0.5 text-[10px] font-medium text-[#8B9096] bg-[#F3F4F6] border border-[#E4E7EB] rounded">
                                            ⌘K
                                        </span>
                                    )}

                                    {(aiQuery || aiExpanded || chatMessages.length > 0) && (
                                        <button
                                            type="submit"
                                            disabled={aiLoading || !aiQuery.trim()}
                                            className="shrink-0 mr-2 h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-[#1693C9] to-[#1380AF] text-white hover:from-[#1380AF] hover:to-[#004099] disabled:opacity-30 disabled:hover:from-[#1693C9] disabled:hover:to-[#1380AF] transition-all"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" /></svg>
                                        </button>
                                    )}
                                </form>

                                {/* Quick suggestion chips */}
                                {aiExpanded && !aiQuery && chatMessages.length === 0 && (
                                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                                        {[
                                            { label: 'Deals closing this month', q: 'Show deals closing this month' },
                                            { label: 'High-value deals over $500K', q: 'Show high-value deals over $500,000' },
                                            { label: 'Stale deals with no activity', q: 'Which deals have had no activity and need attention?' },
                                            { label: 'Recently won deals', q: 'Show recently won deals' },
                                            { label: 'Show buyer deals', q: 'Show buyer deals' },
                                            { label: 'Add a new deal', q: 'Create a new buyer deal' },
                                        ].map((chip, i) => (
                                            <button
                                                key={i}
                                                onMouseDown={(e) => { e.preventDefault(); handleAiSuggestionClick(chip.q); }}
                                                className="shrink-0 px-3 py-1.5 text-[11px] font-medium text-[#5F656D] bg-[#F9FAFB] border border-[#E4E7EB] hover:bg-[#F3F4F6] hover:text-[#5F656D] hover:border-[#D1D5DB] rounded-full transition-colors whitespace-nowrap"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            </div>{/* end flex col wrapper */}
        </CrmLayout>
    );
}
