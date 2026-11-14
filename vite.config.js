import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.ico'],
      manifest: {
        name: '아이루트 - 안전한 통학 플랫폼',
        short_name: '아이루트',
        description: '자녀의 안전한 학원 통학을 위한 GPS 기반 통합 플랫폼',
        theme_color: '#0A1628',
        background_color: '#F5F7FA',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dapi\.kakao\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'kakao-api-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    rollupOptions: {
      output: {
        // 자주 바뀌지 않는 라이브러리는 따로 묶어서, 앱 코드만 바뀐 배포 뒤에도 브라우저 캐시를 다시 쓴다
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|@remix-run)\//.test(id)) return 'react-vendor'
          if (/node_modules\/(recharts|d3-[^/]+|victory-vendor|recharts-scale|decimal\.js-light)\//.test(id)) return 'charts'
          if (/node_modules\/katex\//.test(id)) return 'katex'
          if (/node_modules\/(firebase|@firebase)\//.test(id)) return 'firebase'
          return undefined
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})