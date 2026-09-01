import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    // Static export: everything resolves relative to the deploy root, no
    // server-side anything. `dist/` drops straight onto Vercel or Netlify.
  },
})
