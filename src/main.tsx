import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { RestTimerProvider } from './timer'
import './styles.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RestTimerProvider>
      <App />
    </RestTimerProvider>
  </StrictMode>,
)
