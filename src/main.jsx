import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { stopDoubleTapZoom } from './ui/notap.js'
import { watchVersion } from './net/version.js'

stopDoubleTapZoom()
watchVersion()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
