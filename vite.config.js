import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Warn when a chunk grows beyond ~600KB (three.js chunks will exceed it — expected)
    chunkSizeWarningLimit: 600,
  },
})
