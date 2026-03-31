import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // html2pdf.js (jspdf + html2canvas) is ~1 MB minified; expected for PDF generation.
    chunkSizeWarningLimit: 1100
  },
  server: {
    port: 5173,
    // When VITE_API_BASE is `/api`, the browser calls same-origin `/api` and `/uploads`; forward to Express.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
});

