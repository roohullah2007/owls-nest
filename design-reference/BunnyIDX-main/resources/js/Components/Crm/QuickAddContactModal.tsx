import { Link, useForm } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import SlideOverModal, { FieldLabel, slideOverInputClass as inputClass } from '@/Components/Crm/SlideOverModal';

interface CustomField {
    key: string;
    label: string;
    type: string;
    section?: string;
    required?: boolean;
    quick_create?: boolean;
}

interface Props {
    leadTypes: string[];
    contactStatuses?: string[];
    customFields?: CustomField[];
    onClose: () => void;
}

function capitalize(s: string) {
    return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const FIELD_HELP: Record<string, string> = {
    first_name: 'Given name. Used across the CRM for personalization in emails and texts.',
    last_name: 'Family name. Combined with first name to identify this contact.',
    email: 'Primary email address. Used for sending mail and matching duplicate leads.',
    phone: 'Primary phone number. Will be used for calls and SMS if texting is enabled.',
    type: 'Categorize this contact (e.g. Buyer, Seller). Drives smart lists and reporting.',
    status: 'Where this contact sits in your pipeline. Defaults to your first status.',
    source: 'Where this lead came from. Helps measure marketing channel performance.',
};

export default function QuickAddContactModal({ leadTypes, contactStatuses = [], customFields = [], onClose }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Only show custom fields whose `quick_create` flag is set (defaults to true
    // if the flag isn't present yet, so pre-existing fields keep showing).
    const visibleCustomFields = customFields.filter((cf) => cf.quick_create !== false);

    const initialCustomFields: Record<string, string | boolean> = {};
    visibleCustomFields.forEach((cf) => {
        initialCustomFields[cf.key] = cf.type === 'checkbox' ? false : '';
    });

    const { data, setData, post, processing, errors } = useForm<{
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        type: string;
        status: string;
        source: string;
        custom_fields: Record<string, string | boolean>;
    }>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        type: leadTypes[0] || 'buyer',
        status: contactStatuses[0] || '',
        source: 'manual',
        custom_fields: initialCustomFields,
    });

    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 200);
        return () => clearTimeout(t);
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('crm.contacts.store'), {
            onSuccess: () => onClose(),
        });
    }

    function setCustomField(key: string, value: string | boolean) {
        setData('custom_fields', { ...data.custom_fields, [key]: value });
    }

    const missingRequiredCustom = visibleCustomFields.some((cf) => {
        if (!cf.required) return false;
        const v = data.custom_fields[cf.key];
        if (cf.type === 'checkbox') return v !== true;
        return v === '' || v === null || v === undefined;
    });

    const groupedCustom: Record<string, CustomField[]> = {};
    visibleCustomFields.forEach((cf) => {
        const section = cf.section || 'Custom Fields';
        (groupedCustom[section] ??= []).push(cf);
    });

    const formId = 'quick-add-contact-form';

    const manageFieldsLink = (
        <div className="relative group">
            <Link
                href={route('crm.settings.modules', 'contact')}
                onClick={onClose}
                className="text-[12px] font-medium text-[#1693C9] hover:text-[#1380AF]"
            >
                Manage Fields
            </Link>
            <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-10 hidden group-hover:block w-56 rounded-md bg-[#111315] text-white text-[11px] leading-snug px-2.5 py-2 shadow-lg">
                <div className="font-semibold mb-0.5">Manage Custom Fields</div>
                <div className="text-[#C4C9D1]">Customize fields on this form and create custom fields.</div>
            </div>
        </div>
    );

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
                disabled={processing || !data.first_name.trim() || !data.last_name.trim() || missingRequiredCustom}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {processing ? 'Adding…' : 'Add Contact'}
            </button>
        </>
    );

    return (
        <SlideOverModal title="Add New Contact" onClose={onClose} headerRight={manageFieldsLink} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                        <div>
                            <FieldLabel htmlFor="first_name" help={FIELD_HELP.first_name}>
                                First Name <span className="text-[#DC2626]">*</span>
                            </FieldLabel>
                            <input
                                id="first_name"
                                ref={inputRef}
                                type="text"
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                                className={inputClass}
                                placeholder="John"
                                required
                            />
                            {errors.first_name && <p className="mt-1 text-[11px] text-red-500">{errors.first_name}</p>}
                        </div>

                        <div>
                            <FieldLabel htmlFor="last_name" help={FIELD_HELP.last_name}>
                                Last Name <span className="text-[#DC2626]">*</span>
                            </FieldLabel>
                            <input
                                id="last_name"
                                type="text"
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                                className={inputClass}
                                placeholder="Doe"
                                required
                            />
                            {errors.last_name && <p className="mt-1 text-[11px] text-red-500">{errors.last_name}</p>}
                        </div>

                        <div>
                            <FieldLabel htmlFor="email" help={FIELD_HELP.email}>Email</FieldLabel>
                            <input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className={inputClass}
                                placeholder="john@example.com"
                            />
                            {errors.email && <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>}
                        </div>

                        <div>
                            <FieldLabel htmlFor="phone" help={FIELD_HELP.phone}>Phone</FieldLabel>
                            <input
                                id="phone"
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className={inputClass}
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        <div>
                            <FieldLabel htmlFor="type" help={FIELD_HELP.type}>Type</FieldLabel>
                            <select
                                id="type"
                                value={data.type}
                                onChange={(e) => setData('type', e.target.value)}
                                className={inputClass}
                            >
                                {leadTypes.map((t) => (
                                    <option key={t} value={t}>{capitalize(t)}</option>
                                ))}
                            </select>
                        </div>

                        {contactStatuses.length > 0 && (
                            <div>
                                <FieldLabel htmlFor="status" help={FIELD_HELP.status}>Status</FieldLabel>
                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className={inputClass}
                                >
                                    {contactStatuses.map((s) => (
                                        <option key={s} value={s}>{capitalize(s)}</option>
                                    ))}
                                </select>
                                {errors.status && <p className="mt-1 text-[11px] text-red-500">{errors.status}</p>}
                            </div>
                        )}

                        <div>
                            <FieldLabel htmlFor="source" help={FIELD_HELP.source}>Source</FieldLabel>
                            <select
                                id="source"
                                value={data.source}
                                onChange={(e) => setData('source', e.target.value)}
                                className={inputClass}
                            >
                                <option value="manual">Manual</option>
                                <option value="website">Website</option>
                                <option value="referral">Referral</option>
                                <option value="open_house">Open House</option>
                                <option value="social_media">Social Media</option>
                                <option value="cold_call">Cold Call</option>
                                <option value="idx">IDX</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {Object.entries(groupedCustom).map(([sectionName, sectionFields]) => (
                            <div key={sectionName} className="pt-3 mt-3 border-t border-[#E4E7EB] space-y-4">
                                <div className="text-[10px] font-semibold text-[#8B9096] tracking-wider">{sectionName}</div>
                                {sectionFields.map((cf) => {
                                    const fieldErrorKey = `custom_fields.${cf.key}`;
                                    const fieldError = (errors as Record<string, string>)[fieldErrorKey];
                                    const value = data.custom_fields[cf.key];

                                    return (
                                        <div key={cf.key}>
                                            {cf.type === 'checkbox' ? (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={value === true}
                                                        onChange={(e) => setCustomField(cf.key, e.target.checked)}
                                                        className="h-4 w-4 rounded border-[#E4E7EB] text-[#1693C9] focus:ring-[#1693C9]"
                                                    />
                                                    <span className="text-[13px] text-[#5F656D]">
                                                        {cf.label}
                                                        {cf.required && <span className="text-[#DC2626] ml-0.5">*</span>}
                                                    </span>
                                                </label>
                                            ) : (
                                                <>
                                                    <FieldLabel htmlFor={`cf_${cf.key}`}>
                                                        {cf.label}
                                                        {cf.required && <span className="text-[#DC2626] ml-0.5">*</span>}
                                                    </FieldLabel>
                                                    {cf.type === 'textarea' ? (
                                                        <textarea
                                                            id={`cf_${cf.key}`}
                                                            rows={3}
                                                            value={typeof value === 'string' ? value : ''}
                                                            onChange={(e) => setCustomField(cf.key, e.target.value)}
                                                            className={inputClass + ' resize-none'}
                                                            required={cf.required}
                                                        />
                                                    ) : (
                                                        <input
                                                            id={`cf_${cf.key}`}
                                                            type={cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : cf.type === 'email' ? 'email' : cf.type === 'url' ? 'url' : 'text'}
                                                            value={typeof value === 'string' ? value : ''}
                                                            onChange={(e) => setCustomField(cf.key, e.target.value)}
                                                            className={inputClass}
                                                            required={cf.required}
                                                        />
                                                    )}
                                                </>
                                            )}
                                            {fieldError && <p className="mt-1 text-[11px] text-red-500">{fieldError}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                </div>
            </form>
        </SlideOverModal>
    );
}
