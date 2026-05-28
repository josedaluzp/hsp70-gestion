import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['api/**/*.ts'],
      exclude: ['api/**/*.test.ts', 'api/_lib/__tests__/**'],
      thresholds: { lines: 80 }
    }
  }
})
