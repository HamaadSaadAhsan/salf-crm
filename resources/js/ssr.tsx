import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { configureEcho } from '@laravel/echo-react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// SSR has no WebSocket — configure null broadcaster so useEcho hooks don't throw
configureEcho({ broadcaster: 'null' });

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
        setup: ({ App, props }) => {
            return <App {...props} />;
        },
    }),
);
