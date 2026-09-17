import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages 처럼 하위 경로에서 서비스할 때는 PAGES_BASE 로 기준 경로를 넘긴다
export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [react()],
})
