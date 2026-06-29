import type Echo from 'laravel-echo';
import type Pusher from 'pusher-js';
import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { AxiosInstance } from 'axios';
import { route as ziggyRoute } from 'ziggy-js';
import { PageProps as AppPageProps } from './';

declare global {
    interface Window {
        axios: AxiosInstance;
        Pusher: typeof Pusher;
        Echo: Echo;
        /** Opens the floating power-dialer (registered by CrmLayout). */
        __openDialer?: (number?: string, contactId?: number, contactName?: string) => void;
    }

    /* eslint-disable no-var */
    var route: typeof ziggyRoute;
}

interface ImportMetaEnv {
    VITE_REVERB_APP_KEY: string;
    VITE_REVERB_HOST: string;
    VITE_REVERB_PORT: string;
    VITE_REVERB_SCHEME: string;
}

declare module '@inertiajs/core' {
    interface PageProps extends InertiaPageProps, AppPageProps {}
}
