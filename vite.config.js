import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/vis': {
        target: 'https://vis.ethz.ch',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vis/, ''),
        secure: false,
      },
      '/api/esn': {
        target: 'https://zurich.esn.ch',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/esn/, ''),
        secure: false,
      },
      '/api/vmp': {
        target: 'https://vmp.ethz.ch',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vmp/, ''),
        secure: false,
      }
    }
  },
  preview: {
    allowedHosts: ['food.omont.ch'],
  },
})
