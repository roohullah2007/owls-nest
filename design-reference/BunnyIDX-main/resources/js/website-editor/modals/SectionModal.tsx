import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import AiButton from '../components/AiButton';
import ImageUploader from '../components/ImageUploader';
import { SiteData, SectionConfig, FieldConfig } from '../types';
import { api } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
    section: SectionConfig | null;
    currentPage: string;
}

export default function SectionModal({ open, onClose, site, section, currentPage }: Props) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [imageUploaded, setImageUploaded] = useState(false);

    useEffect(() => {
        if (open && section) {
            const initial: Record<string, string> = {};
            section.fields.forEach((field, idx) => {
                if (field.type === 'image') return;
                const val = getFieldValue(field);
                initial[fieldKey(field, idx)] = val;
            });
            setValues(initial);
            setDirty(false);
            setImageUploaded(false);
        }
    }, [open, section]);

    if (!section) return null;

    // Unique key for each field (handles duplicate keys across sourcePage)
    function fieldKey(field: FieldConfig, idx: number): string {
        return `${field.sourcePage || currentPage}__${field.key}__${idx}`;
    }

    function getFieldValue(field: FieldConfig): string {
        // Column fields read directly from site object
        if (field.storage === 'column') {
            return (site as unknown as Record<string, unknown>)[field.key] as string || '';
        }

        // Page data fields
        const page = field.sourcePage || currentPage;
        const val = site.page_data?.[page]?.[field.key];
        if (val) return val as string;

        // Default value fallback
        if (field.defaultValue) return field.defaultValue;

        return '';
    }

    function updateValue(field: FieldConfig, idx: number, value: string) {
        setValues(prev => ({ ...prev, [fieldKey(field, idx)]: value }));
        setDirty(true);
    }

    async function handleSave() {
        setSaving(true);
        try {
            // Group fields by their save target
            const columnFields: Record<string, string | null> = {};
            const pageDataGroups: Record<string, Record<string, string | null>> = {};

            section!.fields.forEach((field, idx) => {
                if (field.type === 'image') return;
                const val = values[fieldKey(field, idx)] ?? '';

                if (field.storage === 'column') {
                    columnFields[field.key] = val || null;
                } else {
                    const targetPage = field.sourcePage || currentPage;
                    if (!pageDataGroups[targetPage]) pageDataGroups[targetPage] = {};
                    pageDataGroups[targetPage][field.key] = val || null;
                }
            });

            // Save column fields
            if (Object.keys(columnFields).length > 0) {
                await api.updateSite(site.id, columnFields);
            }

            // Save page data per target page
            for (const [page, fields] of Object.entries(pageDataGroups)) {
                await api.updatePageData(site.id, page, fields);
            }

            window.location.reload();
        } catch {
            setSaving(false);
        }
    }

    function handleClose() {
        if (imageUploaded) {
            window.location.reload();
            return;
        }
        onClose();
    }

    function getUploader(field: FieldConfig): (file: File) => Promise<void> {
        // Block image upload — stores path in page_data
        if (field.uploadKey === 'block') {
            return async (file: File) => {
                const result = await api.uploadBlockImage(site.id, file);
                if (result.path) {
                    const targetPage = field.sourcePage || currentPage;
                    await api.updatePageData(site.id, targetPage, { [field.key]: result.path });
                    setImageUploaded(true);
                }
            };
        }

        const uploaders: Record<string, (id: number, file: File) => Promise<unknown>> = {
            hero: api.uploadHero,
            photo: api.uploadPhoto,
            logo: api.uploadLogo,
            favicon: api.uploadFavicon,
            og_image: api.uploadOgImage,
        };
        const uploadFn = uploaders[field.uploadKey || ''];
        return async (file: File) => {
            if (uploadFn) {
                await uploadFn(site.id, file);
                setImageUploaded(true);
            }
        };
    }

    function getImageUrl(field: FieldConfig): string | null {
        // Column-stored images
        if (field.siteKey) {
            return (site as unknown as Record<string, unknown>)[field.siteKey] as string | null;
        }
        // Page-data stored images (block uploads)
        if (field.uploadKey === 'block') {
            const page = field.sourcePage || currentPage;
            const val = site.page_data?.[page]?.[field.key];
            return val ? String(val) : null;
        }
        return null;
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={`Edit ${section.label}`}
            footer={
                <div className="we-modal-actions">
                    <button type="button" className="we-btn we-btn-secondary" onClick={handleClose}>Cancel</button>
                    <button type="button" className="we-btn we-btn-primary" onClick={handleSave} disabled={saving || (!dirty && !imageUploaded)}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            }
        >
            {section.fields.map((field, idx) => {
                if (field.type === 'image') {
                    return (
                        <ImageUploader
                            key={idx}
                            label={field.label}
                            currentUrl={getImageUrl(field)}
                            maxSizeMb={field.maxSizeMb || 5}
                            onUpload={getUploader(field)}
                        />
                    );
                }

                if (field.type === 'textarea') {
                    return (
                        <div className="we-field" key={idx}>
                            <div className="we-field-header">
                                <label className="we-label">{field.label}</label>
                            </div>
                            <div className="we-field-row">
                                <textarea
                                    className="we-textarea"
                                    rows={field.rows || 4}
                                    value={values[fieldKey(field, idx)] || ''}
                                    onChange={(e) => updateValue(field, idx, e.target.value)}
                                />
                                {field.ai && (
                                    <AiButton
                                        siteId={site.id}
                                        field={field.ai}
                                        currentValue={values[fieldKey(field, idx)] || ''}
                                        onGenerated={(v) => updateValue(field, idx, v)}
                                    />
                                )}
                            </div>
                        </div>
                    );
                }

                // Default: text input
                return (
                    <div className="we-field" key={idx}>
                        <div className="we-field-header">
                            <label className="we-label">{field.label}</label>
                        </div>
                        <div className="we-field-row">
                            <input
                                type="text"
                                className="we-input"
                                value={values[fieldKey(field, idx)] || ''}
                                onChange={(e) => updateValue(field, idx, e.target.value)}
                            />
                            {field.ai && (
                                <AiButton
                                    siteId={site.id}
                                    field={field.ai}
                                    currentValue={values[fieldKey(field, idx)] || ''}
                                    onGenerated={(v) => updateValue(field, idx, v)}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </Modal>
    );
}
