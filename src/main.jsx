import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LifestyleApp from './lifestyle-app-2.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LifestyleApp />
  </StrictMode>,
)
