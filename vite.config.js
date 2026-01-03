import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Important for Electron to load assets correctly
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: 'dist_renderer',
    emptyOutDir: true
  }
})
