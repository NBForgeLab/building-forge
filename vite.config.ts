import { defineConfig } from 'vite'

export default defineConfig({
  // تكوين مشترك للمشروع
  resolve: {
    alias: {
      '@': '/src',
      '@main': '/src/main',
      '@renderer': '/src/renderer',
      '@shared': '/src/shared'
    }
  }
})