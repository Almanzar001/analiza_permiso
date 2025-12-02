import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: [
      'analizapermiso-senpa-pvt6kg-be37d0-157-173-127-78.traefik.me',
      'localhost',
      '127.0.0.1'
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
})