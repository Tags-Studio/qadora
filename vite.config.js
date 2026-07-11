import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    terserOptions: {
      compress: {
        evaluate: false
      }
    }
  },
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    allowedHosts: true,
  },
})
