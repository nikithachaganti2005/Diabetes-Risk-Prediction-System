import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Browser calls same origin (5173); Vite forwards to FastAPI (see README: uvicorn on 8000).
      '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/predict': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/metrics': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
