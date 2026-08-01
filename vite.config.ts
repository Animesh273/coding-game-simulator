import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  /**
   * GitHub Pages serves a project repo from /<repo-name>/, so the production
   * build needs that prefix on every asset URL. Dev keeps '/' so localhost
   * still works unprefixed.
   */
  base: command === 'build' ? '/coding-game-simulator/' : '/',
  server: { port: 5173, open: false },
}))
