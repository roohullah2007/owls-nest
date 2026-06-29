import { useForm } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import SlideOverModal, { FieldLabel, slideOverInputClass as inputClass } from '@/Components/Crm/SlideOverModal';

interface Props {
    moduleLabel: string;
    submitUrl: string;
    onClose: () => void;
}

const FIELD_TYPES: { value: string; label: string }[] = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Multi-line text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'email', label: 'Email' },
    { value: 'url', label: 'URL' },
    { value: 'select', label: 'Picklist' },
    { value: 'checkbox', label: 'Checkbox' },
];

function ToggleRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <label className="flex items-start justify-between gap-3 py-2 cursor-pointer">
            <div className="min-w-0">
                <div className="text-[13px] text-[#1f2530] font-normal">{label}</div>
                {description && (
                    <div className="text-[11px] text-[#8B9096] mt-0.5">{description}</div>
                )}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`shrink-0 relative inline-flex h-[18px] w-8 items-center rounded-full transition-colors ${
                    checked ? 'bg-[#1693C9]' : 'bg-[#E4E7EB]'
                }`}
            >
                <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </label>
    );
}

export default function AddCustomFieldModal({ moduleLabel, submitUrl, onClose }: Props) {
    const labelRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset } = useForm<{
        label: string;
        type: string;
        section: string;
        quick_create: boolean;
        searchable: boolean;
        unique: boolean;
        required: boolean;
    }>({
        label: '',
        type: 'text',
        section: 'General',
        quick_create: true,
        searchable: false,
        unique: false,
        required: false,
    });

    useEffect(() => {
        const t = setTimeout(() => labelRef.current?.focus(), 200);
        return () => clearTimeout(t);
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const label = data.label.trim();
        if (!label) return;
        const key = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!key) return;
        // Inertia merges transform into payload before post.
        post(submitUrl, {
            data: { ...data, label, key } as any,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        } as any);
    }

    const formId = 'add-custom-field-form';

    const footer = (
        <>
            <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 text-[12px] font-medium text-[#5F656D] hover:text-[#111315] rounded transition-colors"
            >
                Cancel
            </button>
            <button
                type="submit"
                form={formId}
                disabled={processing || !data.label.trim()}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {processing ? 'Adding…' : 'Add Field'}
            </button>
        </>
    );

    return (
        <SlideOverModal title={`New ${moduleLabel} Field`} onClose={onClose} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                    <div>
                        <FieldLabel htmlFor="cf_label" help="Display name shown on forms and the contact view.">
                            Field Label <span className="text-[#DC2626]">*</span>
                        </FieldLabel>
                        <input
                            id="cf_label"
                            ref={labelRef}
                            type="text"
                            value={data.label}
                            onChange={(e) => setData('label', e.target.value)}
                            placeholder="e.g. Anniversary"
                            className={inputClass}
                            required
                        />
                        {errors.label && <p className="mt-1 text-[11px] text-red-500">{errors.label}</p>}
                    </div>

                    <div>
                        <FieldLabel htmlFor="cf_type" help="Controls the input shown on forms and how the value is validated.">
                            Type
                        </FieldLabel>
                        <select
                            id="cf_type"
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value)}
                            className={inputClass}
                        >
                            {FIELD_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <FieldLabel htmlFor="cf_section" help="Groups related fields together in the contact view.">
                            Section
                        </FieldLabel>
                        <input
                            id="cf_section"
                            type="text"
                            value={data.section}
                            onChange={(e) => setData('section', e.target.value)}
                            placeholder="General"
                            className={inputClass}
                        />
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#E4E7EB]">
                        <div className="text-[10px] font-semibold text-[#8B9096] tracking-wider mb-1">Behavior</div>
                        <ToggleRow
                            label="Appear in quick creation form"
                            description="Show this field on the Add Contact slide-over."
                            checked={data.quick_create}
                            onChange={(v) => setData('quick_create', v)}
                        />
                        <ToggleRow
                            label="Appear in global search results"
                            description="Index this field so it matches when searching contacts."
                            checked={data.searchable}
                            onChange={(v) => setData('searchable', v)}
                        />
                        <ToggleRow
                            label="Do not allow duplicate values"
                            description="Block saving when another record already has the same value."
                            checked={data.unique}
                            onChange={(v) => setData('unique', v)}
                        />
                        <ToggleRow
                            label="Always required"
                            description="Block saving when this field is empty."
                            checked={data.required}
                            onChange={(v) => setData('required', v)}
                        />
                    </div>
                </div>
            </form>
        </SlideOverModal>
    );
}
