import { ApiResponse, MediaItem } from './types';

function getCsrfToken(): string {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content') || '';
    return '';
}

function getXsrfToken(): string {
    const cookie = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
}

async function request<T = ApiResponse>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(options.headers as Record<string, string> || {}),
    };

    // Prefer the meta tag token (sent as X-CSRF-TOKEN), fallback to cookie (sent as X-XSRF-TOKEN)
    const metaToken = getCsrfToken();
    if (metaToken) {
        headers['X-CSRF-TOKEN'] = metaToken;
    } else {
        const xsrfToken = getXsrfToken();
        if (xsrfToken) {
            headers['X-XSRF-TOKEN'] = xsrfToken;
        }
    }

    // Don't set Content-Type for FormData (browser sets multipart boundary)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...options, headers, credentials: 'same-origin' });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw { status: res.status, ...body };
    }

    return res.json();
}

const base = (siteId: number) => `/api/website-editor/${siteId}`;

export const api = {
    getSite: (id: number) => request<ApiResponse>(`${base(id)}`),

    updateSite: (id: number, fields: Record<string, string | number | boolean | null>) =>
        request<ApiResponse>(`${base(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(fields),
        }),

    updatePageData: (id: number, page: string, fields: Record<string, string | null>) =>
        request<ApiResponse>(`${base(id)}/page-data/${page}`, {
            method: 'PATCH',
            body: JSON.stringify(fields),
        }),

    uploadPhoto: (id: number, file: File) => {
        const form = new FormData();
        form.append('photo', file);
        return request<ApiResponse>(`${base(id)}/photo`, { method: 'POST', body: form });
    },

    uploadHero: (id: number, file: File) => {
        const form = new FormData();
        form.append('hero', file);
        return request<ApiResponse>(`${base(id)}/hero`, { method: 'POST', body: form });
    },

    uploadLogo: (id: number, file: File) => {
        const form = new FormData();
        form.append('logo', file);
        return request<ApiResponse>(`${base(id)}/logo`, { method: 'POST', body: form });
    },

    uploadSiteLogo: (id: number, variant: 'light' | 'dark', file: File) => {
        const form = new FormData();
        form.append('site_logo', file);
        form.append('variant', variant);
        return request<ApiResponse & { path?: string }>(`${base(id)}/site-logo`, { method: 'POST', body: form });
    },

    uploadFavicon: (id: number, file: File) => {
        const form = new FormData();
        form.append('favicon', file);
        return request<ApiResponse>(`${base(id)}/favicon`, { method: 'POST', body: form });
    },

    uploadOgImage: (id: number, file: File) => {
        const form = new FormData();
        form.append('og_image', file);
        return request<ApiResponse>(`${base(id)}/og-image`, { method: 'POST', body: form });
    },

    updateTestimonials: (id: number, testimonials: Array<{ text: string; name: string; role: string }>) =>
        request<ApiResponse>(`${base(id)}/testimonials`, {
            method: 'PATCH',
            body: JSON.stringify({ testimonials }),
        }),

    aiGenerate: (id: number, field: string, currentValue: string) =>
        request<ApiResponse>(`${base(id)}/ai/generate-field`, {
            method: 'POST',
            body: JSON.stringify({ field, current_value: currentValue }),
        }),

    // Block CRUD
    addBlock: (id: number, page: string, blockId: string, type: string, position: number, data?: Record<string, string>, slot?: string) =>
        request<ApiResponse>(`${base(id)}/page-data/${page}/blocks`, {
            method: 'POST',
            body: JSON.stringify({ id: blockId, type, position, slot: slot || 'default', data: data || {} }),
        }),

    updateBlock: (id: number, page: string, blockId: string, data: Record<string, string>) =>
        request<ApiResponse>(`${base(id)}/page-data/${page}/blocks/${blockId}`, {
            method: 'PATCH',
            body: JSON.stringify({ data }),
        }),

    deleteBlock: (id: number, page: string, blockId: string) =>
        request<ApiResponse>(`${base(id)}/page-data/${page}/blocks/${blockId}`, {
            method: 'DELETE',
        }),

    reorderBlocks: (id: number, page: string, blockIds: string[], slots?: Record<string, string>) =>
        request<ApiResponse>(`${base(id)}/page-data/${page}/blocks-order`, {
            method: 'PATCH',
            body: JSON.stringify({ block_ids: blockIds, ...(slots ? { slots } : {}) }),
        }),

    updateSectionVisibility: (id: number, page: string, disabledSections: string[]) =>
        request<ApiResponse>(`${base(id)}/section-visibility/${page}`, {
            method: 'PATCH',
            body: JSON.stringify({ disabled_sections: disabledSections }),
        }),

    updateSectionOrder: (id: number, page: string, sectionOrder: string[]) =>
        request<ApiResponse>(`${base(id)}/section-order/${page}`, {
            method: 'PATCH',
            body: JSON.stringify({ section_order: sectionOrder }),
        }),

    updateHeaderConfig: (id: number, header: Record<string, unknown>) =>
        request<ApiResponse>(`${base(id)}/header-config`, {
            method: 'PATCH',
            body: JSON.stringify(header),
        }),

    updateFooterConfig: (id: number, footer: Record<string, unknown>) =>
        request<ApiResponse>(`${base(id)}/footer-config`, {
            method: 'PATCH',
            body: JSON.stringify(footer),
        }),

    // Structured analytics IDs (GA4 / GTM / Meta Pixel) → page_data._config.tracking
    updateTrackingConfig: (id: number, config: { ga4_id?: string | null; gtm_id?: string | null; fb_pixel_id?: string | null }) =>
        request<ApiResponse>(`${base(id)}/tracking-config`, {
            method: 'PATCH',
            body: JSON.stringify(config),
        }),

    // Property-search design settings (fonts, card styles, logo size, custom CSS)
    updateSearchConfig: (id: number, config: Record<string, unknown>) =>
        request<ApiResponse>(`${base(id)}/search-config`, {
            method: 'PATCH',
            body: JSON.stringify(config),
        }),

    aiGenerateSearchCss: (id: number, prompt: string, currentCss: string) =>
        request<ApiResponse & { value?: string }>(`${base(id)}/ai/generate-search-css`, {
            method: 'POST',
            body: JSON.stringify({ prompt, current_css: currentCss }),
        }),

    uploadBlockImage: (id: number, file: File) => {
        const form = new FormData();
        form.append('image', file);
        return request<ApiResponse & { path?: string }>(`${base(id)}/block-image`, { method: 'POST', body: form });
    },

    // ── Media Library ──
    listMedia: (id: number) =>
        request<ApiResponse & { images?: MediaItem[] }>(`${base(id)}/media`),

    uploadMedia: (id: number, file: File) => {
        const form = new FormData();
        form.append('file', file);
        return request<ApiResponse & { path?: string; url?: string; media?: MediaItem }>(`${base(id)}/media`, { method: 'POST', body: form });
    },

    deleteMedia: (id: number, path: string) =>
        request<ApiResponse>(`${base(id)}/media`, { method: 'DELETE', body: JSON.stringify({ path }) }),
};
