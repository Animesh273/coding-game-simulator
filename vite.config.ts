import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /**
   * Vercel serves the site from the domain root, so assets must be referenced
   * from '/'. (A sub-path base such as '/repo-name/' is only needed by hosts
   * that serve a project under a folder — GitHub Pages does, Vercel does not.
   * Setting one here makes every asset 404 and the page render blank.)
   */
  base: '/',
  server: { port: 5173, open: false },
})
