import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/main': {
        target: 'http://10.0.0.18:8000', // Your Django backend API URL
        changeOrigin: true, // Ensures correct headers are sent
      },
    },
  },
});
