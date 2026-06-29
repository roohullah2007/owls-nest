import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';
import { SiteData, SectionConfig, FieldConfig } from '@/website-editor/types';
import MediaField from './MediaField';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    site: SiteData | null;
    section: SectionConfig;
    page: string;
}

/**
 * Edits a template section's content in a right-side slide-over. Column-storage
 * fields save to the site, the rest to page_data — same split as the in-template
 * SectionModal. Rendered only while open (mount drives the slide animation).
 */
export default function SectionEditorModal({ onClose, onSaved, site, section, page }: Props) {
    const fieldKey = (field: FieldConfig, idx: number) => `${field.sourcePage || page}__${field.key}__${idx}`;

    function fieldValue(field: FieldConfig): string {
        if (!site) return field.defaultValue || '';
        if (field.storage === 'column') {
            return (site as unknown as Record<string, unknown>)[field.key] as string || '';
        }
        const src = field.sourcePage || page;
        const val = site.page_data?.[src]?.[field.key];
        if (val) return val as string;
        return field.defaultValue || '';
    }

    function imageUrl(field: FieldConfig): string | null {
        if (!site) return null;
        if (field.siteKey) return (site as unknown as Record<string, unknown>)[field.siteKey] as string | null;
        const src = field.sourcePage || page;
        const val = site.page_data?.[src]?.[field.key];
        return val ? String(val) : null;
    }

    const [values, setValues] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        section.fields.forEach((f, idx) => { initial[fieldKey(f, idx)] = f.type === 'image' ? (imageUrl(f) || '') : fieldValue(f); });
        return initial;
    });
    const [saving, setSaving] = useState(false);

    function setValue(field: FieldConfig, idx: number, value: string) {
        setValues((prev) => ({ ...prev, [fieldKey(field, idx)]: value }));
    }

    async function handleSave() {
        if (!site) return;
        setSaving(true);
        try {
            const columnFields: Record<string, string | null> = {};
            const pageGroups: Record<string, Record<string, string | null>> = {};
            section.fields.forEach((field, idx) => {
                const val = values[fieldKey(field, idx)] ?? '';
                // Images store to their column (siteKey) or page_data; text uses storage/sourcePage.
                if (field.type === 'image') {
                    if (field.siteKey) {
                        columnFields[field.siteKey] = val || null;
                    } else {
                        const target = field.sourcePage || page;
                        (pageGroups[target] ||= {})[field.key] = val || null;
                    }
                    return;
                }
                if (field.storage === 'column') {
                    columnFields[field.key] = val || null;
                } else {
                    const target = field.sourcePage || page;
                    (pageGroups[target] ||= {})[field.key] = val || null;
                }
            });
            if (Object.keys(columnFields).length) await api.updateSite(site.id, columnFields);
            for (const [pg, fields] of Object.entries(pageGroups)) await api.updatePageData(site.id, pg, fields);
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
        <SlideOverModal title={`Edit ${section.label}`} onClose={onClose} footer={footer} width={460}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                {section.fields.length === 0 && (
                    <p className="text-[13px] text-[#5F656D]">This section has no editable text fields.</p>
                )}
                {section.fields.map((field, idx) => {
                    if (field.type === 'image') {
                        return (
                            <div key={idx}>
                                <FieldLabel>{field.label}</FieldLabel>
                                <MediaField websiteId={site?.id || 0} value={values[fieldKey(field, idx)] || ''} onChange={(p) => setValue(field, idx, p)} />
                            </div>
                        );
                    }

                    if (field.type === 'textarea' || field.type === 'code') {
                        return (
                            <div key={idx}>
                                <FieldLabel>{field.label}</FieldLabel>
                                <textarea
                                    className={`${formInputClass} resize-none${field.type === 'code' ? ' font-mono' : ''}`}
                                    rows={field.rows || 4}
                                    value={values[fieldKey(field, idx)] || ''}
                                    onChange={(e) => setValue(field, idx, e.target.value)}
                                />
                            </div>
                        );
                    }

                    return (
                        <div key={idx}>
                            <FieldLabel>{field.label}</FieldLabel>
                            <input
                                type="text"
                                className={formInputClass}
                                value={values[fieldKey(field, idx)] || ''}
                                onChange={(e) => setValue(field, idx, e.target.value)}
                            />
                        </div>
                    );
                })}
            </div>
        </SlideOverModal>
    );
}
