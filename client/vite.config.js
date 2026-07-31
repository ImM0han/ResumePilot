import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),

        VitePWA({
            registerType: 'autoUpdate',

            manifest: {
                name: 'ResumePilot AI',
                short_name: 'ResumePilot',
                description: 'AI-powered resume optimization and ATS scoring platform',
                theme_color: '#0b0d17',
                background_color: '#0b0d17',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                icons: [{
                        src: '/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
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