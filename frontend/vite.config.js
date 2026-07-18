import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// None of the backend services expose CORS; the dev/preview servers proxy /api/* instead.
// Mirrors the production nginx routing — most-specific prefixes first:
// /api/backend → gateway, /api/agents → extract agent, /api/matches → matching engine
// (the engine's routes keep their /matches prefix), everything else under /api → gateway.
const proxy = {
  '/api/backend': {
    target: process.env.GATEWAY_URL || 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/backend/, ''),
  },
  '/api/agents': {
    target: process.env.EXTRACT_URL || 'http://localhost:3003',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/agents/, ''),
  },
  '/api/matches': {
    target: process.env.MATCHING_URL || 'http://localhost:3002',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
  '/api': {
    target: process.env.GATEWAY_URL || 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy, allowedHosts: ['dqplus.ddns.net'] },
  preview: { port: 5173, proxy, allowedHosts: ['dqplus.ddns.net'] },
});
