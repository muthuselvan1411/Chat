import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true,
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['simple-peer'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
})
