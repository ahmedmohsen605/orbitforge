import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // relative base → works on any host (Netlify/Vercel root, GitHub Pages subpath)
  base: './',
  plugins: [react()],
})
