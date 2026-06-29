import Select from '@/Components/Crm/Select';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Enrollment {
    id: number;
    status: 'active' | 'paused' | 'completed' | 'stopped';
    enrolled_via: string;
    started_at: string | null;
    next_run_at: string | null;
    stop_reason: string | null;
    action_plan: { id: number; name: string } | null;
    current_step: { id: number; step_type: string; position: number } | null;
}

interface Props {
    contact: { id: number; action_plan_enrollments?: Enrollment[] };
    actionPlans: { id: number; name: string }[];
}

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-[#ECFDF5] text-[#047857]',
    paused: 'bg-[#FFFBEB] text-[#B45309]',
    completed: 'bg-[#EFF6FF] text-[#1D4ED8]',
    stopped: 'bg-[#F3F4F6] text-[#5F656D]',
};

function fmt(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ActionPlansTab({ contact, actionPlans }: Props) {
    const enrollments = contact.action_plan_enrollments ?? [];
    const [planId, setPlanId] = useState('');
    const [enrolling, setEnrolling] = useState(false);

    function enroll() {
        if (!planId) return;
        setEnrolling(true);
        router.post(
            route('crm.action-plan-enrollments.store'),
            { action_plan_id: Number(planId), contact_id: contact.id },
            {
                preserveScroll: true,
                onFinish: () => { setEnrolling(false); setPlanId(''); },
                only: ['contact', 'flash'],
            },
        );
    }

    function stop(enrollment: Enrollment) {
        router.patch(route('crm.action-plan-enrollments.stop', enrollment.id), {}, {
            preserveScroll: true,
            only: ['contact', 'flash'],
        });
    }

    return (
        <div className="p-4 sm:p-6 pb-20 space-y-5">
            {/* Enroll */}
            <div className="bg-[#F9FAFB] border border-[#E4E7EB] rounded-[4px] p-4">
                <h3 className="text-[13px] font-semibold text-[#111315] mb-2">Enroll in an action plan</h3>
                {actionPlans.length === 0 ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                        <p className="text-[13px] text-[#8B9096]">No active action plans. Create and activate one first.</p>
                        <Link
                            href={route('crm.action-plans.index')}
                            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1693C9] hover:text-[#1380AF]"
                        >
                            Manage action plans
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
                        </Link>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Select
                            appearance="form"
                            value={planId}
                            onChange={setPlanId}
                            placeholder="Select a plan…"
                            options={actionPlans.map((p) => ({ value: String(p.id), label: p.name }))}
                            className="min-w-[220px]"
                        />
                        <button
                            type="button"
                            onClick={enroll}
                            disabled={!planId || enrolling}
                            className="h-8 px-3 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-40 transition-colors"
                        >
                            Enroll
                        </button>
                    </div>
                )}
            </div>

            {/* Enrollments */}
            <div>
                <h3 className="text-[13px] font-semibold text-[#111315] mb-2">Enrollments</h3>
                {enrollments.length === 0 ? (
                    <p className="text-[13px] text-[#8B9096]">This contact isn't enrolled in any action plans yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {enrollments.map((e) => (
                            <li key={e.id} className="flex items-center gap-3 border border-[#E4E7EB] rounded-[4px] px-3 py-2.5">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[13px] font-medium text-[#111315] truncate">{e.action_plan?.name ?? 'Action plan'}</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES[e.status] ?? STATUS_STYLES.stopped}`}>
                                            {e.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#8B9096] mt-0.5">
                                        Enrolled {fmt(e.started_at)}
                                        {e.status === 'active' && e.next_run_at && <> · next step {fmt(e.next_run_at)}</>}
                                        {e.status === 'stopped' && e.stop_reason && <> · {e.stop_reason.replace(/_/g, ' ')}</>}
                                    </p>
                                </div>
                                {(e.status === 'active' || e.status === 'paused') && (
                                    <button
                                        type="button"
                                        onClick={() => stop(e)}
                                        className="shrink-0 h-7 px-2.5 text-[11px] font-medium text-[#DC2626] border border-[#E4E7EB] rounded-[4px] hover:bg-[#FEF2F2] transition-colors"
                                    >
                                        Stop
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
