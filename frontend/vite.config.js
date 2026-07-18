import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// None of the backend services expose CORS; the dev/preview servers proxy /api/* instead.
// Most-specific prefixes first: /api/matches → matching engine, /api/extract → extract agent,
// everything else under /api → gateway.
const strip = (path) => path.replace(/^\/api/, '');
const proxy = {
  '/api/matches': {
    target: process.env.MATCHING_URL || 'http://localhost:3002',
    changeOrigin: true,
    rewrite: strip,
  },
  '/api/extract': {
    target: process.env.EXTRACT_URL || 'http://localhost:3003',
    changeOrigin: true,
    rewrite: strip,
  },
  '/api': {
    target: process.env.GATEWAY_URL || 'http://localhost:3000',
    changeOrigin: true,
    rewrite: strip,
  },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy, allowedHosts: ['dqplus.ddns.net'] },
  preview: { port: 5173, proxy, allowedHosts: ['dqplus.ddns.net'] },
});
