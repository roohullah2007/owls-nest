import { useEffect, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { AgentWebsite, WebsiteFormData } from '../types';

export function useWebsiteForm(website: AgentWebsite) {
    const [lastSaved, setLastSaved] = useState<string>(website.updated_at);

    const form = useForm<WebsiteFormData>({
        agent_name: website.agent_name,
        agent_title: website.agent_title || '',
        agent_tagline: website.agent_tagline || '',
        agent_bio: website.agent_bio || '',
        agent_email: website.agent_email || '',
        agent_phone: website.agent_phone || '',
        agent_whatsapp: website.agent_whatsapp || '',
        office_address: website.office_address || '',
        contact_display: website.contact_display || { email: true, phone: true, whatsapp: false, address: false },
        agent_city: website.agent_city || '',
        agent_state: website.agent_state || '',
        agent_license_number: website.agent_license_number || '',
        brokerage_name: website.brokerage_name || '',
        template: website.template,
        accent_color: website.accent_color || '',
        custom_colors: website.custom_colors || {},
        social_facebook: website.social_facebook || '',
        social_instagram: website.social_instagram || '',
        social_linkedin: website.social_linkedin || '',
        social_youtube: website.social_youtube || '',
        social_tiktok: website.social_tiktok || '',
        meta_title: website.meta_title || '',
        meta_description: website.meta_description || '',
        is_published: website.is_published,
    });

    const initialFormData = useRef({ ...form.data });

    useEffect(() => {
        if (form.recentlySuccessful) {
            setLastSaved(new Date().toISOString());
            initialFormData.current = { ...form.data };
        }
    }, [form.recentlySuccessful]);

    const isDirty = JSON.stringify(form.data) !== JSON.stringify(initialFormData.current);

    function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        form.patch(route('crm.websites.update', website.id), {
            preserveScroll: true,
            onSuccess: () => {
                initialFormData.current = { ...form.data };
            },
        });
    }

    function formatLastSaved(dateStr: string): string {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diff < 60) return 'Saved just now';
        if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `Saved ${Math.floor(diff / 3600)}h ago`;
        return `Saved ${date.toLocaleDateString()}`;
    }

    return {
        form,
        lastSaved,
        isDirty,
        handleSubmit,
        formatLastSaved,
    };
}
