import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ImageUploader from '../components/ImageUploader';
import { SiteData, BlockData } from '../types';
import { BLOCK_DEFINITIONS } from '../block-definitions';
import { api } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
    block: BlockData | null;
    currentPage: string;
}

export default function BlockModal({ open, onClose, site, block, currentPage }: Props) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [imageUploaded, setImageUploaded] = useState(false);

    const definition = block ? BLOCK_DEFINITIONS.find(d => d.type === block.type) : null;

    useEffect(() => {
        if (open && block && definition) {
            const initial: Record<string, string> = {};
            definition.fields.forEach(field => {
                if (field.type === 'image') return;
                initial[field.key] = block.data[field.key] || '';
            });
            setValues(initial);
            setDirty(false);
            setImageUploaded(false);
        }
    }, [open, block?.id]);

    if (!block || !definition) return null;

    function updateValue(key: string, value: string) {
        setValues(prev => ({ ...prev, [key]: value }));
        setDirty(true);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const data = { ...block!.data, ...values };
            await api.updateBlock(site.id, currentPage, block!.id, data);
            window.location.reload();
        } catch {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm('Delete this block?')) return;
        setDeleting(true);
        try {
            await api.deleteBlock(site.id, currentPage, block!.id);
            window.location.reload();
        } catch {
            setDeleting(false);
        }
    }

    function handleClose() {
        if (imageUploaded) {
            window.location.reload();
            return;
        }
        onClose();
    }

    async function handleImageUpload(fieldKey: string, file: File) {
        const result = await api.uploadBlockImage(site.id, file);
        if (result.path) {
            // Update the block data with the image path immediately
            const data = { ...block!.data, ...values, [fieldKey]: result.path };
            await api.updateBlock(site.id, currentPage, block!.id, data);
            setImageUploaded(true);
        }
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={`Edit ${definition.label}`}
            footer={
                <div className="we-modal-actions" style={{ justifyContent: 'space-between' }}>
                    <button
                        type="button"
                        className="we-btn"
                        style={{ background: 'transparent', color: '#ef4444', fontSize: 12 }}
                        onClick={handleDelete}
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete Block'}
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="we-btn we-btn-secondary" onClick={handleClose}>Cancel</button>
                        <button type="button" className="we-btn we-btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            }
        >
            {definition.fields.map((field) => {
                if (field.type === 'image') {
                    return (
                        <ImageUploader
                            key={field.key}
                            label={field.label}
                            currentUrl={block.data[field.key] || null}
                            maxSizeMb={field.maxSizeMb || 5}
                            onUpload={(file) => handleImageUpload(field.key, file)}
                        />
                    );
                }

                if (field.type === 'textarea' || field.type === 'code') {
                    return (
                        <div className="we-field" key={field.key}>
                            <div className="we-field-header">
                                <label className="we-label">{field.label}</label>
                            </div>
                            <textarea
                                className={`we-textarea${field.type === 'code' ? ' we-code-textarea' : ''}`}
                                rows={field.rows || 4}
                                value={values[field.key] || ''}
                                onChange={(e) => updateValue(field.key, e.target.value)}
                            />
                        </div>
                    );
                }

                return (
                    <div className="we-field" key={field.key}>
                        <div className="we-field-header">
                            <label className="we-label">{field.label}</label>
                        </div>
                        <input
                            type="text"
                            className="we-input"
                            value={values[field.key] || ''}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                        />
                    </div>
                );
            })}
        </Modal>
    );
}
