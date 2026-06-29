import SlideOverModal from '@/Components/Crm/SlideOverModal';
import Select from '@/Components/Crm/Select';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { useForm } from '@inertiajs/react';

export interface Step {
    id: number;
    step_type: 'email' | 'sms' | 'task';
    delay_amount: number;
    delay_unit: 'minutes' | 'hours' | 'days';
    config: Record<string, any>;
}

interface Props {
    planId: number;
    step: Step | null; // null = create
    mergeFields: Record<string, string>;
    onClose: () => void;
}

const STEP_TYPE_OPTIONS = [
    { value: 'email', label: 'Send email' },
    { value: 'sms', label: 'Send text (SMS)' },
    { value: 'task', label: 'Create task' },
];

export default function StepEditorModal({ planId, step, mergeFields, onClose }: Props) {
    const isEdit = !!step;

    const { data, setData, post, patch, processing, errors } = useForm({
        step_type: step?.step_type ?? 'email',
        delay_amount: step?.delay_amount ?? 0,
        delay_unit: step?.delay_unit ?? 'days',
        config: {
            subject: step?.config?.subject ?? '',
            body_html: step?.config?.body_html ?? '',
            body: step?.config?.body ?? '',
            title: step?.config?.title ?? '',
            description: step?.config?.description ?? '',
            priority: step?.config?.priority ?? 'normal',
            due_offset_days: step?.config?.due_offset_days ?? '',
        } as Record<string, any>,
    });

    function setConfig(key: string, value: any) {
        setData('config', { ...data.config, [key]: value });
    }

    function insertToken(field: string, token: string) {
        setConfig(field, `${data.config[field] ?? ''}${token}`);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (isEdit) {
            patch(route('crm.action-plans.steps.update', { actionPlan: planId, step: step!.id }), opts);
        } else {
            post(route('crm.action-plans.steps.store', { actionPlan: planId }), opts);
        }
    }

    const smsLen = (data.config.body ?? '').length;
    const smsSegments = Math.max(1, Math.ceil(smsLen / 160));

    const fieldError = (key: string) => (errors as Record<string, string>)[`config.${key}`];

    return (
        <SlideOverModal
            title={isEdit ? 'Edit step' : 'Add step'}
            width={460}
            onClose={onClose}
            footer={
                <>
                    <button type="button" onClick={onClose} className="h-9 px-4 text-xs font-medium text-[#5F656D] hover:text-[#111315] transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="step-form"
                        disabled={processing}
                        className="h-9 px-4 text-xs font-medium text-white bg-[#1693C9] rounded-[4px] hover:bg-[#1380AF] disabled:opacity-40 transition-colors"
                    >
                        {isEdit ? 'Save step' : 'Add step'}
                    </button>
                </>
            }
        >
            <form id="step-form" onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <div>
                    <FieldLabel>Step type</FieldLabel>
                    <Select
                        fullWidth
                        appearance="form"
                        value={data.step_type}
                        onChange={(v) => setData('step_type', v as Step['step_type'])}
                        options={STEP_TYPE_OPTIONS}
                    />
                </div>

                <div>
                    <FieldLabel help="How long to wait after the previous step (or enrollment start) before running this step. 0 = immediately.">
                        Wait before this step
                    </FieldLabel>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            min={0}
                            value={data.delay_amount}
                            onChange={(e) => setData('delay_amount', Number(e.target.value))}
                            className={`${formInputClass} w-24`}
                        />
                        <Select
                            appearance="form"
                            value={data.delay_unit}
                            onChange={(v) => setData('delay_unit', v as Step['delay_unit'])}
                            options={[
                                { value: 'minutes', label: 'minutes' },
                                { value: 'hours', label: 'hours' },
                                { value: 'days', label: 'days' },
                            ]}
                        />
                    </div>
                </div>

                {data.step_type === 'email' && (
                    <>
                        <div>
                            <FieldLabel>Subject</FieldLabel>
                            <input
                                type="text"
                                value={data.config.subject}
                                onChange={(e) => setConfig('subject', e.target.value)}
                                className={formInputClass}
                                placeholder="e.g. Great to connect, {{first_name}}"
                            />
                            {fieldError('subject') && <p className="text-[12px] text-[#DC2626] mt-1">{fieldError('subject')}</p>}
                        </div>
                        <div>
                            <FieldLabel>Body</FieldLabel>
                            <textarea
                                rows={8}
                                value={data.config.body_html}
                                onChange={(e) => setConfig('body_html', e.target.value)}
                                className={formInputClass}
                                placeholder="Write your email… HTML is supported."
                            />
                            {fieldError('body_html') && <p className="text-[12px] text-[#DC2626] mt-1">{fieldError('body_html')}</p>}
                            <MergeTags fields={mergeFields} onInsert={(t) => insertToken('body_html', t)} />
                        </div>
                    </>
                )}

                {data.step_type === 'sms' && (
                    <div>
                        <FieldLabel>Message</FieldLabel>
                        <textarea
                            rows={5}
                            maxLength={1600}
                            value={data.config.body}
                            onChange={(e) => setConfig('body', e.target.value)}
                            className={formInputClass}
                            placeholder="Hi {{first_name}}, …"
                        />
                        <div className="flex items-center justify-between mt-1">
                            {fieldError('body') ? (
                                <p className="text-[12px] text-[#DC2626]">{fieldError('body')}</p>
                            ) : <span />}
                            <span className="text-[11px] text-[#8B9096]">{smsLen}/1600 · {smsSegments} segment{smsSegments > 1 ? 's' : ''}</span>
                        </div>
                        <MergeTags fields={mergeFields} onInsert={(t) => insertToken('body', t)} />
                    </div>
                )}

                {data.step_type === 'task' && (
                    <>
                        <div>
                            <FieldLabel>Task title</FieldLabel>
                            <input
                                type="text"
                                value={data.config.title}
                                onChange={(e) => setConfig('title', e.target.value)}
                                className={formInputClass}
                                placeholder="e.g. Call to follow up"
                            />
                            {fieldError('title') && <p className="text-[12px] text-[#DC2626] mt-1">{fieldError('title')}</p>}
                        </div>
                        <div>
                            <FieldLabel>Description</FieldLabel>
                            <textarea
                                rows={3}
                                value={data.config.description}
                                onChange={(e) => setConfig('description', e.target.value)}
                                className={formInputClass}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <FieldLabel>Priority</FieldLabel>
                                <Select
                                    fullWidth
                                    appearance="form"
                                    value={data.config.priority}
                                    onChange={(v) => setConfig('priority', v)}
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'normal', label: 'Normal' },
                                        { value: 'high', label: 'High' },
                                        { value: 'urgent', label: 'Urgent' },
                                    ]}
                                />
                            </div>
                            <div className="w-36">
                                <FieldLabel help="Sets the task due date this many days after it is created.">Due in (days)</FieldLabel>
                                <input
                                    type="number"
                                    min={0}
                                    value={data.config.due_offset_days}
                                    onChange={(e) => setConfig('due_offset_days', e.target.value)}
                                    className={formInputClass}
                                    placeholder="—"
                                />
                            </div>
                        </div>
                    </>
                )}
            </form>
        </SlideOverModal>
    );
}

function MergeTags({ fields, onInsert }: { fields: Record<string, string>; onInsert: (token: string) => void }) {
    const entries = Object.entries(fields);
    if (entries.length === 0) return null;
    return (
        <div className="mt-2 flex flex-wrap gap-1.5">
            {entries.map(([token, label]) => (
                <button
                    key={token}
                    type="button"
                    onClick={() => onInsert(token)}
                    title={`Insert ${token}`}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#EBF5FF] text-[#0E6E9C] hover:bg-[#D6ECFB] transition-colors"
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
