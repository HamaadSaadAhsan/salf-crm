import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { configureEcho } from '@laravel/echo-react';
import type { ComponentType } from 'react';
import type { PageProps } from '@/types/global';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import ReactQueryProvider from './providers/react-query-provider';

configureEcho({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
    },
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const pages = import.meta.glob('./pages/**/*.tsx');

void createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: async (name) => {
        const page = pages[`./pages/${name}.tsx`];
        if (!page) throw new Error(`Inertia page not found: ${name}`);
        const module = await page() as { default: ComponentType<PageProps> };
        return module.default;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ReactQueryProvider>
                <App {...props} />
            </ReactQueryProvider>
        );
    },
});

// This will set light / dark mode on load...
initializeTheme();
