import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { BLOCK_DEFINITIONS } from '@/website-editor/block-definitions';
import { api } from '@/website-editor/api';
import { BlockData } from '@/website-editor/types';
import MediaField from './MediaField';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    block: BlockData;
}

/** Edits a single block's fields in a right-side slide-over. Rendered only while open. */
export default function BlockEditorModal({ onClose, onSaved, websiteId, page, block }: Props) {
    const definition = BLOCK_DEFINITIONS.find((d) => d.type === block.type);

    const [values, setValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        definition?.fields.forEach((f) => { initial[f.key] = block.data[f.key] || ''; });
        return initial;
    });
    const [saving, setSaving] = useState(false);

    if (!definition) return null;

    function setValue(key: string, value: string) {
        setValues((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await api.updateBlock(websiteId, page, block.id, { ...block.data, ...values });
            onSaved();
        } finally {
            setSaving(false);
        }
    }

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
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-8 px-5 bg-[#1693C9] text-white text-[12px] font-medium rounded hover:bg-[#1380AF] disabled:opacity-30 transition-colors"
            >
                {saving ? 'Saving…' : 'Save'}
            </button>
        </>
    );

    return (
        <SlideOverModal title={`Edit ${definition.label}`} onClose={onClose} footer={footer} width={460}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {definition.fields.map((field) => {
                    if (field.type === 'image') {
                        return (
                            <div key={field.key}>
                                <FieldLabel>{field.label}</FieldLabel>
                                <MediaField websiteId={websiteId} value={values[field.key] || ''} onChange={(p) => setValue(field.key, p)} />
                            </div>
                        );
                    }

                    if (field.type === 'textarea' || field.type === 'code') {
                        return (
                            <div key={field.key}>
                                <FieldLabel>{field.label}</FieldLabel>
                                <textarea
                                    className={`${formInputClass} resize-none${field.type === 'code' ? ' font-mono' : ''}`}
                                    rows={field.rows || 4}
                                    value={values[field.key] || ''}
                                    onChange={(e) => setValue(field.key, e.target.value)}
                                />
                                {field.hint && <p className="mt-1 text-[11px] text-[#8B9096]">{field.hint}</p>}
                            </div>
                        );
                    }

                    if (field.type === 'select') {
                        return (
                            <div key={field.key}>
                                <FieldLabel>{field.label}</FieldLabel>
                                <select
                                    className={formInputClass}
                                    value={values[field.key] || ''}
                                    onChange={(e) => setValue(field.key, e.target.value)}
                                >
                                    {(field.options || []).map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                {field.hint && <p className="mt-1 text-[11px] text-[#8B9096]">{field.hint}</p>}
                            </div>
                        );
                    }

                    return (
                        <div key={field.key}>
                            <FieldLabel>{field.label}</FieldLabel>
                            <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                className={formInputClass}
                                value={values[field.key] || ''}
                                onChange={(e) => setValue(field.key, e.target.value)}
                            />
                            {field.hint && <p className="mt-1 text-[11px] text-[#8B9096]">{field.hint}</p>}
                        </div>
                    );
                })}
            </div>
        </SlideOverModal>
    );
}
