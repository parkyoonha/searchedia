import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/shutterstock': {
        target: 'https://api.shutterstock.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/shutterstock/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add authorization header
            const credentials = Buffer.from(`${process.env.VITE_SHUTTERSTOCK_CLIENT_ID}:${process.env.VITE_SHUTTERSTOCK_CLIENT_SECRET}`).toString('base64');
            proxyReq.setHeader('Authorization', `Basic ${credentials}`);
          });
        }
      }
    }
  }
})
