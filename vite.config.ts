import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages는 https://kkchori511.github.io/blockus-web/ 아래에서 열리므로 빌드·미리보기는 하위 경로를 쓴다
  base: command === 'build' || isPreview ? '/blockus-web/' : '/',
  plugins: [
    react(),
    // 태블릿 홈 화면에 추가해 전체 화면·오프라인으로 실행
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '블로커스',
        short_name: '블로커스',
        description: '한 화면에서 2~4명이 함께 하는 블로커스',
        lang: 'ko',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#eef2f7',
        theme_color: '#eef2f7',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
}))
