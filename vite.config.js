import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue(),
  ],
  define: {
    'process.env': {
      BACKEND_URL: process.env.BACKEND_URL,
      SITE_URL: process.env.SITE_URL,
      OVINC_URL: process.env.OVINC_URL,
      OVINC_WEB_URL: process.env.OVINC_WEB_URL,
    }
  },
  base: '/',
  publicDir: 'public',
  server: {
    host: process.env.HOST,
    port: 8080,
    https: {
      key: './.certs/key',
      cert: './.certs/pem'
    },
  },
  css: {
    preprocessorOptions:
    {
      scss:
        {
          charset: false,
        },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
});
