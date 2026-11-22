import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local-first: binds to localhost only. Use `npm run dev -- --host` to expose on your LAN explicitly.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, host: 'localhost' },
  preview: { port: 4173, host: 'localhost' },
  test: { environment: 'node', include: ['tests/unit/**/*.test.ts'] },
} as any);
