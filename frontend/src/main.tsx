import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/common/AppErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </MotionConfig>
  </StrictMode>,
)
