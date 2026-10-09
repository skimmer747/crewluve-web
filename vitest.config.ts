import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    // Fails any attempt to reach a host other than this machine, so tests can never touch the real CrewLu Cloud.
    setupFiles: ['tests/setup/noNetwork.ts'],
  },
})
