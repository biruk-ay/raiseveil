import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { defineConfig, type PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import * as wasm from 'vite-plugin-wasm'

// https://vite.dev/config/
export default defineConfig({
  envDir: '..',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    (wasm.default as unknown as () => PluginOption)(),
    nodePolyfills({ include: ['buffer', 'process', 'util', 'crypto', 'stream'] }),
    viteCommonjs(),
  ],
  build: {
    target: 'esnext',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
