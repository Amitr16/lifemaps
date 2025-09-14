import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    host: true,
    allowedHosts: ['lifemaps-app-tunnel-fphinuky.devinapps.com', 'lifemaps-app-tunnel-vvboy5r1.devinapps.com', 'lifemaps-app-tunnel-vr5btvgd.devinapps.com']
  },
})
