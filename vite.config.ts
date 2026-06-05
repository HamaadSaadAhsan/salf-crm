import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';
import inertia from '@inertiajs/vite';

const phpCommand = process.env.PHP_EXECUTABLE || 'php';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        inertia(),
        tailwindcss(),
        wayfinder({
            formVariants: true,
            command: `${phpCommand} artisan wayfinder:generate`,
        }),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) {
                        return;
                    }

                    // Keep a single React instance in one shared chunk.
                    if (/[\\/]node_modules[\\/](react|react-dom|react-is|scheduler)[\\/]/.test(id)) {
                        return 'react-vendor';
                    }

                    // Heavy charting libs — split so they are downloaded once and cached,
                    // instead of being duplicated into every page chunk that imports them.
                    if (id.includes('node_modules/echarts') || id.includes('echarts-for-react') || id.includes('node_modules/zrender')) {
                        return 'echarts';
                    }

                    if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) {
                        return 'recharts';
                    }

                    // PDF tooling — only needed on PDF-related pages.
                    if (id.includes('node_modules/pdf-lib') || id.includes('node_modules/jspdf') || id.includes('node_modules/pdfjs-dist')) {
                        return 'pdf';
                    }

                    if (id.includes('node_modules/lexical') || id.includes('node_modules/@lexical')) {
                        return 'lexical';
                    }
                },
            },
        },
    },
});
