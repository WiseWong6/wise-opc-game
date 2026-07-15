import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    target: 'es2022',
    modulePreload: {
      polyfill: false,
    },
    rollupOptions: {
      input: {
        hub: resolve(import.meta.dirname, 'index.html'),
        minimal: resolve(import.meta.dirname, 'minimal/index.html'),
        paper: resolve(import.meta.dirname, 'paper/index.html'),
        cyber: resolve(import.meta.dirname, 'cyber/index.html'),
      },
    },
  },
})
