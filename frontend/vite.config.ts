/// <reference types="vitest/config" />

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

function guestContentOnly() {
  return {
    name: 'guest-content-only',
    apply: 'build' as const,
    async closeBundle() {
      const dataDir = resolve(import.meta.dirname, 'dist/data')
      for (const indexName of ['words-index.json', 'japanese-words-index.json']) {
        const path = resolve(dataDir, indexName)
        const index = JSON.parse(await readFile(path, 'utf8')) as Array<{ day: number }>
        await writeFile(path, `${JSON.stringify(index.filter(({ day }) => day <= 3), null, 2)}\n`)
      }
      const files = await readdir(dataDir)
      await Promise.all(files
        .filter((name) => /^(?:japanese-)?words-day(?:0[4-9]|[1-9][0-9])\.json$/.test(name))
        .map((name) => unlink(resolve(dataDir, name))))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), guestContentOnly()],
  server: {
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    clearMocks: true,
    restoreMocks: true,
  },
})
