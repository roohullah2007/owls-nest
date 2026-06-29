import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { SiteData } from '../types';
import { api } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
}

export default function TrackingModal({ open, onClose, site }: Props) {
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [trackingHead, setTrackingHead] = useState('');
    const [trackingBody, setTrackingBody] = useState('');

    useEffect(() => {
        if (open) {
            setTrackingHead(site.tracking_head || '');
            setTrackingBody(site.tracking_body || '');
            setDirty(false);
        }
    }, [open, site]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateSite(site.id, {
                tracking_head: trackingHead,
                tracking_body: trackingBody,
            });
            window.location.reload();
        } catch {
            setSaving(false);
        }
    };

    const mark = () => setDirty(true);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Tracking Scripts"
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
            <div className="we-field">
                <label className="we-label">Head Scripts (before &lt;/head&gt;)</label>
                <textarea
                    className="we-textarea we-code-textarea"
                    value={trackingHead}
                    onChange={(e) => { setTrackingHead(e.target.value); mark(); }}
                    rows={8}
                    placeholder="<!-- Google Analytics, Meta Pixel, etc. -->"
                />
            </div>
            <div className="we-field">
                <label className="we-label">Body Scripts (before &lt;/body&gt;)</label>
                <textarea
                    className="we-textarea we-code-textarea"
                    value={trackingBody}
                    onChange={(e) => { setTrackingBody(e.target.value); mark(); }}
                    rows={8}
                    placeholder="<!-- Chat widgets, additional scripts -->"
                />
                <p className="we-hint">Paste Google Analytics, Facebook Pixel, or other tracking codes</p>
            </div>
        </Modal>
    );
}
