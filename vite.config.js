import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_BACKEND_URL;
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // Listen on all network interfaces
      port: 3004, // Change to your preferred port
      proxy: {
        '/main': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/words': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/translations': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/grammar': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
