import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom for React component testing
    setupFiles: [
      './src/shared/test-setup.ts',
      './tests/setup/export-test-setup.ts'
    ],
    testTimeout: 30000, // Extended timeout for export tests
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'release/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
        'src/shared/test-setup.ts'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    // Configuration for property-based tests
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@tests': resolve(__dirname, 'tests')
    }
  },
  define: {
    // Define variables for testing
    __TEST__: true,
    __DEV__: true
  }
})