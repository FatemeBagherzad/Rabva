import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/main': {
        target: 'http://10.0.0.18:8000',
        changeOrigin: true,
      },
      '/words': {
        target: 'http://10.0.0.18:8000', // same backend
        changeOrigin: true,
      },

      '/translations': {
        target: 'http://10.0.0.18:8000', // same backend
        changeOrigin: true,
      },
    },
  },
});
