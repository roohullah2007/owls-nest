import { useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';

export interface TestimonialItem {
    text: string;
    rating?: number | null;
    name: string;
    role: string;
    /** Set to 'google' on entries imported from a connected Google Business Profile. */
    source?: string;
    /** Stable id (author+time hash) for google-imported entries; lets re-syncs replace them. */
    google_id?: string;
}

export function useTestimonials(initial: { text: string; name: string; role?: string; rating?: number | null; source?: string; google_id?: string }[] | null) {
    const [items, setItems] = useState<TestimonialItem[]>(
        initial?.map(t => ({ ...t, text: t.text || '', name: t.name || '', role: t.role || '' })) || []
    );
    const [saving, setSaving] = useState(false);

    function update(index: number, field: keyof TestimonialItem, value: string) {
        setItems(prev => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    }

    function add() {
        setItems(prev => [...prev, { text: '', name: '', role: '' }]);
    }

    function remove(index: number) {
        setItems(prev => prev.filter((_, i) => i !== index));
    }

    /** Persist; pass `next` to save a just-computed list without waiting on state. */
    async function save(websiteId: number, next?: TestimonialItem[]) {
        setSaving(true);
        try {
            const filtered = (next ?? items).filter(t => t.text.trim() && t.name.trim());
            await axios.patch(`/api/website-editor/${websiteId}/testimonials`, { testimonials: filtered });
            router.reload({ only: ['websites', 'editing'] });
        } finally {
            setSaving(false);
        }
    }

    return { items, setItems, saving, update, add, remove, save };
}
