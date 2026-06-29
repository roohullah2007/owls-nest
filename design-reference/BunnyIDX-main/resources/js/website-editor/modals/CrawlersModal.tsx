import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { SiteData } from '../types';
import { api } from '../api';

interface Props {
    open: boolean;
    onClose: () => void;
    site: SiteData;
}

export default function CrawlersModal({ open, onClose, site }: Props) {
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [robotsTxt, setRobotsTxt] = useState('');
    const [llmsTxt, setLlmsTxt] = useState('');

    useEffect(() => {
        if (open) {
            setRobotsTxt(site.robots_txt || '');
            setLlmsTxt(site.llms_txt || '');
            setDirty(false);
        }
    }, [open, site]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.updateSite(site.id, {
                robots_txt: robotsTxt,
                llms_txt: llmsTxt,
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
            title="Crawlers"
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
                <label className="we-label">robots.txt</label>
                <p className="we-hint">Controls how search engines crawl your site</p>
                <textarea
                    className="we-textarea we-code-textarea"
                    value={robotsTxt}
                    onChange={(e) => { setRobotsTxt(e.target.value); mark(); }}
                    rows={10}
                    placeholder={"User-agent: *\nAllow: /"}
                />
            </div>
            <div className="we-field">
                <label className="we-label">llms.txt</label>
                <p className="we-hint">Provides context about your site for AI language models</p>
                <textarea
                    className="we-textarea we-code-textarea"
                    value={llmsTxt}
                    onChange={(e) => { setLlmsTxt(e.target.value); mark(); }}
                    rows={10}
                    placeholder={"# Site Name\n\n> Brief description\n\n## Pages\n- /about\n- /buy\n- /sell\n- /contact"}
                />
            </div>
        </Modal>
    );
}
