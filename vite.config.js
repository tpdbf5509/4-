import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 배포마다 다른 빌드 번호 — 화면 코드에 __BUILD__ 로 넣고, dist/version.json 에도 남긴다.
// 열려 있던 옛 화면은 version.json 을 가끔 읽어 새 빌드를 알아채고 스스로 새로 고침한다(src/net/version.js).
const BUILD = String(Date.now())

const buildVersion = {
  name: 'build-version',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) })
  },
}

// GitHub Pages 처럼 하위 경로에서 서비스할 때는 PAGES_BASE 로 기준 경로를 넘긴다
export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [react(), buildVersion],
  define: { __BUILD__: JSON.stringify(BUILD) },
})
