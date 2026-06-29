import CrmLayout from '@/Layouts/CrmLayout';
import PrimaryButton from '@/Components/Crm/PrimaryButton';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import Select from '@/Components/Crm/Select';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { DataTable, DataTableHead, DataTableHeadCell, DataTableRow, DataTableCell } from '@/Components/ui/DataTable';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

interface Plan {
    id: number;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_config: { to_status?: string } | null;
    is_active: boolean;
    steps_count: number;
    enrolled_count: number;
    completed_count: number;
    active_enrollments_count: number;
    updated_at: string;
}

interface Props {
    plans: Plan[];
    contactStatuses: string[];
}

const TRIGGER_LABELS: Record<string, string> = {
    manual: 'Manual',
    status_changed: 'Status changed',
};

function prettyStatus(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ActionPlansIndex({ plans, contactStatuses }: Props) {
    const [showCreate, setShowCreate] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        trigger_type: 'manual',
        trigger_config: { to_status: '' } as { to_status?: string },
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post(route('crm.action-plans.store'), {
            onSuccess: () => {
                reset();
                setShowCreate(false);
            },
        });
    }

    function toggleActive(plan: Plan) {
        router.patch(route('crm.action-plans.active', plan.id), {}, { preserveScroll: true });
    }

    return (
        <CrmLayout>
            <Head title="Action Plans" />

            <div className="flex-1 overflow-auto p-4 sm:p-5 md:p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <h1 className="text-lg font-normal text-[#111315]">Action Plans</h1>
                            <p className="text-[13px] text-[#5F656D] mt-0.5">
                                Automated sequences of emails, texts, and tasks that run when a lead is enrolled.
                            </p>
                        </div>
                        <PrimaryButton label="New Action Plan" onClick={() => setShowCreate(true)} />
                    </div>

                    {plans.length === 0 ? (
                        <div className="bg-white border border-[#E4E7EB] rounded-[4px] shadow-sm p-10 text-center">
                            <p className="text-[14px] font-medium text-[#111315]">No action plans yet</p>
                            <p className="text-[13px] text-[#5F656D] mt-1">
                                Create a plan to automatically follow up with leads.
                            </p>
                            <div className="mt-4 inline-flex">
                                <PrimaryButton label="New Action Plan" onClick={() => setShowCreate(true)} />
                            </div>
                        </div>
                    ) : (
                        <DataTable>
                            <DataTableHead>
                                <DataTableHeadCell>Name</DataTableHeadCell>
                                <DataTableHeadCell>Trigger</DataTableHeadCell>
                                <DataTableHeadCell align="right">Steps</DataTableHeadCell>
                                <DataTableHeadCell align="right">Active</DataTableHeadCell>
                                <DataTableHeadCell align="right">Enrolled</DataTableHeadCell>
                                <DataTableHeadCell align="right">Completed</DataTableHeadCell>
                                <DataTableHeadCell align="right" last>Status</DataTableHeadCell>
                            </DataTableHead>
                            <tbody>
                                {plans.map((plan) => (
                                    <DataTableRow key={plan.id} onClick={() => router.visit(route('crm.action-plans.edit', plan.id))}>
                                        <DataTableCell>
                                            <span className="font-medium text-[#111315]">{plan.name}</span>
                                        </DataTableCell>
                                        <DataTableCell>
                                            <span className="text-[#5F656D]">
                                                {TRIGGER_LABELS[plan.trigger_type] ?? plan.trigger_type}
                                                {plan.trigger_type === 'status_changed' && plan.trigger_config?.to_status && (
                                                    <span className="text-[#8B9096]"> → {prettyStatus(plan.trigger_config.to_status)}</span>
                                                )}
                                            </span>
                                        </DataTableCell>
                                        <DataTableCell align="right">{plan.steps_count}</DataTableCell>
                                        <DataTableCell align="right">{plan.active_enrollments_count}</DataTableCell>
                                        <DataTableCell align="right">{plan.enrolled_count}</DataTableCell>
                                        <DataTableCell align="right">{plan.completed_count}</DataTableCell>
                                        <DataTableCell align="right" last>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); toggleActive(plan); }}
                                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                                    plan.is_active
                                                        ? 'bg-[#ECFDF5] text-[#047857] hover:bg-[#D1FAE5]'
                                                        : 'bg-[#F3F4F6] text-[#5F656D] hover:bg-[#E4E7EB]'
                                                }`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${plan.is_active ? 'bg-[#047857]' : 'bg-[#8B9096]'}`} />
                                                {plan.is_active ? 'Active' : 'Paused'}
                                            </button>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </tbody>
                        </DataTable>
                    )}
                </div>
            </div>

            {showCreate && (
                <SlideOverModal
                    title="New Action Plan"
                    onClose={() => setShowCreate(false)}
                    footer={
                        <>
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="create-action-plan"
                                disabled={processing}
                                className="h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-40 transition-colors"
                            >
                                Create &amp; add steps
                            </button>
                        </>
                    }
                >
                    <form id="create-action-plan" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div>
                            <FieldLabel htmlFor="ap-name">Plan name</FieldLabel>
                            <input
                                id="ap-name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className={formInputClass}
                                placeholder="e.g. New Buyer Nurture"
                                autoFocus
                            />
                            {errors.name && <p className="text-[12px] text-[#DC2626] mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <FieldLabel help="Manual plans are started by hand from a contact or the contacts list. Status-changed plans auto-enroll a lead when its status changes.">
                                Trigger
                            </FieldLabel>
                            <Select
                                fullWidth
                                appearance="form"
                                value={data.trigger_type}
                                onChange={(v) => setData('trigger_type', v)}
                                options={[
                                    { value: 'manual', label: 'Manual enrollment' },
                                    { value: 'status_changed', label: 'When contact status changes' },
                                ]}
                            />
                        </div>

                        {data.trigger_type === 'status_changed' && (
                            <div>
                                <FieldLabel help="Leave as “Any status” to enroll on every status change.">Enter status</FieldLabel>
                                <Select
                                    fullWidth
                                    appearance="form"
                                    value={data.trigger_config.to_status ?? ''}
                                    onChange={(v) => setData('trigger_config', { to_status: v })}
                                    options={[
                                        { value: '', label: 'Any status' },
                                        ...contactStatuses.map((s) => ({ value: s, label: prettyStatus(s) })),
                                    ]}
                                />
                            </div>
                        )}
                    </form>
                </SlideOverModal>
            )}
        </CrmLayout>
    );
}
