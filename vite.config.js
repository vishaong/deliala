import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/slack-proxy': {
        target: 'https://hooks.slack.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/slack-proxy/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // CORS 헤더 추가
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
            proxyReq.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
            proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          });
        }
      }
    }
  }
})
