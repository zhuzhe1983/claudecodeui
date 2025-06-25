import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.VITE_PORT || 3001,
    proxy: {
      '/api': `http://localhost:${process.env.PORT || 3002}`,
      '/ws': {
        target: `ws://localhost:${process.env.PORT || 3002}`,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})