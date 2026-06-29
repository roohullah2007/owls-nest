import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/app.tsx',
                'resources/js/website-editor/app.tsx',
                'resources/css/agent-website/templates/luxury/main.css',
                // Tailwind bundle for public Landing Page Designs (Video Landing, …).
                'resources/css/landing-pages/app.css',
                // Shared public property-search bundle (map + grid), theme-agnostic.
                'resources/css/agent-website/search/app.css',
                'resources/js/agent-website/property-search/index.tsx',
                // Standalone listing-detail page (same React UI as the card modal).
                'resources/js/agent-website/property-search/detail.tsx',
                // Public IDX squeeze / listing landing pages — React templates.
                'resources/js/landing-pages/idx-squeeze/app.tsx',
                // Public marketing landing pages (classic + video-landing) — React.
                'resources/js/landing-pages/public/app.tsx',
            ],
            refresh: true,
        }),
        react(),
    ],
    optimizeDeps: {
        include: ['leaflet'],
    },
});
