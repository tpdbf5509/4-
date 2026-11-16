import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { stopDoubleTapZoom } from './ui/notap.js'
import { watchVersion } from './net/version.js'

stopDoubleTapZoom()
watchVersion()

// 관리 화면(?admin) — 게임과 따로 불러온다
const AdminView = lazy(() => import('./AdminView.jsx'))
const isAdmin = new URLSearchParams(location.search).has('admin')
// 격자 연습장(?sandbox) — 캐릭터를 게임에 넣기 전에 이 기기에서만 써 본다(Sandbox.jsx)
const Sandbox = lazy(() => import('./Sandbox.jsx'))
const isSandbox = new URLSearchParams(location.search).has('sandbox')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <Suspense fallback={null}><AdminView /></Suspense>
      : isSandbox ? <Suspense fallback={null}><Sandbox /></Suspense> : <App />}
  </StrictMode>,
)
