import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Repo name on GitHub: MIST-ILM-2026
// Site will be served at https://<user>.github.io/MIST-ILM-2026/
export default defineConfig({
  plugins: [react()],
  base: '/MIST-ILM-2026/',
  server: {
    port: 5173,
    open: true,
  },
});
