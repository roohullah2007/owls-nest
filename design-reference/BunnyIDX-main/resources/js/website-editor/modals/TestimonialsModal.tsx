import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { SiteData } from '../types';
import { api } from '../api';

interface Testimonial {
    text: string;
    name: string;
    role: string;
}

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
}

function emptyTestimonial(): Testimonial {
    return { text: '', name: '', role: '' };
}

export default function TestimonialsModal({ open, onClose, site }: Props) {
    const [items, setItems] = useState<Testimonial[]>([]);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (open) {
            const existing = site.testimonials && site.testimonials.length > 0
                ? site.testimonials.map(t => ({ text: t.text || '', name: t.name || '', role: t.role || '' }))
                : [];
            setItems(existing);
            setDirty(false);
        }
    }, [open, site]);

    function updateItem(index: number, field: keyof Testimonial, value: string) {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
        setDirty(true);
    }

    function addItem() {
        setItems(prev => [...prev, emptyTestimonial()]);
        setDirty(true);
    }

    function removeItem(index: number) {
        setItems(prev => prev.filter((_, i) => i !== index));
        setDirty(true);
    }

    async function handleSave() {
        setSaving(true);
        try {
            const filtered = items.filter(t => t.text.trim() && t.name.trim());
            await api.updateTestimonials(site.id, filtered);
            window.location.reload();
        } catch {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Edit Testimonials"
            wide
            footer={
                <div className="we-modal-actions">
                    <button type="button" className="we-btn we-btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="we-btn we-btn-primary" onClick={handleSave} disabled={saving || !dirty}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            }
        >
            {items.map((item, idx) => (
                <div key={idx} className="we-testimonial-item">
                    <div className="we-testimonial-header">
                        <span className="we-label">Testimonial {idx + 1}</span>
                        <button
                            type="button"
                            className="we-testimonial-remove"
                            onClick={() => removeItem(idx)}
                            aria-label="Remove testimonial"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18 18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                    <div className="we-field" style={{ marginBottom: 8 }}>
                        <textarea
                            className="we-textarea"
                            rows={3}
                            placeholder="What did the client say?"
                            value={item.text}
                            onChange={(e) => updateItem(idx, 'text', e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div className="we-field" style={{ flex: 1, marginBottom: 0 }}>
                            <input
                                type="text"
                                className="we-input"
                                placeholder="Client name"
                                value={item.name}
                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                            />
                        </div>
                        <div className="we-field" style={{ flex: 1, marginBottom: 0 }}>
                            <input
                                type="text"
                                className="we-input"
                                placeholder="Role (e.g. Home Buyer)"
                                value={item.role}
                                onChange={(e) => updateItem(idx, 'role', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            ))}

            <button type="button" className="we-add-testimonial-btn" onClick={addItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Add Testimonial
            </button>
        </Modal>
    );
}
