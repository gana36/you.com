import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  esbuild: {
    // Remove console.log, console.debug, console.info in production
    // Keep console.error and console.warn for production debugging
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
  }
}))
