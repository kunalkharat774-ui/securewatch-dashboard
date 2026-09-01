import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3009,
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        'bags-judgment-handy-short.trycloudflare.com',
        '.trycloudflare.com',
      ],
      // Disable Vite HMR entirely to avoid the browser reload loop from websocket reconnect attempts.
      hmr: false,
      // Disable file watching to stop unnecessary reloads in this environment.
      watch: null,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3009',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
