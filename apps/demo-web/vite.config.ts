import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5180,
        fs: { allow: ['../..'] },
    },
    resolve: {
        alias: {
            '@smart-error-tracker/browser': '../../packages/sdk-browser/src/index.ts',
        },
    },
});
