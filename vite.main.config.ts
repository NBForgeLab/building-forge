import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  mode: process.env.NODE_ENV || 'development',
  root: resolve(__dirname, 'src/main'),
  build: {
    outDir: resolve(__dirname, 'dist/main'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main/main.ts'),
        preload: resolve(__dirname, 'src/main/preload/preload.ts')
      },
      output: {
        format: 'cjs',
        entryFileNames: '[name].js'
      },
      external: [
        'electron',
        'electron-store',
        'electron-updater',
        'path',
        'fs',
        'fs/promises',
        'os'
      ]
    },
    minify: process.env.NODE_ENV === 'production',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared')
    }
  }
})