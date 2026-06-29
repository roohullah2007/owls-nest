import CrmLayout from '@/Layouts/CrmLayout';
import Select from '@/Components/Crm/Select';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import StepEditorModal, { Step } from './StepEditorModal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface Plan {
    id: number;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_config: { to_status?: string } | null;
    is_active: boolean;
    stop_on_reply: boolean;
    allow_reenroll: boolean;
    steps: Step[];
}

interface Props {
    plan: Plan;
    contactStatuses: string[];
    mergeFields: Record<string, string>;
    hasEmailAccount: boolean;
    tenDlcReady: boolean;
}

const STEP_META: Record<Step['step_type'], { label: string; icon: string; color: string }> = {
    email: { label: 'Send email', icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75', color: '#1693C9' },
    sms: { label: 'Send text', icon: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z', color: '#7C3AED' },
    task: { label: 'Create task', icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', color: '#059669' },
};

function prettyStatus(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function delayLabel(step: Step): string {
    if (!step.delay_amount) return 'Immediately';
    return `Wait ${step.delay_amount} ${step.delay_unit}`;
}

function stepSummary(step: Step): string {
    if (step.step_type === 'email') return step.config?.subject || '(no subject)';
    if (step.step_type === 'sms') return step.config?.body || '(empty message)';
    return step.config?.title || '(untitled task)';
}

export default function ActionPlanEdit({ plan, contactStatuses, mergeFields, hasEmailAccount, tenDlcReady }: Props) {
    const [editingStep, setEditingStep] = useState<Step | null>(null);
    const [showStepModal, setShowStepModal] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [order, setOrder] = useState<Step[]>(plan.steps);
    const [confirmDeletePlan, setConfirmDeletePlan] = useState(false);

    // Keep local order in sync after Inertia reloads bring fresh steps
    // (skip while a drag is mid-flight so we don't clobber the optimistic order).
    useEffect(() => {
        if (dragIndex === null) setOrder(plan.steps);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan.steps]);

    const settings = useForm({
        name: plan.name,
        description: plan.description ?? '',
        trigger_type: plan.trigger_type,
        trigger_config: { to_status: plan.trigger_config?.to_status ?? '' } as { to_status?: string },
        is_active: plan.is_active,
        stop_on_reply: plan.stop_on_reply,
        allow_reenroll: plan.allow_reenroll,
    });

    function saveSettings(e: React.FormEvent) {
        e.preventDefault();
        settings.patch(route('crm.action-plans.update', plan.id), { preserveScroll: true });
    }

    function openNewStep() {
        setEditingStep(null);
        setShowStepModal(true);
    }

    function openEditStep(step: Step) {
        setEditingStep(step);
        setShowStepModal(true);
    }

    function deleteStep(step: Step) {
        router.delete(route('crm.action-plans.steps.destroy', { actionPlan: plan.id, step: step.id }), { preserveScroll: true });
    }

    function onDrop(targetIndex: number) {
        if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
        const next = [...order];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(targetIndex, 0, moved);
        setOrder(next);
        setDragIndex(null);
        router.post(route('crm.action-plans.steps.reorder', plan.id), { step_ids: next.map((s) => s.id) }, { preserveScroll: true });
    }

    function deletePlan() {
        if (!confirmDeletePlan) { setConfirmDeletePlan(true); return; }
        router.delete(route('crm.action-plans.destroy', plan.id));
    }

    const hasEmailStep = order.some((s) => s.step_type === 'email');
    const hasSmsStep = order.some((s) => s.step_type === 'sms');

    return (
        <CrmLayout>
            <Head title={`${plan.name} — Action Plan`} />

            <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                    <Link href={route('crm.action-plans.index')} className="inline-flex items-center gap-1.5 text-[13px] text-[#5F656D] hover:text-[#111315] transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
                        Action Plans
                    </Link>

                    {/* Settings card */}
                    <form onSubmit={saveSettings} className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-sm p-5 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <h1 className="text-[15px] font-semibold text-[#111315]">Plan settings</h1>
                            <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                <span className="text-[13px] text-[#5F656D]">{settings.data.is_active ? 'Active' : 'Paused'}</span>
                                <button
                                    type="button"
                                    onClick={() => settings.setData('is_active', !settings.data.is_active)}
                                    className={`relative h-5 w-9 rounded-full transition-colors ${settings.data.is_active ? 'bg-[#1693C9]' : 'bg-[#D1D5DB]'}`}
                                >
                                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${settings.data.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                </button>
                            </label>
                        </div>

                        <div>
                            <FieldLabel>Plan name</FieldLabel>
                            <input type="text" value={settings.data.name} onChange={(e) => settings.setData('name', e.target.value)} className={formInputClass} />
                            {settings.errors.name && <p className="text-[12px] text-[#DC2626] mt-1">{settings.errors.name}</p>}
                        </div>

                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <textarea rows={2} value={settings.data.description} onChange={(e) => settings.setData('description', e.target.value)} className={formInputClass} />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                                <FieldLabel>Trigger</FieldLabel>
                                <Select
                                    fullWidth
                                    appearance="form"
                                    value={settings.data.trigger_type}
                                    onChange={(v) => settings.setData('trigger_type', v)}
                                    options={[
                                        { value: 'manual', label: 'Manual enrollment' },
                                        { value: 'status_changed', label: 'When contact status changes' },
                                    ]}
                                />
                            </div>
                            {settings.data.trigger_type === 'status_changed' && (
                                <div>
                                    <FieldLabel>Enter status</FieldLabel>
                                    <Select
                                        fullWidth
                                        appearance="form"
                                        value={settings.data.trigger_config.to_status ?? ''}
                                        onChange={(v) => settings.setData('trigger_config', { to_status: v })}
                                        options={[
                                            { value: '', label: 'Any status' },
                                            ...contactStatuses.map((s) => ({ value: s, label: prettyStatus(s) })),
                                        ]}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                            <label className="flex items-center gap-2 text-[13px] text-[#5F656D] cursor-pointer">
                                <input type="checkbox" checked={settings.data.stop_on_reply} onChange={(e) => settings.setData('stop_on_reply', e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                                Stop when contact replies
                            </label>
                            <label className="flex items-center gap-2 text-[13px] text-[#5F656D] cursor-pointer">
                                <input type="checkbox" checked={settings.data.allow_reenroll} onChange={(e) => settings.setData('allow_reenroll', e.target.checked)} className="h-4 w-4 rounded border-[#C8CCD1] text-[#1693C9] focus:ring-0" />
                                Allow re-enrollment
                            </label>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <button
                                type="button"
                                onClick={deletePlan}
                                className={`text-[12px] font-medium transition-colors ${confirmDeletePlan ? 'text-white bg-[#DC2626] px-3 py-1.5 rounded-[4px]' : 'text-[#DC2626] hover:text-[#B91C1C]'}`}
                            >
                                {confirmDeletePlan ? 'Click again to delete plan' : 'Delete plan'}
                            </button>
                            <button type="submit" disabled={settings.processing} className="h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-40 transition-colors">
                                Save settings
                            </button>
                        </div>
                    </form>

                    {/* Guardrails */}
                    {hasEmailStep && !hasEmailAccount && (
                        <Banner text="This plan sends email but no email account is connected. Connect Gmail in Settings or those steps will be skipped." />
                    )}
                    {hasSmsStep && !tenDlcReady && (
                        <Banner text="This plan sends SMS but 10DLC registration isn't approved. US/Canada texts will be skipped until it's complete." />
                    )}

                    {/* Steps */}
                    <div className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[15px] font-semibold text-[#111315]">Steps</h2>
                            <button onClick={openNewStep} type="button" className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] transition-colors">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                Add step
                            </button>
                        </div>

                        {order.length === 0 ? (
                            <p className="text-[13px] text-[#8B9096] py-6 text-center">No steps yet. Add your first step to build the sequence.</p>
                        ) : (
                            <ol className="space-y-2">
                                {order.map((step, i) => {
                                    const meta = STEP_META[step.step_type];
                                    return (
                                        <li
                                            key={step.id}
                                            draggable
                                            onDragStart={() => setDragIndex(i)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={() => onDrop(i)}
                                            className={`group flex items-center gap-3 rounded-[4px] border px-3 py-2.5 bg-white transition-colors ${dragIndex === i ? 'border-[#1693C9] opacity-60' : 'border-[#E4E7EB] hover:border-[#C8CCD1]'}`}
                                        >
                                            <span className="cursor-grab text-[#C8CCD1] active:cursor-grabbing" title="Drag to reorder">
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>
                                            </span>
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0" style={{ backgroundColor: `${meta.color}1A` }}>
                                                <svg className="h-4 w-4" style={{ color: meta.color }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} /></svg>
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[13px] font-medium text-[#111315]">{meta.label}</span>
                                                    <span className="text-[11px] text-[#8B9096]">· {delayLabel(step)}</span>
                                                </div>
                                                <p className="text-[12px] text-[#5F656D] truncate">{stepSummary(step)}</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button" onClick={() => openEditStep(step)} className="p-1.5 text-[#8B9096] hover:text-[#1693C9] transition-colors" title="Edit">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                                                </button>
                                                <button type="button" onClick={() => deleteStep(step)} className="p-1.5 text-[#8B9096] hover:text-[#DC2626] transition-colors" title="Delete">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165" /></svg>
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>
                </div>
            </div>

            {showStepModal && (
                <StepEditorModal
                    planId={plan.id}
                    step={editingStep}
                    mergeFields={mergeFields}
                    onClose={() => setShowStepModal(false)}
                />
            )}
        </CrmLayout>
    );
}

function Banner({ text }: { text: string }) {
    return (
        <div className="flex items-start gap-2.5 rounded-[4px] border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
            <svg className="h-4 w-4 text-[#B45309] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <p className="text-[12px] text-[#92400E]">{text}</p>
        </div>
    );
}
