import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { configureEcho } from '@laravel/echo-react';
import type { ComponentType } from 'react';
import ReactDOMServer from 'react-dom/server';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// SSR has no WebSocket — configure null broadcaster so useEcho hooks don't throw
configureEcho({ broadcaster: 'null' });

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: (name) => {
            const pages = import.meta.glob<{ default: ComponentType }>('./pages/**/*.tsx', { eager: true });
            return pages[`./pages/${name}.tsx`];
        },
        setup: ({ App, props }) => {
            return <App {...props} />;
        },
    }),
);
