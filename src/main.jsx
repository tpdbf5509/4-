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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? <Suspense fallback={null}><AdminView /></Suspense> : <App />}
  </StrictMode>,
)
