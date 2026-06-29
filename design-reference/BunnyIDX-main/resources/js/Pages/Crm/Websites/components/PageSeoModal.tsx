import { useState } from 'react';
import SlideOverModal from '@/Components/Crm/SlideOverModal';
import { FieldLabel, formInputClass } from '@/Components/Crm/FormField';
import { api } from '@/website-editor/api';

interface Props {
    onClose: () => void;
    onSaved: () => void;
    websiteId: number;
    page: string;
    pageLabel: string;
    initialTitle: string;
    initialDescription: string;
}

/** Per-page SEO overrides (meta title + description), stored in page_data[page]. */
export default function PageSeoModal({ onClose, onSaved, websiteId, page, pageLabel, initialTitle, initialDescription }: Props) {
    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        setSaving(true);
        try {
            await api.updatePageData(websiteId, page, {
                meta_title: title.trim() || null,
                meta_description: description.trim() || null,
            });
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
        <SlideOverModal title={`SEO — ${pageLabel}`} onClose={onClose} footer={footer} width={440}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4">
                <p className="text-[12px] text-[#8B9096]">
                    These override the site-wide SEO for this page only. Leave blank to inherit the site defaults.
                </p>
                <div>
                    <FieldLabel help="Shown in the browser tab and search results. ~60 characters.">Meta Title</FieldLabel>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={formInputClass}
                        placeholder="e.g. Buy a Home in Miami | Jane Agent"
                    />
                </div>
                <div>
                    <FieldLabel help="The snippet shown under the title in search results. ~155 characters.">Meta Description</FieldLabel>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={`${formInputClass} resize-none`}
                        rows={4}
                        placeholder="A short summary of this page for search engines."
                    />
                </div>
            </div>
        </SlideOverModal>
    );
}
