import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),

        VitePWA({
            registerType: 'autoUpdate',

            includeAssets: [
                'favicon.ico',
                'robots.txt',
                'pwa-192x192.png',
                'pwa-512x512.png',
            ],

            manifest: {
                id: '/',
                name: 'ResumePilot AI',
                short_name: 'ResumePilot',
                description: 'AI-powered resume builder, ATS checker and resume optimization platform',

                start_url: '/',
                scope: '/',

                display: 'standalone',
                orientation: 'portrait',

                theme_color: '#4f46e5',
                background_color: '#0b0d17',

                categories: [
                    'productivity',
                    'business',
                    'education',
                ],

                icons: [{
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },

            workbox: {
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
            },

            devOptions: {
                enabled: true,
            },
        }),
    ],

    server: {
        port: 5173,

        proxy: {
            '/api': {
                target: process.env.VITE_API_PROXY_TARGET ||
                    'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },

    build: {
        outDir: 'dist',
        sourcemap: false,
    },
});