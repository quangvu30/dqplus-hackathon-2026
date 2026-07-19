import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Single-backend proxy: everything under /api goes to backendv2.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

const proxy = {
  '/api': { target: BACKEND_URL, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5174, proxy, allowedHosts: ['dqplus.ddns.net'] },
  preview: { port: 5174, proxy, allowedHosts: ['dqplus.ddns.net'] },
});
